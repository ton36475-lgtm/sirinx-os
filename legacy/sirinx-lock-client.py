#!/usr/bin/env python3
"""Bounded client for the future SIRINX Durable Object lock service."""

from __future__ import annotations

import argparse
from contextlib import AbstractContextManager
import json
import os
import re
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request


_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")
_ACTIONS = frozenset({"acquire", "release", "status"})


class LockClientError(RuntimeError):
    """Raised when a bounded lock operation cannot be completed."""


def validate_url(value: str) -> str:
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("worker_url must be an HTTPS URL without embedded credentials")
    return value.rstrip("/")


def validate_id(value: str, field: str) -> str:
    if not _SAFE_ID.fullmatch(value):
        raise ValueError(f"invalid {field}")
    return value


class SirinxDistributedLock(AbstractContextManager["SirinxDistributedLock"]):
    """Lock client with network execution disabled unless explicitly selected."""

    def __init__(
        self,
        worker_url: str,
        project_id: str,
        client_id: str,
        *,
        ttl_ms: int = 30_000,
        retry_interval: float = 2.0,
        max_attempts: int = 10,
        execute_network: bool = False,
        auth_token: str | None = None,
    ) -> None:
        self.worker_url = validate_url(worker_url)
        self.project_id = validate_id(project_id, "project_id")
        self.client_id = validate_id(client_id, "client_id")
        if not 1_000 <= ttl_ms <= 300_000:
            raise ValueError("ttl_ms is outside the supported range")
        if retry_interval <= 0 or max_attempts < 1:
            raise ValueError("retry settings must be positive")
        self.ttl_ms = ttl_ms
        self.retry_interval = retry_interval
        self.max_attempts = max_attempts
        self.execute_network = execute_network
        self.auth_token = auth_token
        self.is_acquired = False

    def preview(self, action: str) -> dict[str, Any]:
        if action not in _ACTIONS:
            raise ValueError("unsupported action")
        return {
            "schema": "sirinx.lock-client.preview.v1",
            "status": "DRY_RUN",
            "action": action,
            "project_id": self.project_id,
            "client_id": self.client_id,
            "ttl_ms": self.ttl_ms if action == "acquire" else None,
            "network_allowed": False,
        }

    def _send_request(self, action: str) -> tuple[int, dict[str, Any]]:
        if not self.execute_network:
            raise LockClientError("network execution is disabled")
        if not self.auth_token:
            raise LockClientError("SIRINX_LOCK_AUTH_TOKEN is not configured")
        if action not in _ACTIONS:
            raise LockClientError("unsupported action")

        method = "GET" if action == "status" else "POST"
        data = None
        if method == "POST":
            payload: dict[str, Any] = {"client_id": self.client_id}
            if action == "acquire":
                payload["ttl_ms"] = self.ttl_ms
            data = json.dumps(payload).encode("utf-8")

        url = f"{self.worker_url}/locks/{self.project_id}/{action}"
        request = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json",
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            try:
                payload = json.loads(error.read().decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                payload = {"status": "ERROR", "message": "Lock service rejected request."}
            return error.code, payload
        except (urllib.error.URLError, TimeoutError) as error:
            raise LockClientError("lock service is unavailable") from error

    def acquire(self, blocking: bool = True) -> bool:
        for attempt in range(self.max_attempts):
            status, response = self._send_request("acquire")
            if status == 200 and response.get("status") == "LOCKED":
                self.is_acquired = True
                return True
            if not blocking or response.get("status") != "DENIED":
                return False
            if attempt + 1 < self.max_attempts:
                time.sleep(self.retry_interval)
        return False

    def release(self) -> bool:
        status, response = self._send_request("release")
        released = status == 200 and response.get("status") in {"RELEASED", "AVAILABLE"}
        if released:
            self.is_acquired = False
        return released

    def status(self) -> dict[str, Any]:
        _, response = self._send_request("status")
        return response

    def __enter__(self) -> "SirinxDistributedLock":
        if not self.acquire(blocking=True):
            raise LockClientError("lock acquisition failed")
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> bool:
        if self.is_acquired:
            self.release()
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="SIRINX bounded lock client")
    parser.add_argument("--worker-url", required=True)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--action", choices=sorted(_ACTIONS), required=True)
    parser.add_argument("--ttl-ms", type=int, default=30_000)
    parser.add_argument("--execute-network", action="store_true")
    args = parser.parse_args()

    client = SirinxDistributedLock(
        args.worker_url,
        args.project_id,
        args.client_id,
        ttl_ms=args.ttl_ms,
        execute_network=args.execute_network,
        auth_token=os.environ.get("SIRINX_LOCK_AUTH_TOKEN"),
    )
    if not args.execute_network:
        print(json.dumps(client.preview(args.action), indent=2, sort_keys=True))
        return 0

    if args.action == "acquire":
        result: object = {"acquired": client.acquire()}
    elif args.action == "release":
        result = {"released": client.release()}
    else:
        result = client.status()
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

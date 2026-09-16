"""Bounded layered Redis checkpoint store for Phase 5C preparation.

The module is dependency-light and supports an injected Redis-compatible
client for offline tests. It does not claim BaseCheckpointSaver compatibility.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import re
from typing import Any, Mapping, MutableMapping


try:
    import redis
except ImportError:  # pragma: no cover - exercised by dependency-free hosts
    redis = None


RunnableConfig = dict[str, Any]
_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$")


class CheckpointStoreError(RuntimeError):
    """Raised when checkpoint data or storage is invalid."""


@dataclass(frozen=True)
class Checkpoint:
    v: int
    id: str
    ts: str
    channel_values: Mapping[str, Any]
    channel_versions: Mapping[str, Any]
    versions_seen: Mapping[str, Any] = field(default_factory=dict)
    parent_config: RunnableConfig | None = None


class CheckpointMetadata(dict[str, Any]):
    """Metadata wrapper retained for the future LangGraph adapter."""


@dataclass(frozen=True)
class CheckpointTuple:
    config: RunnableConfig
    checkpoint: Checkpoint
    metadata: CheckpointMetadata
    parent_config: RunnableConfig | None


def _validate_identifier(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not _SAFE_ID.fullmatch(value):
        raise CheckpointStoreError(f"invalid {field_name}")
    return value


def _config_ids(config: Mapping[str, Any]) -> tuple[str, str | None]:
    configurable = config.get("configurable")
    if not isinstance(configurable, Mapping):
        raise CheckpointStoreError("missing configurable checkpoint context")
    thread_id = _validate_identifier(configurable.get("thread_id"), "thread_id")
    raw_checkpoint_id = configurable.get("checkpoint_id")
    checkpoint_id = (
        _validate_identifier(raw_checkpoint_id, "checkpoint_id")
        if raw_checkpoint_id is not None
        else None
    )
    return thread_id, checkpoint_id


def _safe_config(thread_id: str, checkpoint_id: str) -> RunnableConfig:
    return {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_id": checkpoint_id,
        }
    }


class LayeredRedisCheckpointer:
    """Store stable, history, runtime, and metadata layers with bounded keys."""

    def __init__(
        self,
        redis_url: str | None = None,
        *,
        client: Any | None = None,
        ttl_seconds: int = 86_400,
    ) -> None:
        if not 60 <= ttl_seconds <= 2_592_000:
            raise ValueError("ttl_seconds is outside the supported range")
        if client is not None:
            self.db = client
        else:
            if redis is None:
                raise ImportError("redis package is required when no client is injected")
            if not redis_url:
                raise ValueError("redis_url is required")
            self.db = redis.from_url(redis_url, decode_responses=True)
        self.ttl_seconds = ttl_seconds

    def _get_keys(self, thread_id: str, checkpoint_id: str) -> dict[str, str]:
        prefix = f"sirinx:graph:{thread_id}"
        return {
            "layer2_domain": f"{prefix}:layer2_domain",
            "layer3_history": f"{prefix}:layer3_history",
            "layer4_runtime": f"{prefix}:chk:{checkpoint_id}:layer4",
            "meta": f"{prefix}:chk:{checkpoint_id}:metadata",
            "latest": f"{prefix}:latest_id",
        }

    @staticmethod
    def _decode_json(raw: Any, field_name: str, default: Any) -> Any:
        if raw is None:
            return default
        if not isinstance(raw, (str, bytes, bytearray)):
            raise CheckpointStoreError(f"invalid {field_name} encoding")
        try:
            return json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CheckpointStoreError(f"corrupt {field_name}") from exc

    def get_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        thread_id, checkpoint_id = _config_ids(config)
        if checkpoint_id is None:
            latest = self.db.get(f"sirinx:graph:{thread_id}:latest_id")
            if latest is None:
                return None
            checkpoint_id = _validate_identifier(latest, "checkpoint_id")

        keys = self._get_keys(thread_id, checkpoint_id)
        layer2_data = self._decode_json(
            self.db.get(keys["layer2_domain"]), "layer2_domain", {}
        )
        layer3_data = self._decode_json(
            self.db.get(keys["layer3_history"]), "layer3_history", []
        )
        runtime_raw = self.db.get(keys["layer4_runtime"])
        if runtime_raw is None:
            return None
        runtime = self._decode_json(runtime_raw, "layer4_runtime", None)
        metadata = self._decode_json(self.db.get(keys["meta"]), "metadata", {})
        if not isinstance(runtime, Mapping):
            raise CheckpointStoreError("invalid layer4_runtime object")
        if not isinstance(metadata, Mapping):
            raise CheckpointStoreError("invalid metadata object")

        version = runtime.get("v")
        timestamp = runtime.get("ts")
        if not isinstance(version, int) or isinstance(version, bool):
            raise CheckpointStoreError("invalid checkpoint version")
        if not isinstance(timestamp, str) or not timestamp:
            raise CheckpointStoreError("invalid checkpoint timestamp")

        raw_channels = runtime.get("channel_values", {})
        if not isinstance(raw_channels, Mapping):
            raise CheckpointStoreError("invalid runtime channel values")
        raw_channel_versions = runtime.get("channel_versions", {})
        raw_versions_seen = runtime.get("versions_seen", {})
        if not isinstance(raw_channel_versions, Mapping):
            raise CheckpointStoreError("invalid channel_versions object")
        if not isinstance(raw_versions_seen, Mapping):
            raise CheckpointStoreError("invalid versions_seen object")
        parent_config = runtime.get("parent_config")
        if parent_config is not None and not isinstance(parent_config, Mapping):
            raise CheckpointStoreError("invalid parent_config object")
        channel_values: dict[str, Any] = dict(raw_channels)
        channel_values["project_blueprint"] = layer2_data
        channel_values["messages"] = layer3_data

        checkpoint = Checkpoint(
            v=version,
            id=checkpoint_id,
            ts=timestamp,
            channel_values=channel_values,
            channel_versions=dict(raw_channel_versions),
            versions_seen=dict(raw_versions_seen),
            parent_config=dict(parent_config) if parent_config is not None else None,
        )
        return CheckpointTuple(
            config=_safe_config(thread_id, checkpoint_id),
            checkpoint=checkpoint,
            metadata=CheckpointMetadata(metadata),
            parent_config=dict(parent_config) if parent_config is not None else None,
        )

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: Mapping[str, Any],
        new_versions: Mapping[str, Any] | None = None,
    ) -> RunnableConfig:
        del new_versions
        thread_id, _ = _config_ids(config)
        checkpoint_id = _validate_identifier(checkpoint.id, "checkpoint_id")
        current_config = _safe_config(thread_id, checkpoint_id)
        keys = self._get_keys(thread_id, checkpoint_id)

        channels: MutableMapping[str, Any] = dict(checkpoint.channel_values)
        project_blueprint = channels.pop("project_blueprint", {})
        messages_history = channels.pop("messages", [])
        parent_config = None
        if checkpoint.parent_config:
            parent_thread, parent_checkpoint = _config_ids(checkpoint.parent_config)
            if parent_checkpoint:
                parent_config = _safe_config(parent_thread, parent_checkpoint)

        runtime_payload = {
            "v": checkpoint.v,
            "ts": checkpoint.ts,
            "channel_values": channels,
            "channel_versions": dict(checkpoint.channel_versions),
            "versions_seen": dict(checkpoint.versions_seen),
            "parent_config": parent_config,
        }
        records = {
            keys["layer2_domain"]: json.dumps(project_blueprint, sort_keys=True),
            keys["layer3_history"]: json.dumps(messages_history),
            keys["layer4_runtime"]: json.dumps(runtime_payload, sort_keys=True),
            keys["meta"]: json.dumps(dict(metadata), sort_keys=True),
            keys["latest"]: checkpoint_id,
        }

        pipeline = self.db.pipeline(transaction=True)
        for key, value in records.items():
            pipeline.set(key, value, ex=self.ttl_seconds)
        pipeline.execute()
        return current_config


def get_redis_checkpointer(
    redis_url: str | None = None,
    *,
    client: Any | None = None,
) -> LayeredRedisCheckpointer | None:
    """Return a checkpointer only when a client or Redis dependency is available."""

    if client is None and redis is None:
        return None
    return LayeredRedisCheckpointer(redis_url, client=client)

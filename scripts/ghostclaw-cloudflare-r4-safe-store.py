#!/usr/bin/env python3
"""Store one local approval grant through directory file descriptors.

The helper never follows symbolic links while walking the repository and grant
directory trees. Each opened directory descriptor pins the checked inode, so a
concurrent pathname replacement cannot redirect the final write.
"""

from __future__ import annotations

import argparse
import errno
import json
import os
from pathlib import PurePath
import stat
import sys
import time


DIRECTORY_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
FILE_FLAGS = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
MAX_GRANT_BYTES = 1024 * 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--relative-root", required=True)
    parser.add_argument("--filename", required=True)
    return parser.parse_args()


def validate_relative_root(value: str) -> list[str]:
    if os.path.isabs(value):
        raise ValueError("invalid relative root")
    components = list(PurePath(value).parts)
    if not components or any(component in ("", ".", "..") for component in components):
        raise ValueError("invalid relative root")
    return components


def validate_filename(value: str) -> None:
    if (
        not value.endswith(".json")
        or value != os.path.basename(value)
        or value in (".", "..")
        or len(value.encode("utf-8")) > 255
    ):
        raise ValueError("invalid grant filename")


def open_absolute_directory(pathname: str) -> int:
    canonical = os.path.realpath(pathname)
    expected = os.stat(canonical, follow_symlinks=False)
    if not stat.S_ISDIR(expected.st_mode):
        raise NotADirectoryError(canonical)

    current_fd = os.open(os.path.sep, DIRECTORY_FLAGS)
    try:
        for component in PurePath(canonical).parts[1:]:
            next_fd = os.open(component, DIRECTORY_FLAGS, dir_fd=current_fd)
            os.close(current_fd)
            current_fd = next_fd
        observed = os.fstat(current_fd)
        if (observed.st_dev, observed.st_ino) != (expected.st_dev, expected.st_ino):
            raise RuntimeError("repository root changed during validation")
        return current_fd
    except Exception:
        os.close(current_fd)
        raise


def maybe_pause_for_race_test(component: str) -> None:
    if os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_MODE") != "1":
        return
    if os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_PAUSE_AFTER_COMPONENT") != component:
        return
    ready_path = os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_READY_PATH")
    continue_path = os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_CONTINUE_PATH")
    if not ready_path or not continue_path:
        raise RuntimeError("incomplete test coordination")
    with open(ready_path, "x", encoding="utf-8") as handle:
        handle.write("ready\n")
    deadline = time.monotonic() + 5
    while not os.path.exists(continue_path):
        if time.monotonic() >= deadline:
            raise TimeoutError("test coordination timed out")
        time.sleep(0.01)


def maybe_fail_for_test(point: str) -> None:
    if os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_MODE") != "1":
        return
    if os.environ.get("GHOSTCLAW_SAFE_STORE_TEST_FAIL_AT") == point:
        raise OSError(f"safe-store injected failure at {point}")


def open_or_create_directory(parent_fd: int, component: str) -> int:
    try:
        return os.open(component, DIRECTORY_FLAGS, dir_fd=parent_fd)
    except FileNotFoundError:
        try:
            os.mkdir(component, mode=0o700, dir_fd=parent_fd)
        except FileExistsError:
            pass
        return os.open(component, DIRECTORY_FLAGS, dir_fd=parent_fd)


def write_all(file_fd: int, contents: bytes) -> None:
    view = memoryview(contents)
    offset = 0
    while offset < len(view):
        written = os.write(file_fd, view[offset:])
        if written <= 0:
            raise OSError("grant write did not progress")
        offset += written


def store_grant(repo_root: str, relative_root: str, filename: str, contents: bytes) -> None:
    components = validate_relative_root(relative_root)
    validate_filename(filename)
    if not contents or len(contents) > MAX_GRANT_BYTES:
        raise ValueError("invalid grant size")

    directory_fd = open_absolute_directory(repo_root)
    try:
        for component in components:
            next_fd = open_or_create_directory(directory_fd, component)
            os.close(directory_fd)
            directory_fd = next_fd
            maybe_pause_for_race_test(component)

        created = False
        try:
            file_fd = os.open(filename, FILE_FLAGS, 0o600, dir_fd=directory_fd)
            created = True
            try:
                os.fchmod(file_fd, 0o600)
                maybe_fail_for_test("after_create")
                write_all(file_fd, contents)
                os.fsync(file_fd)
            finally:
                os.close(file_fd)
            os.fsync(directory_fd)
        except Exception:
            cleanup_error = None
            if created:
                try:
                    os.unlink(filename, dir_fd=directory_fd)
                    os.fsync(directory_fd)
                except FileNotFoundError:
                    pass
                except Exception as error:
                    cleanup_error = error
            if cleanup_error is not None:
                raise RuntimeError("safe-store cleanup failed") from cleanup_error
            raise
    finally:
        os.close(directory_fd)


def emit_error(code: str, exit_code: int) -> int:
    sys.stderr.write(json.dumps({"status": "blocked", "code": code}) + "\n")
    return exit_code


def main() -> int:
    try:
        args = parse_args()
        contents = sys.stdin.buffer.read(MAX_GRANT_BYTES + 1)
        store_grant(args.repo_root, args.relative_root, args.filename, contents)
        sys.stdout.write(json.dumps({"status": "stored"}) + "\n")
        return 0
    except FileExistsError:
        return emit_error("EEXIST", errno.EEXIST)
    except Exception:
        return emit_error("SAFE_STORE_FAILED", 1)


if __name__ == "__main__":
    raise SystemExit(main())

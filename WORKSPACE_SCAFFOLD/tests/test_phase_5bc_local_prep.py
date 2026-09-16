import importlib.util
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
SERVICE_DIR = ROOT / "services" / "orchestrator"
LEGACY_DIR = ROOT / "legacy"
sys.path.insert(0, str(SERVICE_DIR))

from local_bridge_policy import (  # noqa: E402
    BridgePolicyError,
    build_dispatch_preview,
    verify_bridge_token,
)


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


lock_client = load_module("sirinx_lock_client", LEGACY_DIR / "sirinx-lock-client.py")
tmux_preview = load_module(
    "tmux_worker_lock_manager", ROOT / ".scripts/tmux-worker-lock-manager.py"
)
checkpoint_store = load_module(
    "layered_redis_checkpointer",
    LEGACY_DIR / "LayeredRedisCheckpointer.py",
)


class FakePipeline:
    def __init__(self, values):
        self.values = values
        self.pending = []

    def set(self, key, value, ex=None):
        self.pending.append((key, value, ex))
        return self

    def execute(self):
        for key, value, _ in self.pending:
            self.values[key] = value
        return [True] * len(self.pending)


class FakeRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def pipeline(self, transaction=True):
        self.transaction = transaction
        return FakePipeline(self.values)


class Phase5BCLocalPrepTests(unittest.TestCase):
    def test_bridge_preview_has_no_execution_path(self):
        preview = build_dispatch_preview(
            action="inspect",
            assigned_target="codex-worker",
            correlation_id="phase5c-001",
            ttl_ms=30_000,
            context_snapshot="safe context",
        )
        self.assertEqual(preview["status"], "DRY_RUN")
        self.assertFalse(preview["execution"]["allowed"])
        self.assertFalse(preview["context"]["persisted"])
        self.assertEqual(len(preview["context"]["sha256"]), 64)

    def test_bridge_rejects_shell_text_and_missing_token(self):
        with self.assertRaises(BridgePolicyError):
            build_dispatch_preview(
                action="echo unsafe",
                assigned_target="codex-worker",
                correlation_id="phase5c-002",
                ttl_ms=30_000,
            )
        self.assertFalse(verify_bridge_token("value", None))
        self.assertTrue(verify_bridge_token("value", "value"))

    def test_daemon_and_wrapper_contain_no_live_dispatch_primitive(self):
        daemon = (LEGACY_DIR / "local_bridge_daemon.py").read_text()
        wrapper = (SERVICE_DIR / "sirinx-bridge-wrapper.sh.template").read_text()
        self.assertNotIn("subprocess", daemon)
        self.assertNotIn("SUPER_SECURE", daemon)
        self.assertNotIn("tmux send-keys", wrapper)
        self.assertNotIn("curl ", wrapper)
        self.assertNotIn("TELEGRAM_BOT", wrapper)

    def test_lock_clients_default_to_dry_run(self):
        client = lock_client.SirinxDistributedLock(
            "https://locks.example.test",
            "ghostclaw-p101",
            "mac-mini",
        )
        self.assertEqual(client.preview("acquire")["status"], "DRY_RUN")
        with self.assertRaises(lock_client.LockClientError):
            client._send_request("status")

        preview = tmux_preview.build_preview("codex-worker", "rust-check", 45_000)
        self.assertFalse(preview["network_allowed"])
        self.assertFalse(preview["tmux_allowed"])

    def test_checkpoint_put_does_not_mutate_input(self):
        redis_client = FakeRedis()
        store = checkpoint_store.LayeredRedisCheckpointer(client=redis_client)
        channels = {
            "project_blueprint": {"name": "sirinx"},
            "messages": [{"role": "user", "content": "hello"}],
            "phase": "preview",
        }
        checkpoint = checkpoint_store.Checkpoint(
            v=1,
            id="checkpoint-001",
            ts="2026-07-14T00:00:00Z",
            channel_values=channels,
            channel_versions={"phase": 1},
        )
        original = json.loads(json.dumps(channels))
        config = {"configurable": {"thread_id": "thread-001"}}

        store.put(config, checkpoint, {"source": "test"})
        self.assertEqual(channels, original)
        restored = store.get_tuple(config)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.checkpoint.channel_values["phase"], "preview")
        self.assertEqual(
            restored.checkpoint.channel_values["project_blueprint"],
            {"name": "sirinx"},
        )

    def test_checkpoint_rejects_unsafe_keys_and_corrupt_json(self):
        store = checkpoint_store.LayeredRedisCheckpointer(client=FakeRedis())
        with self.assertRaises(checkpoint_store.CheckpointStoreError):
            store.get_tuple({"configurable": {"thread_id": "unsafe:key"}})

        store.db.values["sirinx:graph:thread-001:latest_id"] = "checkpoint-001"
        store.db.values[
            "sirinx:graph:thread-001:chk:checkpoint-001:layer4"
        ] = "{"
        with self.assertRaises(checkpoint_store.CheckpointStoreError):
            store.get_tuple({"configurable": {"thread_id": "thread-001"}})

    def test_checkpoint_rejects_incomplete_runtime_shape(self):
        redis_client = FakeRedis()
        store = checkpoint_store.LayeredRedisCheckpointer(client=redis_client)
        redis_client.values["sirinx:graph:thread-001:latest_id"] = "checkpoint-001"
        redis_client.values[
            "sirinx:graph:thread-001:chk:checkpoint-001:layer4"
        ] = json.dumps({"v": "1", "channel_values": {}})

        with self.assertRaises(checkpoint_store.CheckpointStoreError):
            store.get_tuple({"configurable": {"thread_id": "thread-001"}})

    def test_receipt_packet_and_lock_schema_are_local_safe(self):
        packet = json.loads(
            (ROOT / "_A2A_QUEUE/outbox/packet_060_phase_5b_5c_integration_prep.json").read_text()
        )
        self.assertTrue(packet["safety_constraints"]["dry_run_only"])
        self.assertTrue(packet["safety_constraints"]["no_deploy"])
        schema = json.loads(
            (ROOT / ".ghostclaw/schemas/sirinx-state-locker-durable-object.schema.json").read_text()
        )
        self.assertFalse(schema["additionalProperties"])


if __name__ == "__main__":
    unittest.main()

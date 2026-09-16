import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "GHOSTCLAW/P101/tools/p101/scripts"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


inventory = load_module("p101_repo_inventory", SCRIPT_DIR / "repo_inventory.py")
sys.modules["repo_inventory"] = inventory
arch_map = load_module("p101_baseline_arch_map", SCRIPT_DIR / "baseline_arch_map.py")


class P101BaselineArchitectureMapTests(unittest.TestCase):
    def make_repo(self, directory: Path) -> Path:
        directory.mkdir(parents=True, exist_ok=True)
        (directory / ".git").mkdir()
        config = directory / "GHOSTCLAW/P101/p101-config.json"
        config.parent.mkdir(parents=True)
        config.write_text(
            json.dumps(
                {
                    "mission_id": "P101-test",
                    "mode": "MAX_LOCAL_AUTONOMY_WITH_HARD_BLOCKS",
                    "teams": ["claude-worker", "codex-worker"],
                    "canonical_obsidian_sync": "/safe/a2a_obsidian_sync.py",
                }
            )
        )
        cargo = directory / "crates/sample/Cargo.toml"
        cargo.parent.mkdir(parents=True)
        cargo.write_text('[package]\nname = "sample"\nversion = "0.1.0"\n')
        package = directory / "apps/demo/package.json"
        package.parent.mkdir(parents=True)
        package.write_text(json.dumps({"name": "demo"}))
        ignored = directory / "node_modules/noise/package.json"
        ignored.parent.mkdir(parents=True)
        ignored.write_text(json.dumps({"name": "noise"}))
        return directory

    def test_canonical_config_is_valid_json(self):
        config = json.loads((ROOT / "GHOSTCLAW/P101/p101-config.json").read_text())
        self.assertEqual(config["mode"], "MAX_LOCAL_AUTONOMY_WITH_HARD_BLOCKS")
        self.assertFalse(config["safety"]["tmux_dispatch"])

    def test_inventory_excludes_generated_dependency_trees(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = self.make_repo(Path(temp))
            manifests = inventory.discover_manifests(repo)
        self.assertEqual([item["name"] for item in manifests["cargo"]], ["sample"])
        self.assertEqual([item["name"] for item in manifests["packages"]], ["demo"])

    def test_architecture_map_separates_observation_from_execution(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = self.make_repo(Path(temp))
            value = arch_map.build_architecture_map(
                repo,
                tmux_snapshot="claude-worker: 1 windows\ncodex-worker: 1 windows\n",
            )
        self.assertEqual(
            value["worker_plane"]["sessions_observed"],
            ["claude-worker", "codex-worker"],
        )
        self.assertFalse(value["worker_plane"]["execution_verified"])
        self.assertIsNone(value["inventory"]["claims"]["mcp_servers_active"])
        self.assertFalse(value["lock_plane"]["distributed_lock_verified"])

    def test_generation_writes_hashed_receipt_and_canvas(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base / "repo")
            output = base / "runtime/architecture.json"
            receipt = base / "runtime/receipt.json"
            canvas = base / "vault/P101.canvas"
            inventory_output = base / "runtime/inventory.json"
            result = arch_map.generate_artifacts(
                repo,
                output,
                receipt,
                tmux_snapshot="codex-worker\n",
                canvas_output=canvas,
                inventory_output=inventory_output,
            )
            canvas_value = json.loads(canvas.read_text())
            inventory_value = json.loads(inventory_output.read_text())
        self.assertEqual(len(result["architecture_map_sha256"]), 64)
        self.assertEqual(len(result["canvas_sha256"]), 64)
        self.assertEqual(len(result["inventory_sha256"]), 64)
        self.assertTrue(canvas_value["nodes"])
        self.assertEqual(inventory_value["schema"], "sirinx.p101.repo-inventory.v2")
        self.assertFalse(result["live_actions"]["tmux_dispatch"])

    def test_shell_entrypoint_has_no_dispatch_or_direct_note_append(self):
        script = (ROOT / "scripts/hermes-autoloop-m2.sh").read_text()
        self.assertNotIn("tmux send-keys", script)
        self.assertNotIn("SUPER_SECURE", script)
        self.assertNotIn(">> \"$OBSIDIAN\"", script)
        self.assertIn("--init-arch-map", script)
        self.assertIn("auto-approval modes are not supported", script)


if __name__ == "__main__":
    unittest.main()

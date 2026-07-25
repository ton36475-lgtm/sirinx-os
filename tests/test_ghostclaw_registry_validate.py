import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "ghostclaw_registry_validate.py"
SPEC = importlib.util.spec_from_file_location("ghostclaw_registry_validate", MODULE_PATH)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


PROJECTS = """projects:
  - id: ghostclaw-os
    name: GhostClaw OS
    canonical_role: root_operating_system
    domain_category: engineering_core
    known_routes:
      - path: repo_or_architecture
        tier: C
    agent_lanes:
      - primary_builder
      - validation
"""

AGENTS = """agents:
  - id: codex
    name: Codex
    lane: primary_builder
    mutates_files: true
  - id: opencode
    name: OpenCode
    lane: qa_review_only
    mutates_files: false
  - id: validator
    name: Validator
    lane: validation
    mutates_files: false
"""

ROUTES = """routes:
  - route_id: route-repo-arch
    task_type: repo_or_architecture
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: C
    escalation_path:
      - codex
      - validator
"""

DOMAIN_PACKS = """domain_packs:
  - project_id: ghostclaw-os
    canonical_role: root_operating_system
"""


def write_registry(root, relative_path, content):
    path = Path(root) / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def seed_root(route_text=ROUTES, agent_text=AGENTS):
    root = tempfile.TemporaryDirectory()
    write_registry(root.name, ".ghostclaw/registry/project-registry.v1.yaml", PROJECTS)
    write_registry(root.name, ".ghostclaw/registry/agent-registry.v1.yaml", agent_text)
    write_registry(root.name, ".ghostclaw/registry/route-matrix.v1.yaml", route_text)
    write_registry(root.name, ".ghostclaw/registry/domain-pack-index.v1.yaml", DOMAIN_PACKS)
    return root


class GhostClawRegistryValidatorTests(unittest.TestCase):
    def test_parse_yaml_records_reads_scalars_and_lists(self):
        with seed_root() as root:
            projects = validator.parse_yaml_records(
                Path(root) / ".ghostclaw/registry/project-registry.v1.yaml",
                "id",
            )

        self.assertEqual(projects[0]["id"], "ghostclaw-os")
        self.assertEqual(projects[0]["domain_category"], "engineering_core")
        self.assertEqual(projects[0]["known_routes_paths"], ["repo_or_architecture"])
        self.assertEqual(projects[0]["agent_lanes"], ["primary_builder", "validation"])

    def test_cross_reference_checks_pass_for_valid_registries(self):
        with seed_root() as root:
            result = validator.validate_cross_references(root)

        self.assertEqual(result["projects"], 1)
        self.assertEqual(result["agents"], 3)
        self.assertEqual(result["routes"], 1)
        self.assertEqual(result["domain_packs"], 1)
        self.assertEqual(result["failures"], [])

    def test_cross_reference_checks_detect_duplicate_routes_and_missing_agents(self):
        bad_routes = ROUTES + """
  - route_id: route-repo-arch
    task_type: docs_config_update
    primary_agent: missing-agent
    tier: B
"""
        with seed_root(route_text=bad_routes) as root:
            result = validator.validate_cross_references(root)

        failure_labels = {item["label"] for item in result["failures"]}
        self.assertIn("route IDs are unique", failure_labels)
        self.assertIn("route agent references resolve", failure_labels)

    def test_cross_reference_checks_detect_invalid_agent_lanes(self):
        bad_agents = AGENTS + """
  - id: bad-lane-agent
    name: Bad Lane
    lane: unknown_lane
"""
        with seed_root(agent_text=bad_agents) as root:
            result = validator.validate_cross_references(root)

        failure_labels = {item["label"] for item in result["failures"]}
        self.assertIn("agent lanes are valid", failure_labels)


if __name__ == "__main__":
    unittest.main()

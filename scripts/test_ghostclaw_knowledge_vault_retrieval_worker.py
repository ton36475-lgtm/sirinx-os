#!/usr/bin/env python3
import json
import tempfile
import unittest
from pathlib import Path

from ghostclaw_knowledge_vault_retrieval_worker import build_context_pack


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class KnowledgeVaultRetrievalWorkerTest(unittest.TestCase):
    def make_root(self):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        write(
            root / ".ghostclaw/registry/project-registry.v1.yaml",
            """
projects:
  - id: ghostclaw-os
    name: GhostClaw OS
    canonical_role: root_operating_system
    retrieval_keys:
      - ghostclaw
      - a2a
    known_routes:
      - path: repo_or_architecture
    constraints:
      - no secrets
""",
        )
        write(
            root / ".ghostclaw/registry/route-matrix.v1.yaml",
            """
routes:
  - route_id: route-repo-arch
    task_type: repo_or_architecture
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: C
""",
        )
        write(
            root / ".ghostclaw/registry/domain-pack-index.v1.yaml",
            """
domain_packs:
  - project_id: ghostclaw-os
    canonical_role: root_operating_system
    related_files_paths:
      - ".ghostclaw/registry/*"
""",
        )
        write(
            root / ".ghostclaw/registry/knowledge-vault-index.v1.yaml",
            """
entries:
  - id: kv-001
    title: GhostClaw Blueprint
    category: architecture
    source_path: docs/GHOSTCLAW_BLUEPRINT.md
    format: md
    projects: [ghostclaw-os]
    tags: [ghostclaw, architecture]
    freshness: current
    summary: Pointer to architecture only.
  - id: kv-002
    title: Secret File
    category: architecture
    source_path: secrets/private.md
    format: md
    projects: [ghostclaw-os]
    tags: [ghostclaw]
    freshness: current
    summary: Must not be emitted.
  - id: kv-003
    title: Other Project
    category: architecture
    source_path: docs/OTHER.md
    format: md
    projects: [other-project]
    tags: [other]
    freshness: current
    summary: Irrelevant.
""",
        )
        write(root / "docs/GHOSTCLAW_BLUEPRINT.md", "# blueprint\n")
        return tmp, root

    def test_tier_c_returns_relevant_safe_pointers(self):
        tmp, root = self.make_root()
        self.addCleanup(tmp.cleanup)
        pack = build_context_pack(str(root), "ghostclaw-os", "C")
        self.assertEqual(pack["status"], "ok")
        self.assertEqual(pack["limits"]["full_vault_loaded"], False)
        self.assertEqual(pack["source_pointers"][0]["source_path"], "docs/GHOSTCLAW_BLUEPRINT.md")
        self.assertNotIn("secrets/private.md", json.dumps(pack))

    def test_tier_a_omits_vault_pointers(self):
        tmp, root = self.make_root()
        self.addCleanup(tmp.cleanup)
        pack = build_context_pack(str(root), "ghostclaw-os", "A")
        self.assertEqual(pack["source_pointers"], [])
        self.assertEqual(pack["project"]["id"], "ghostclaw-os")

    def test_output_is_bounded_by_max_entries(self):
        tmp, root = self.make_root()
        self.addCleanup(tmp.cleanup)
        pack = build_context_pack(str(root), "ghostclaw-os", "C", max_entries=1)
        self.assertEqual(pack["bounded"]["source_pointer_count"], 1)


if __name__ == "__main__":
    unittest.main()

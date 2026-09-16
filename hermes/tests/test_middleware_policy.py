import unittest

from hermes.autoloop.middleware import (
    BLOCK_ALWAYS,
    GateRequired,
    PolicyError,
    assert_allowed,
    inject_constraints,
    path_inside_lease,
)
from hermes.autoloop.middleware_selftest import run_middleware_self_tests


class MiddlewarePolicyTest(unittest.TestCase):
    def test_block_always_actions_fail_closed(self):
        for action in BLOCK_ALWAYS:
            with self.subTest(action=action):
                with self.assertRaises(PolicyError):
                    assert_allowed(action)

    def test_unknown_action_denied(self):
        with self.assertRaisesRegex(PolicyError, "unknown_action_denied"):
            assert_allowed("invented_live_action")

    def test_write_requires_active_lease_and_path_inside_scope(self):
        with self.assertRaisesRegex(GateRequired, "missing_active_lease"):
            assert_allowed("write_leased_paths", requested_paths=["src/a.py"])

        lease = {"status": "ACTIVE", "expired": False, "paths": ["src/allowed"]}
        self.assertTrue(assert_allowed("write_leased_paths", requested_paths=["src/allowed/a.py"], lease=lease))

        with self.assertRaisesRegex(PolicyError, "path_outside_lease"):
            assert_allowed("write_leased_paths", requested_paths=["src/other/a.py"], lease=lease)

    def test_path_inside_lease_rejects_traversal(self):
        self.assertFalse(path_inside_lease("../.env", ["src"]))
        self.assertFalse(path_inside_lease("src/../.env", ["src"]))

    def test_commit_requires_human_decision(self):
        with self.assertRaisesRegex(GateRequired, "human_decision_required"):
            assert_allowed("commit_local_after_human_decision")
        self.assertTrue(assert_allowed("commit_local_after_human_decision", human_approved=True))

    def test_constraints_are_injected_from_code_policy(self):
        envelope = inject_constraints({"task_id": "t1"})
        self.assertIn("deploy", envelope["constraints"]["deny"])
        self.assertIn("write_leased_paths", envelope["constraints"]["allow"])

    def test_selftest_passes(self):
        self.assertTrue(run_middleware_self_tests())


if __name__ == "__main__":
    unittest.main()


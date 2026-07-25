"""Boot-time and CI self-tests for Autoloop V2 middleware."""

from __future__ import annotations

from .middleware import BLOCK_ALWAYS, GateRequired, PolicyError, assert_allowed


def run_middleware_self_tests() -> bool:
    for action in sorted(BLOCK_ALWAYS):
        try:
            assert_allowed(action)
            raise AssertionError(f"deny action passed unexpectedly: {action}")
        except PolicyError:
            pass

    try:
        assert_allowed("write_leased_paths", requested_paths=["src/a.rs"], lease=None)
        raise AssertionError("write without lease passed unexpectedly")
    except GateRequired:
        pass

    lease = {
        "status": "ACTIVE",
        "expired": False,
        "paths": ["src/allowed"],
    }
    assert_allowed("write_leased_paths", requested_paths=["src/allowed/a.rs"], lease=lease)

    try:
        assert_allowed("write_leased_paths", requested_paths=["src/other/a.rs"], lease=lease)
        raise AssertionError("write outside lease passed unexpectedly")
    except PolicyError:
        pass

    try:
        assert_allowed("commit_local_after_human_decision", human_approved=False)
        raise AssertionError("commit without human decision passed unexpectedly")
    except GateRequired:
        pass

    assert_allowed("commit_local_after_human_decision", human_approved=True)
    return True


if __name__ == "__main__":
    run_middleware_self_tests()
    print("middleware_self_tests: PASS")


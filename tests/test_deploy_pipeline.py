from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
from unittest import mock


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "deploy-pipeline.py"
SPEC = importlib.util.spec_from_file_location("sirinx_deploy_pipeline", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover
    raise RuntimeError("unable to load deploy pipeline module")
PIPELINE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = PIPELINE
SPEC.loader.exec_module(PIPELINE)


class FakeRunner:
    def __init__(self, responses: Optional[Mapping[Tuple[str, ...], object]] = None) -> None:
        self.responses: Dict[Tuple[str, ...], object] = dict(responses or {})
        self.calls: List[Tuple[Tuple[str, ...], Path, int, bool]] = []

    def __call__(
        self, argv: Sequence[str], cwd: Path, timeout: int, capture_output: bool
    ) -> object:
        key = tuple(argv)
        self.calls.append((key, cwd, timeout, capture_output))
        response = self.responses.get(key)
        if isinstance(response, list):
            if not response:
                raise AssertionError(f"no remaining fake response for {key}")
            return response.pop(0)
        if response is None:
            raise AssertionError(f"unexpected command: {key}")
        return response


def result(returncode: int = 0, stdout: str = "", stderr: str = "") -> object:
    return PIPELINE.CommandResult(returncode, stdout, stderr)


def git_read(*args: str) -> Tuple[str, ...]:
    return tuple(PIPELINE._git_read_argv(args))


def context_responses(branch: str = "codex/focused", head: str = "a" * 40) -> Dict[Tuple[str, ...], object]:
    return {
        git_read("branch", "--show-current"): result(stdout=branch + "\n"),
        git_read("rev-parse", "HEAD"): result(stdout=head + "\n"),
    }


def mutating_commands(calls: Iterable[Tuple[Tuple[str, ...], Path, int, bool]]) -> List[Tuple[str, ...]]:
    blocked = []
    for argv, _cwd, _timeout, _capture in calls:
        if not argv:
            continue
        if argv[0] in {"npx", "wrangler"}:
            blocked.append(argv)
        elif argv[0] == "git" and any(
            part in {"add", "commit", "push", "reset", "checkout"} for part in argv[1:]
        ):
            blocked.append(argv)
    return blocked


class EvidenceFixture:
    def __init__(self, root: Path, now: datetime) -> None:
        self.repo = root.resolve()
        self.now = now
        self.branch = "codex/focused"
        self.head_sha = "a" * 40
        self.target = f"{PIPELINE.PUSH_REPOSITORY_ID}@refs/heads/{self.branch}"
        self.argv = PIPELINE._push_argv(self.branch)
        runtime = self.repo / ".ghostclaw_runtime" / "a2a2a"
        self.approvals = runtime / "approvals"
        self.receipts = runtime / "receipts"
        self.evidence = runtime / "evidence"
        self.approvals.mkdir(parents=True)
        self.receipts.mkdir()
        self.evidence.mkdir()
        self.artifact_path = self.evidence / "focused.patch"
        self.artifact_path.write_bytes(b"focused-safe-diff\n")
        self.artifact_sha256 = __import__("hashlib").sha256(
            self.artifact_path.read_bytes()
        ).hexdigest()
        self.receipt_path = self.receipts / "qa-pass.json"
        self.approval_path = self.approvals / "push-approval.json"
        self.receipt = {
            "schema": PIPELINE.PREREQUISITE_RECEIPT_SCHEMA,
            "receipt_id": "receipt-001",
            "task_id": PIPELINE.TASK_ID,
            "action": "push",
            "target": self.target,
            "branch": self.branch,
            "head_sha": self.head_sha,
            "argv": self.argv,
            "artifact_sha256": self.artifact_sha256,
            "verdict": "PASS",
            "produced_by": "independent_validator",
            "created_at": (now - timedelta(minutes=4)).isoformat(),
            "expires_at": (now + timedelta(minutes=6)).isoformat(),
            "checks": dict(PIPELINE.REQUIRED_RECEIPT_CHECKS),
        }
        self.approval = {
            "schema": PIPELINE.APPROVAL_SCHEMA,
            "approval_id": "approval-001",
            "task_id": PIPELINE.TASK_ID,
            "action": "push",
            "target": self.target,
            "branch": self.branch,
            "head_sha": self.head_sha,
            "argv": self.argv,
            "artifact_sha256": self.artifact_sha256,
            "approved": True,
            "requested_by": "codex_build_captain",
            "approved_by": "human_operator",
            "issued_at": (now - timedelta(minutes=2)).isoformat(),
            "expires_at": (now + timedelta(minutes=5)).isoformat(),
            "prerequisite_receipt_id": self.receipt["receipt_id"],
        }
        self.write()

    def write(self) -> None:
        self.receipt_path.write_text(json.dumps(self.receipt), encoding="utf-8")
        self.approval_path.write_text(json.dumps(self.approval), encoding="utf-8")

    def runner(self) -> FakeRunner:
        return FakeRunner(context_responses(self.branch, self.head_sha))

    def validate(self, runner: Optional[FakeRunner] = None) -> None:
        PIPELINE.push_to_github(
            repo=self.repo,
            execute=True,
            target=self.target,
            approval_path=self.approval_path,
            receipt_path=self.receipt_path,
            artifact_path=self.artifact_path,
            runner=runner or self.runner(),
            now=self.now,
        )


class DeployPipelineTests(unittest.TestCase):
    NOW = datetime(2026, 7, 19, 4, 0, tzinfo=timezone.utc)

    def test_import_is_side_effect_free(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            code = (
                "import importlib.util,sys;"
                f"p={str(SCRIPT_PATH)!r};"
                "s=importlib.util.spec_from_file_location('probe',p);"
                "m=importlib.util.module_from_spec(s);sys.modules[s.name]=m;"
                "s.loader.exec_module(m)"
            )
            before = list(root.iterdir())
            completed = subprocess.run(
                [sys.executable, "-B", "-c", code],
                cwd=root,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env={"PATH": os.defpath, "PYTHONDONTWRITEBYTECODE": "1"},
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertEqual(before, list(root.iterdir()))

    def test_subprocess_runner_uses_argv_and_never_shell(self) -> None:
        completed = subprocess.CompletedProcess(["git", "status"], 0, "ok", "")
        with mock.patch.object(PIPELINE.subprocess, "run", return_value=completed) as run:
            actual = PIPELINE.subprocess_runner(["git", "status"], Path("/tmp"), 7, True)
        self.assertEqual(actual.returncode, 0)
        positional, keywords = run.call_args
        self.assertEqual(positional[0], ["git", "status"])
        self.assertIs(keywords["shell"], False)
        self.assertEqual(keywords["timeout"], 7)

    def test_status_is_read_only_and_does_not_read_remote_url(self) -> None:
        responses = context_responses()
        responses.update(
            {
                git_read("status", "--porcelain=v1", "-z"): result(stdout=" M safe.txt\0"),
                git_read("remote"): result(
                    stdout="origin\nhttps://user:password@example.invalid/repo\n"
                ),
                git_read(
                    "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"
                ): result(returncode=1),
            }
        )
        runner = FakeRunner(responses)
        actual = PIPELINE.pipeline_status(Path("/tmp/repo"), runner)
        serialized = json.dumps(actual)
        self.assertEqual(actual["dirty_count"], 1)
        self.assertEqual(actual["remote_names"], ["origin", "[redacted]"])
        self.assertNotIn("password", serialized)
        self.assertFalse(actual["remote_urls_read"])
        self.assertEqual(mutating_commands(runner.calls), [])
        self.assertIn(
            git_read("status", "--porcelain=v1", "-z"),
            [call[0] for call in runner.calls],
        )
        self.assertNotIn(git_read("remote", "get-url", "origin"), [call[0] for call in runner.calls])

    def test_status_reports_ahead_and_behind_from_local_upstream(self) -> None:
        responses = context_responses()
        responses.update(
            {
                git_read("status", "--porcelain=v1", "-z"): result(),
                git_read("remote"): result(stdout="origin\n"),
                git_read(
                    "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"
                ): result(stdout="origin/codex/focused\n"),
                git_read(
                    "rev-list", "--left-right", "--count", "HEAD...@{upstream}"
                ): result(stdout="2 3\n"),
            }
        )
        actual = PIPELINE.pipeline_status(Path("/tmp/repo"), FakeRunner(responses))
        self.assertEqual((actual["ahead"], actual["behind"]), (2, 3))

    def test_status_fails_closed_on_probe_error(self) -> None:
        responses = context_responses()
        responses[git_read("status", "--porcelain=v1", "-z")] = result(returncode=1)
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Read-only git command failed"):
            PIPELINE.pipeline_status(Path("/tmp/repo"), FakeRunner(responses))

    def test_detached_head_is_blocked(self) -> None:
        runner = FakeRunner(context_responses(branch=""))
        with self.assertRaisesRegex(PIPELINE.PipelineError, "safe named ref"):
            PIPELINE.pipeline_status(Path("/tmp/repo"), runner)

    def test_review_uses_metadata_only_and_redacts_sensitive_path(self) -> None:
        responses = context_responses()
        responses.update(
            {
                git_read(
                    "diff-tree",
                    "--root",
                    "--no-commit-id",
                    "--name-only",
                    "-r",
                    "-z",
                    "HEAD",
                ): result(stdout=".env.production\0safe.py\0"),
                git_read(
                    "diff-tree",
                    "--root",
                    "--no-commit-id",
                    "--numstat",
                    "-r",
                    "-z",
                    "HEAD",
                ): result(stdout="1\t0\t.env.production\0" + "501\t0\tsafe.py\0"),
            }
        )
        runner = FakeRunner(responses)
        actual = PIPELINE.review_last_commit(Path("/tmp/repo"), runner)
        serialized = json.dumps(actual)
        self.assertEqual(actual["verdict"], "ISSUES_FOUND")
        self.assertFalse(actual["diff_content_read"])
        self.assertFalse(actual["report_written"])
        self.assertNotIn(".env.production", serialized)
        self.assertEqual(mutating_commands(runner.calls), [])
        self.assertFalse(any("diff" in call[0] and "--patch" in call[0] for call in runner.calls))

    def test_env_example_is_not_treated_as_a_secret_file(self) -> None:
        self.assertFalse(PIPELINE._is_secret_like_path(".env.example"))
        self.assertFalse(PIPELINE._is_secret_like_path("config/.env.local.example"))
        self.assertTrue(PIPELINE._is_secret_like_path(".env.production"))

    def test_commit_is_always_blocked(self) -> None:
        with self.assertRaises(PIPELINE.PipelineError) as caught:
            PIPELINE.commit_blocked()
        self.assertEqual(caught.exception.code, "manual_scoped_commit_required")

    def test_push_without_execute_is_plan_only_and_runs_nothing(self) -> None:
        runner = FakeRunner()
        actual = PIPELINE.push_to_github(repo=Path("/tmp/repo"), runner=runner)
        self.assertEqual(actual["state"], "plan_only")
        self.assertEqual(runner.calls, [])

    def test_confirm_alone_cannot_unlock_push(self) -> None:
        runner = FakeRunner()
        with self.assertRaises(PIPELINE.PipelineError) as caught:
            PIPELINE.push_to_github(repo=Path("/tmp/repo"), confirm=True, runner=runner)
        self.assertEqual(caught.exception.code, "confirmation_not_authorization")
        self.assertEqual(runner.calls, [])

    def test_deploy_is_always_plan_only_or_blocked(self) -> None:
        self.assertEqual(PIPELINE.deploy_cloudflare()["state"], "plan_only")
        with self.assertRaises(PIPELINE.PipelineError) as confirm:
            PIPELINE.deploy_cloudflare(confirm=True)
        self.assertEqual(confirm.exception.code, "confirmation_not_authorization")
        with self.assertRaises(PIPELINE.PipelineError) as execute:
            PIPELINE.deploy_cloudflare(execute=True)
        self.assertEqual(execute.exception.code, "no_approved_deploy_targets")

    def test_valid_push_packet_still_requires_separate_executor(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "separate_executor_required")
            self.assertEqual(mutating_commands(runner.calls), [])
            self.assertTrue(fixture.approval_path.exists())
            self.assertEqual(
                sorted(path.name for path in fixture.receipts.iterdir()), [fixture.receipt_path.name]
            )
            self.assertEqual(fixture.argv[3], PIPELINE.PUSH_REPOSITORY_URL)
            self.assertNotIn("origin", fixture.target)

    def test_evidence_is_read_once_through_directory_descriptors(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            runner = fixture.runner()
            with mock.patch.object(Path, "read_bytes", side_effect=AssertionError("path reopened")):
                with self.assertRaises(PIPELINE.PipelineError) as caught:
                    fixture.validate(runner)
            self.assertEqual(caught.exception.code, "separate_executor_required")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_wrong_cli_target_is_rejected_before_evidence_read(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                PIPELINE.push_to_github(
                    repo=fixture.repo,
                    execute=True,
                    target="origin/refs/heads/other",
                    approval_path=fixture.approval_path,
                    receipt_path=fixture.receipt_path,
                    artifact_path=fixture.artifact_path,
                    runner=runner,
                    now=self.NOW,
                )
            self.assertEqual(caught.exception.code, "target_mismatch")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_mismatched_head_branch_argv_and_artifact_fail_closed(self) -> None:
        mutations = [
            ("head_sha", "b" * 40),
            ("branch", "codex/other"),
            ("argv", ["git", "push", "origin", "main"]),
            ("artifact_sha256", "0" * 64),
        ]
        for field, value in mutations:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temp:
                fixture = EvidenceFixture(Path(temp), self.NOW)
                fixture.approval[field] = value
                fixture.write()
                runner = fixture.runner()
                with self.assertRaises(PIPELINE.PipelineError) as caught:
                    fixture.validate(runner)
                self.assertEqual(caught.exception.code, "evidence_mismatch")
                self.assertEqual(mutating_commands(runner.calls), [])

    def test_expired_and_overlong_approval_fail_closed(self) -> None:
        cases = [
            (
                (self.NOW - timedelta(minutes=12)).isoformat(),
                (self.NOW - timedelta(minutes=1)).isoformat(),
                "invalid_evidence_lifetime",
            ),
            (
                (self.NOW - timedelta(minutes=5)).isoformat(),
                (self.NOW - timedelta(minutes=1)).isoformat(),
                "expired_evidence",
            ),
        ]
        for issued, expires, expected_code in cases:
            with self.subTest(expected_code=expected_code), tempfile.TemporaryDirectory() as temp:
                fixture = EvidenceFixture(Path(temp), self.NOW)
                fixture.approval["issued_at"] = issued
                fixture.approval["expires_at"] = expires
                fixture.write()
                runner = fixture.runner()
                with self.assertRaises(PIPELINE.PipelineError) as caught:
                    fixture.validate(runner)
                self.assertEqual(caught.exception.code, expected_code)
                self.assertEqual(mutating_commands(runner.calls), [])

    def test_expired_receipt_and_incomplete_checks_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.receipt["created_at"] = (self.NOW - timedelta(minutes=5)).isoformat()
            fixture.receipt["expires_at"] = (self.NOW - timedelta(minutes=1)).isoformat()
            fixture.write()
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "expired_evidence")
            self.assertEqual(mutating_commands(runner.calls), [])

        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.receipt["checks"]["review"] = "WARN"
            fixture.write()
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "receipt_checks_incomplete")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_self_approval_and_wrong_receipt_id_are_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.approval["approved_by"] = fixture.approval["requested_by"]
            fixture.write()
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "self_approval_blocked")
            self.assertEqual(mutating_commands(runner.calls), [])

        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.approval["prerequisite_receipt_id"] = "different"
            fixture.write()
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "receipt_mismatch")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_replay_marker_blocks_even_a_valid_packet(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            claimed = fixture.approval_path.with_name(fixture.approval_path.name + ".claimed")
            claimed.write_text("claimed", encoding="utf-8")
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "approval_replayed")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_symlink_and_path_escape_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            outside = fixture.repo / "outside.json"
            outside.write_text(fixture.approval_path.read_text(encoding="utf-8"), encoding="utf-8")
            fixture.approval_path.unlink()
            fixture.approval_path.symlink_to(outside)
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "unsafe_evidence_file")
            self.assertEqual(mutating_commands(runner.calls), [])

        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            outside_receipt = fixture.repo / "outside-receipt.json"
            outside_receipt.write_text(
                fixture.receipt_path.read_text(encoding="utf-8"), encoding="utf-8"
            )
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                PIPELINE.push_to_github(
                    repo=fixture.repo,
                    execute=True,
                    target=fixture.target,
                    approval_path=fixture.approval_path,
                    receipt_path=outside_receipt,
                    artifact_path=fixture.artifact_path,
                    runner=runner,
                    now=self.NOW,
                )
            self.assertEqual(caught.exception.code, "unsafe_evidence_path")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_symlinked_runtime_ancestor_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo = root / "repo"
            external_runtime = root / "external-runtime"
            repo.mkdir()
            external_runtime.mkdir()
            (repo / ".ghostclaw_runtime").symlink_to(external_runtime, target_is_directory=True)
            fixture = EvidenceFixture(repo, self.NOW)
            runner = fixture.runner()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate(runner)
            self.assertEqual(caught.exception.code, "unsafe_runtime_root")
            self.assertEqual(mutating_commands(runner.calls), [])

    def test_malformed_duplicate_and_unknown_json_fields_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.approval_path.write_text("{not-json", encoding="utf-8")
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate()
            self.assertEqual(caught.exception.code, "invalid_json")

        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.approval_path.write_text('{"schema":"a","schema":"b"}', encoding="utf-8")
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate()
            self.assertEqual(caught.exception.code, "duplicate_json_key")

        with tempfile.TemporaryDirectory() as temp:
            fixture = EvidenceFixture(Path(temp), self.NOW)
            fixture.approval["unexpected"] = True
            fixture.write()
            with self.assertRaises(PIPELINE.PipelineError) as caught:
                fixture.validate()
            self.assertEqual(caught.exception.code, "invalid_evidence_fields")

    def test_cli_blocked_paths_return_nonzero_and_no_completion_claim(self) -> None:
        for argv, expected_code in [
            (["commit"], "manual_scoped_commit_required"),
            (["push", "--confirm"], "confirmation_not_authorization"),
            (["deploy", "--execute"], "no_approved_deploy_targets"),
        ]:
            with self.subTest(argv=argv):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    returncode = PIPELINE.main(argv)
                payload = json.loads(output.getvalue())
                self.assertNotEqual(returncode, 0)
                self.assertEqual(payload["code"], expected_code)
                self.assertFalse(payload["external_action_performed"])

        for argv in (["push"], ["deploy"]):
            with self.subTest(argv=argv):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    returncode = PIPELINE.main(argv)
                payload = json.loads(output.getvalue())
                self.assertNotEqual(returncode, 0)
                self.assertEqual(payload["state"], "plan_only")
                self.assertFalse(payload["external_action_performed"])

    def test_cli_review_findings_return_nonzero(self) -> None:
        fake_review = {
            "state": "read_only",
            "verdict": "ISSUES_FOUND",
            "issues": [{"severity": "WARN", "type": "large_change", "path": "safe.py"}],
            "external_action_performed": False,
        }
        output = io.StringIO()
        with mock.patch.object(PIPELINE, "review_last_commit", return_value=fake_review):
            with contextlib.redirect_stdout(output):
                returncode = PIPELINE.main(["review"])
        self.assertNotEqual(returncode, 0)
        self.assertEqual(json.loads(output.getvalue())["verdict"], "ISSUES_FOUND")


if __name__ == "__main__":
    unittest.main()

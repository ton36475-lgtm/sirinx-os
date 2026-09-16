import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGodmodeV5BaselineEvidence,
  createArchitectureStateFromBaselineEvidence,
  parseGitStatus,
  validateBaselineScope,
  verifyGodmodeV5BaselineEvidence
} from "./godmode-v5-baseline-evidence.mjs";

const fixedNow = () => new Date("2026-07-15T09:00:00.000Z");

const baselineState = {
  Schema: "ghostclaw.godmode.v5.state.v1",
  Version: "5.0.0",
  TaskId: "TASK-BASELINE",
  CorrelationId: "CORR-BASELINE",
  Phase: "Baseline",
  Status: "InProgress",
  AbortWindow: 900,
  MaxRetries: 3,
  Attempt: 0,
  Owner: "HermesCommander",
  ExitCriteria: {
    ScopeLocked: false,
    SourceOfTruthMapped: false,
    DirtyLanesRecorded: false,
    RiskClassified: false
  },
  Evidence: []
};

const scope = {
  $schema: "ghostclaw.godmode.v5.baseline-scope.v1",
  TaskId: "TASK-BASELINE",
  CorrelationId: "CORR-BASELINE",
  LaneId: "LANE-1",
  Objective: "Verify the deterministic local control plane before architecture.",
  AllowedPaths: ["services/dev-control-api/"],
  Owners: {
    SingleRepoWriter: "codex_build_captain",
    ArchitectureOwner: "claude_architect"
  },
  ExternalActions: { ProviderCall: false, Deploy: false }
};

test("parses null-delimited Git status without reading file contents", () => {
  const result = parseGitStatus(" M services/api.mjs\0?? docs/new.md\0D  old.txt\0");
  assert.equal(result.EntryCount, 3);
  assert.equal(result.UntrackedCount, 1);
  assert.equal(result.DeletedCount, 1);
  assert.equal(result.Entries[0].Path, "services/api.mjs");
  assert.equal(result.StatusDigestSha256.length, 64);
});

test("requires task identity, owners, paths, and closed external actions", () => {
  const valid = validateBaselineScope(scope, baselineState);
  const invalid = validateBaselineScope({ ...scope, ExternalActions: { ProviderCall: true } }, baselineState);
  assert.equal(valid.Passed, true);
  assert.equal(invalid.Passed, false);
  assert.equal(invalid.Checks.ExternalActionsClosed, false);
});

test("builds evidence and advances only after every Baseline criterion passes", async () => {
  const configs = new Map([
    ["configs/godmode_v5_runtime.config.json", baselineState],
    ["configs/godmode_v5_baseline.scope.json", scope],
    ["configs/ghostclaw_agent_coordination.config.json", {}],
    ["configs/hermes_telegram_gateway.config.json", {}],
    ["configs/cloudflare_deployment_targets.config.json", {}]
  ]);
  const packet = await buildGodmodeV5BaselineEvidence({
    now: fixedNow,
    dependencies: {
      readJson: async (path) => structuredClone(configs.get(path)),
      buildSourceMap: async () => ({
        Passed: true,
        SourceCount: 8,
        MirrorCount: 4,
        Sources: [{ CanonicalPath: "configs/source.json" }]
      }),
      getGitSnapshot: async () => ({
        Branch: "test",
        HeadCommit: "a".repeat(40),
        EntryCount: 2,
        LaneCounts: { services: 2 },
        StatusDigestSha256: "b".repeat(64),
        ContentsRead: false
      }),
      buildRiskClassification: () => ({
        Passed: true,
        Checks: {},
        Validation: {},
        Classes: [{ Class: "GreenLocalReadOnly" }, { Class: "RedExternalBounded" }]
      })
    }
  });
  const transition = createArchitectureStateFromBaselineEvidence(packet, baselineState, { now: fixedNow });

  assert.equal(packet.OverallPassed, true);
  assert.equal(verifyGodmodeV5BaselineEvidence(packet, baselineState, { now: fixedNow }).Passed, true);
  assert.equal(transition.ReadyState.Status, "ReadyToAdvance");
  assert.equal(transition.ArchitectureState.Phase, "Architecture");
  assert.equal(transition.ArchitectureState.Owner, "ClaudeArchitect");
  assert.equal(transition.ArchitectureState.PreviousReceiptDigest, transition.ReadyState.ReceiptDigest);
});

test("rejects stale evidence after the source state changes", async () => {
  const configs = new Map([
    ["configs/godmode_v5_runtime.config.json", baselineState],
    ["configs/godmode_v5_baseline.scope.json", scope],
    ["configs/ghostclaw_agent_coordination.config.json", {}],
    ["configs/hermes_telegram_gateway.config.json", {}],
    ["configs/cloudflare_deployment_targets.config.json", {}]
  ]);
  const packet = await buildGodmodeV5BaselineEvidence({
    now: fixedNow,
    dependencies: {
      readJson: async (path) => structuredClone(configs.get(path)),
      buildSourceMap: async () => ({ Passed: true, SourceCount: 1, MirrorCount: 0, Sources: [] }),
      getGitSnapshot: async () => ({
        Branch: "test",
        HeadCommit: "a".repeat(40),
        EntryCount: 0,
        LaneCounts: {},
        StatusDigestSha256: "b".repeat(64)
      }),
      buildRiskClassification: () => ({ Passed: true, Classes: [{ Class: "GreenLocalReadOnly" }] })
    }
  });
  const changed = { ...baselineState, Attempt: 1 };
  const verification = verifyGodmodeV5BaselineEvidence(packet, changed, { now: fixedNow });

  assert.equal(verification.Passed, false);
  assert.ok(verification.Issues.includes("StateDigestMismatch"));
});

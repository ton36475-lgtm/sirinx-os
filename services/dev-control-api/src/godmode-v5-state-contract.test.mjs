import { describe, expect, it } from "vitest";
import {
  GODMODE_V5_PHASES,
  advanceGodmodeV5State,
  getGodmodeV5RuntimeStatus,
  markGodmodeV5ExitCriteria,
  normalizeGodmodeV5State,
  recordGodmodeV5Attempt
} from "./godmode-v5-state-contract.mjs";

const fixedNow = () => new Date("2026-07-15T00:30:00.000Z");

describe("GODMODE V5 state contract", () => {
  it("emits canonical UpperCamelCase runtime keys", async () => {
    const state = await getGodmodeV5RuntimeStatus({ repoRoot: process.cwd(), now: fixedNow });
    const activePhase = GODMODE_V5_PHASES.find((phase) => phase.Name === state.Phase);

    expect(state.PhaseOrder).toEqual(["Baseline", "Architecture", "Implementation", "Verification", "Release"]);
    expect(Boolean(activePhase)).toBe(true);
    expect(state.AbortWindow).toBe(900);
    expect(state.MaxRetries).toBe(3);
    expect(state.ExternalActionAuthorized).toBe(false);
    expect(state).not.toHaveProperty("ABORT_WINDOW");
    expect(state).not.toHaveProperty("MAX_RETRIES");
    expect(Object.keys(state.ExitCriteria)).toEqual(activePhase.ExitCriteria);
  });

  it("accepts legacy uppercase-snake input while emitting canonical keys only", () => {
    const state = normalizeGodmodeV5State(
      {
        SCHEMA: "ghostclaw.godmode.v5.state.v1",
        VERSION: "5.0.0",
        TASK_ID: "TASK-1",
        CORRELATION_ID: "CORR-1",
        PHASE: "BASELINE",
        STATUS: "InProgress",
        ABORT_WINDOW: "600",
        MAX_RETRIES: "2",
        ATTEMPT: 0,
        EXIT_CRITERIA: {
          SCOPE_LOCKED: true,
          SOURCE_OF_TRUTH_MAPPED: false,
          DIRTY_LANES_RECORDED: false,
          RISK_CLASSIFIED: false
        }
      },
      { now: fixedNow }
    );

    expect(state).toMatchObject({ AbortWindow: 600, MaxRetries: 2, TaskId: "TASK-1", Phase: "Baseline" });
    expect(state.ExitCriteria.ScopeLocked).toBe(true);
    expect(state).not.toHaveProperty("ABORT_WINDOW");
    expect(state).not.toHaveProperty("MAX_RETRIES");
  });

  it("rejects conflicting canonical and legacy aliases", () => {
    expect(() =>
      normalizeGodmodeV5State(
        { AbortWindow: 900, ABORT_WINDOW: 300, MaxRetries: 3 },
        { now: fixedNow }
      )
    ).toThrow("conflicting_aliases:AbortWindow");
  });

  it("blocks phase skips until every deterministic exit criterion passes", () => {
    const baseline = normalizeGodmodeV5State(
      { TaskId: "TASK-2", CorrelationId: "CORR-2", Phase: "Baseline", Status: "InProgress" },
      { now: fixedNow }
    );
    expect(() => advanceGodmodeV5State(baseline, { now: fixedNow })).toThrow("exit_criteria_incomplete");

    const ready = markGodmodeV5ExitCriteria(
      baseline,
      {
        ScopeLocked: true,
        SourceOfTruthMapped: true,
        DirtyLanesRecorded: true,
        RiskClassified: true
      },
      { now: fixedNow }
    );
    const architecture = advanceGodmodeV5State(ready, { now: fixedNow });

    expect(ready.Status).toBe("ReadyToAdvance");
    expect(architecture.Phase).toBe("Architecture");
    expect(architecture.Owner).toBe("ClaudeArchitect");
    expect(architecture.PreviousReceiptDigest).toBe(ready.ReceiptDigest);
    expect(Object.values(architecture.ExitCriteria).every((value) => value === false)).toBe(true);
  });

  it("blocks the loop after MaxRetries instead of retrying indefinitely", () => {
    let state = normalizeGodmodeV5State(
      { Phase: "Implementation", Status: "InProgress", MaxRetries: 2, Attempt: 0 },
      { now: fixedNow }
    );
    state = recordGodmodeV5Attempt(state, { now: fixedNow });
    state = recordGodmodeV5Attempt(state, { now: fixedNow });
    state = recordGodmodeV5Attempt(state, { now: fixedNow });

    expect(state.Attempt).toBe(3);
    expect(state.Status).toBe("Blocked");
    expect(state.AbortRequired).toBe(true);
    expect(() => advanceGodmodeV5State(state, { now: fixedNow })).toThrow("phase_blocked");
  });
});

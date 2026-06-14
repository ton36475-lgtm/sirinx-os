import { X_AI_ACCOUNTS, X_AI_RADAR_POLICY, validateXAccounts } from "../packages/content-factory/src/intelligence/xAccounts.mjs";
import { buildWeeklyRadar } from "../packages/content-factory/src/intelligence/weeklyRadar.mjs";

const validation = validateXAccounts(X_AI_ACCOUNTS);
const radar = buildWeeklyRadar({
  weekOf: "2026-05-25",
  observations: [
    {
      sourceHandle: "@karpathy",
      sourceUrl: "https://x.com/karpathy",
      title: "Manual seed validation",
      summary: "AI workflow and developer tooling inspiration only."
    }
  ]
});

const result = {
  ok: validation.ok && radar.ok && X_AI_RADAR_POLICY.automationAllowed === false,
  accountCount: validation.count,
  automationAllowed: X_AI_RADAR_POLICY.automationAllowed,
  privateDataAllowed: X_AI_RADAR_POLICY.privateDataAllowed,
  directPostCopyAllowed: X_AI_RADAR_POLICY.directPostCopyAllowed,
  endorsementClaimAllowed: X_AI_RADAR_POLICY.endorsementClaimAllowed,
  sampleSignals: radar.observations[0]?.classification.signalTypes || [],
  findings: [...validation.findings, ...radar.findings],
  guardrail: "local-only; public seed registry only; no scraping, no X API, no private data, no impersonation"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}

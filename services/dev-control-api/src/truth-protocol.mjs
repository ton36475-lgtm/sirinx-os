export const claimStates = ["observed", "template", "blocked", "not_run"];

export function classifyTruthState(input = {}) {
  if (input.blocked) return "blocked";
  if (input.template) return "template";
  if (input.observed) return "observed";
  return "not_run";
}

export function getTruthProtocolStatus() {
  return {
    status: "local-truth-protocol-ready",
    mode: "local-only-reporting-contract",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    claimStates,
    reportRules: [
      {
        id: "local-command-output",
        label: "Local command output",
        requiredState: "observed",
        rule: "Only report command output as real when it was gathered in the current local run."
      },
      {
        id: "report-template",
        label: "Report templates",
        requiredState: "template",
        rule: "Use placeholders for layouts that have not been populated by a local collector."
      },
      {
        id: "external-gate",
        label: "External gates",
        requiredState: "blocked",
        rule: "External sends, connector writes, real MCP, paid APIs, deploys, pushes, and publishes stay blocked until exact approval."
      },
      {
        id: "telegram-delivery",
        label: "Telegram delivery",
        requiredState: "observed",
        rule: "Do not claim Telegram delivery unless a gated send was approved and the delivery result was observed."
      }
    ],
    corrections: [
      "Codex can inspect local files and run local commands in this workspace.",
      "Codex must still not send Telegram, activate connectors, run real MCP, deploy, push, publish, call paid APIs, or read/print secrets without exact approval.",
      "SOC reports must separate observed host metrics from message templates and blocked delivery paths."
    ],
    stopPoint: "TRUTH PROTOCOL READY — LOCAL ONLY — WAITING FOR IMPLEMENTATION APPROVAL"
  };
}

import {
  POLICY_CORE_VERSION,
  evaluatePolicy,
  summarizePolicyDecision
} from "../../../packages/policy-core/src/index.mjs";

const policySamples = [
  {
    id: "local-doc-write",
    label: "Local documentation update",
    action: {
      id: "local-doc-write",
      type: "local-doc-write",
      target: "docs/knowledge/SIRINX_PLAN.md",
      paths: ["docs/knowledge/SIRINX_PLAN.md"]
    }
  },
  {
    id: "cloudflare-main-router-deploy",
    label: "Cloudflare main-router deploy",
    action: {
      id: "cloudflare-main-router-deploy",
      type: "cloudflare-deploy",
      target: "cloudflare:main-router",
      externalWrite: true,
      productionWrite: true
    }
  },
  {
    id: "telegram-smoke-send",
    label: "Telegram smoke send",
    action: {
      id: "telegram-smoke-send",
      type: "telegram-send",
      target: "telegram:approved-recipient-required",
      customerVisible: true
    }
  },
  {
    id: "solis-readonly-telemetry",
    label: "Solis read-only telemetry",
    action: {
      id: "solis-readonly-telemetry",
      type: "solis-telemetry-read",
      target: "solis:site-mapping-required",
      readOnly: true,
      evidence: {
        consent: false,
        credentialStorage: false,
        stationMapping: false
      }
    }
  },
  {
    id: "secret-file-read",
    label: "Secret value read",
    action: {
      id: "secret-file-read",
      type: "local-review",
      target: ".env",
      readsSecretValues: true
    }
  }
];

function countByDecision(decisions) {
  return decisions.reduce(
    (summary, item) => {
      summary[item.decision] = (summary[item.decision] || 0) + 1;
      return summary;
    },
    {
      allowed: 0,
      approval_required: 0,
      blocked: 0
    }
  );
}

export function getPolicyCoreStatus() {
  const decisions = policySamples.map((sample) => {
    const decision = evaluatePolicy(sample.action);

    return {
      id: sample.id,
      label: sample.label,
      ...summarizePolicyDecision(decision)
    };
  });

  return {
    status: "local-policy-engine-ready",
    mode: "read-only-decision-contract",
    policyVersion: POLICY_CORE_VERSION,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    summary: {
      samples: decisions.length,
      ...countByDecision(decisions),
      externalWrites: decisions.some((item) => item.externalWrites)
    },
    decisions,
    nextActions: [
      "Use policy-core as the local gate evaluator for Hermes and Command Center actions.",
      "Keep external actions in approval_required or blocked state until exact target evidence exists.",
      "Do not pass secret values into policy-core; pass only boolean evidence flags and target identifiers."
    ],
    updatedAt: new Date().toISOString()
  };
}

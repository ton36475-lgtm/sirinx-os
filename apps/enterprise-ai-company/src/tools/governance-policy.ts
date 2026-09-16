import { createTool } from "@voltagent/core";
import { z } from "zod";
import { PUBLIC_COMPANY_APPROVAL_RULES } from "../company/org-chart";

const blockedActions = [
  "push",
  "deploy",
  "install",
  "provider_call",
  "secret_read",
  "dns_change",
  "public_publish",
  "quotation_send",
] as const;

const blockedKeywords = [
  "push",
  "deploy",
  "install",
  "provider",
  "secret",
  "dns",
  "publish",
  "quotation",
] as const;

export const governancePolicyTool = createTool({
  name: "governance_policy",
  description: "Classify an action by approval tier and explain whether it is blocked.",
  parameters: z.object({
    action: z.enum(blockedActions).or(z.string()).describe("Action to classify."),
  }),
  execute: async ({ action }) => {
    const normalized = action.trim().toLowerCase().replace(/[-\s]+/g, "_");
    const isBlocked = blockedKeywords.some((keyword) => normalized.includes(keyword));
    const tier =
      normalized.includes("secret") || normalized.includes("dns") || normalized.includes("deploy")
        ? "L3_SENSITIVE"
        : normalized.includes("publish") || normalized.includes("quotation") || normalized.includes("provider")
          ? "L2_PUBLIC"
          : "L1_INTERNAL_WRITE";

    return {
      action,
      blockedByDefault: isBlocked,
      requiredApprovalTier: tier,
      allowedExamples: PUBLIC_COMPANY_APPROVAL_RULES[tier],
      policy:
        "Drafts and local records are allowed; public, production, financial, provider, and secret actions require explicit owner approval.",
    };
  },
});

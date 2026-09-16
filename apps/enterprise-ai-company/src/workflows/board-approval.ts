import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const approvalTierSchema = z.enum(["L0_READ", "L1_INTERNAL_WRITE", "L2_PUBLIC", "L3_SENSITIVE"]);

export const boardApprovalWorkflow = createWorkflowChain({
  id: "public-company-approval-gate",
  name: "Public Company Approval Gate",
  purpose: "Route enterprise AI company decisions through public-company-style approval tiers.",
  input: z.object({
    requesterRoleId: z.string(),
    action: z.string(),
    approvalTier: approvalTierSchema,
    businessReason: z.string(),
  }),
  result: z.object({
    status: z.enum(["approved_for_draft", "requires_owner_approval", "rejected"]),
    approvalTier: approvalTierSchema,
    approvedBy: z.string(),
    nextAction: z.string(),
  }),
})
  .andThen({
    id: "classify-approval-need",
    resumeSchema: z.object({
      ownerApproved: z.boolean(),
      approverRoleId: z.string(),
      comments: z.string().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return {
          ...data,
          ownerApproved: resumeData.ownerApproved,
          approverRoleId: resumeData.approverRoleId,
          comments: resumeData.comments,
        };
      }

      if (data.approvalTier === "L2_PUBLIC" || data.approvalTier === "L3_SENSITIVE") {
        await suspend("Owner approval required before public, production, or sensitive action.", {
          requesterRoleId: data.requesterRoleId,
          action: data.action,
          approvalTier: data.approvalTier,
          businessReason: data.businessReason,
        });

        return {
          ...data,
          ownerApproved: false,
          approverRoleId: "pending_owner_approval",
        };
      }

      return {
        ...data,
        ownerApproved: true,
        approverRoleId: "system_local_draft_gate",
      };
    },
  })
  .andThen({
    id: "finalize-decision",
    execute: async ({ data }) => {
      const needsOwner = data.approvalTier === "L2_PUBLIC" || data.approvalTier === "L3_SENSITIVE";
      const approved = data.ownerApproved === true;

      return {
        status: needsOwner && !approved ? "requires_owner_approval" : "approved_for_draft",
        approvalTier: data.approvalTier,
        approvedBy: data.approverRoleId,
        nextAction: needsOwner
          ? "Create an approval packet and stop before execution."
          : "Proceed with local draft or internal record only.",
      };
    },
  });

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { ENTERPRISE_AI_COMPANY_ROLES } from "../company/org-chart";

export const companyDirectoryTool = createTool({
  name: "company_directory",
  description: "Find public-company-style AI company roles by division, title, or approval tier.",
  parameters: z.object({
    query: z.string().optional().describe("Role title, Thai title, division, or keyword."),
    approvalTier: z.enum(["L0_READ", "L1_INTERNAL_WRITE", "L2_PUBLIC", "L3_SENSITIVE"]).optional(),
  }),
  execute: async ({ query, approvalTier }) => {
    const normalizedQuery = query?.trim().toLowerCase();
    const roles = ENTERPRISE_AI_COMPANY_ROLES.filter((role) => {
      const matchesTier = approvalTier ? role.approvalTier === approvalTier : true;
      if (!normalizedQuery) return matchesTier;

      const searchable = [
        role.id,
        role.title,
        role.thaiTitle,
        role.division,
        role.layer,
        role.reportsTo ?? "",
        role.responsibilities.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesTier && searchable.includes(normalizedQuery);
    });

    return {
      count: roles.length,
      roles,
    };
  },
});

import { Agent } from "@voltagent/core";
import { companyDirectoryTool } from "../tools/company-directory";
import { governancePolicyTool } from "../tools/governance-policy";
import { ENTERPRISE_AI_COMPANY_ROLES, type CompanyRole } from "./org-chart";

export function buildRoleInstructions(role: CompanyRole): string {
  return [
    `You are ${role.title} (${role.thaiTitle}) in the SIRINX Enterprise AI Company.`,
    `Division: ${role.division}. Approval tier: ${role.approvalTier}.`,
    "Operate Thai-first, concise for status, detailed for architecture and governance.",
    "Do not self-approve public, financial, security, legal, deployment, provider, or secret actions.",
    "Separate priority actions from optional ideas and protect the founder from scope creep.",
    `Responsibilities: ${role.responsibilities.join(", ")}.`,
  ].join("\n");
}

export function createCompanyAgent(role: CompanyRole, model: string): Agent {
  return new Agent({
    name: role.title,
    instructions: buildRoleInstructions(role),
    model,
    tools: [companyDirectoryTool, governancePolicyTool],
  });
}

export function createEnterpriseCompanyAgents(model: string): Record<string, Agent> {
  return Object.fromEntries(
    ENTERPRISE_AI_COMPANY_ROLES.map((role) => [role.id, createCompanyAgent(role, model)]),
  );
}

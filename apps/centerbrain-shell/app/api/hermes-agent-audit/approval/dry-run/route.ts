import { NextResponse } from "next/server";
import { buildCenterBrainApiUrl } from "../../../../../src/lib/centerbrain-client";

export const dynamic = "force-dynamic";

const blockedApprovalResponse = {
  status: "hermes-agent-audit-shell-approval-blocked",
  commandExecuted: false,
  gatewayRestarted: false,
  messageSent: false,
  secretsRead: false,
  canRestartGateway: false,
  canSendMessages: false,
  canRunMcp: false,
  requiresHumanApproval: true,
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ...blockedApprovalResponse,
        status: "invalid_hermes_agent_audit_shell_approval_request",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      buildCenterBrainApiUrl("/api/hermes-agent-audit/approval/dry-run"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const data: unknown = await response.json();

    return NextResponse.json(
      {
        ...blockedApprovalResponse,
        ...(typeof data === "object" && data !== null ? data : {}),
        commandExecuted: false,
        gatewayRestarted: false,
        messageSent: false,
        secretsRead: false,
        canRestartGateway: false,
        canSendMessages: false,
        canRunMcp: false,
        requiresHumanApproval: true,
      },
      { status: response.ok ? 200 : response.status },
    );
  } catch {
    return NextResponse.json(blockedApprovalResponse, { status: 200 });
  }
}

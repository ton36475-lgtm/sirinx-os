import { NextResponse } from "next/server";
import { buildCenterBrainApiUrl } from "../../../../../src/lib/centerbrain-client";

export const dynamic = "force-dynamic";

const blockedDryRunResponse = {
  status: "centerbrain-shell-dry-run-proxy-blocked",
  commandExecuted: false,
  canExecuteCommands: false,
  canActivateConnectors: false,
  canRunMcp: false,
  canDeploy: false,
  requiresHumanApproval: true,
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ...blockedDryRunResponse,
        status: "invalid_centerbrain_shell_dry_run_request",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(buildCenterBrainApiUrl("/api/centerbrain-hub/sync/dry-run"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data: unknown = await response.json();
    return NextResponse.json(
      {
        ...blockedDryRunResponse,
        ...(typeof data === "object" && data !== null ? data : {}),
        commandExecuted: false,
        canExecuteCommands: false,
        canActivateConnectors: false,
        canRunMcp: false,
        canDeploy: false,
        requiresHumanApproval: true,
      },
      { status: response.ok ? 200 : response.status },
    );
  } catch {
    return NextResponse.json(blockedDryRunResponse, { status: 200 });
  }
}

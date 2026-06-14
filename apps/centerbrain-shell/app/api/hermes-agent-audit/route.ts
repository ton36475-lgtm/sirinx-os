import { NextResponse } from "next/server";
import {
  hermesAgentAuditFallback,
  proxyHermesAgentAuditStatus,
} from "../../../src/lib/hermes-agent-audit-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await proxyHermesAgentAuditStatus(), { status: 200 });
  } catch {
    return NextResponse.json(hermesAgentAuditFallback, { status: 200 });
  }
}

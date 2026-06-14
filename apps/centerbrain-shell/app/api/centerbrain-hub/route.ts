import { NextResponse } from "next/server";
import { buildCenterBrainApiUrl, centerBrainShellFallback, normalizeCenterBrainStatus } from "../../../src/lib/centerbrain-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(buildCenterBrainApiUrl("/api/centerbrain-hub"), {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(centerBrainShellFallback, { status: 200 });
    }

    const data: unknown = await response.json();
    return NextResponse.json(normalizeCenterBrainStatus(data), { status: 200 });
  } catch {
    return NextResponse.json(centerBrainShellFallback, { status: 200 });
  }
}

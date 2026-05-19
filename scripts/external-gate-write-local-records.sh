#!/usr/bin/env bash
set -euo pipefail

ROOT="${SIRINX_PROJECT_ROOT:-/Users/sirinx/sirinx-os}"

cd "$ROOT"

node --input-type=module <<'NODE'
import { writeExternalGatePackets } from "./services/dev-control-api/src/external-gate-packets.mjs";
import { writeExternalGatePreflight } from "./services/dev-control-api/src/external-gate-preflight.mjs";

const packet = await writeExternalGatePackets({ confirmLocalWrite: true });
const preflight = await writeExternalGatePreflight({ confirmLocalWrite: true });

const output = {
  status: "written-local-external-gate-records",
  externalWrites: false,
  productionWrites: false,
  records: [
    {
      type: "approval-packets",
      status: packet.status,
      targetPath: packet.targetPath,
      externalWrites: packet.externalWrites
    },
    {
      type: "audit-preflight",
      status: preflight.status,
      targetPath: preflight.targetPath,
      externalWrites: preflight.externalWrites
    }
  ]
};

console.log(JSON.stringify(output, null, 2));
NODE

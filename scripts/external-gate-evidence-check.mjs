import { getExternalGateEvidenceStatus } from "../services/dev-control-api/src/external-gate-evidence.mjs";

const status = await getExternalGateEvidenceStatus();

console.log(JSON.stringify(status, null, 2));

if (status.summary.unsafe > 0) {
  process.exit(1);
}

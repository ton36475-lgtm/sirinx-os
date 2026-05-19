import { getExternalGateRunnerStatus } from "../services/dev-control-api/src/external-gate-runner.mjs";

const status = await getExternalGateRunnerStatus();

console.log(JSON.stringify(status, null, 2));

if (status.summary.unsafe > 0) {
  process.exit(1);
}

import { getPendingWorkLedger } from "../services/dev-control-api/src/pending-work.mjs";

const ledger = await getPendingWorkLedger();

console.log(JSON.stringify(ledger, null, 2));

if (ledger.summary.unsafeEvidence > 0) {
  process.exit(1);
}

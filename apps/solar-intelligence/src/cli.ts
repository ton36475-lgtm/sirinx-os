import { designCommercialBessSystem, generateSolarProposal } from "./domain/index.js";
import { syncCommercialBessToObsidian, syncProposalToObsidian } from "./obsidian/markdown.js";

const command = process.argv[2] || "proposal";

if (command === "proposal") {
  console.log(JSON.stringify(generateSolarProposal(), null, 2));
} else if (command === "obsidian:sync") {
  const proposal = generateSolarProposal();
  const files = await syncProposalToObsidian(proposal);
  console.log(JSON.stringify({ ok: true, files }, null, 2));
} else if (command === "ci-bess") {
  console.log(JSON.stringify(designCommercialBessSystem(), null, 2));
} else if (command === "ci-bess:obsidian:sync") {
  const design = designCommercialBessSystem();
  const files = await syncCommercialBessToObsidian(design);
  console.log(JSON.stringify({ ok: true, files }, null, 2));
} else {
  console.error("Usage: pnpm proposal | pnpm obsidian:sync | pnpm ci-bess | pnpm ci-bess:obsidian:sync");
  process.exitCode = 2;
}

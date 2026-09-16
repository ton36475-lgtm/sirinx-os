import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const requiredFiles = [
  "docs/reverse_engineering/GHOSTCLAW_REVERSE_ENGINEERING_BUILD_PACKET.md",
  "docs/reverse_engineering/build_packet.template.md",
  "docs/reverse_engineering/build_packet.template.yaml",
  "docs/specs/reverse-engineering-workflow/SPEC_TEMPLATE.md",
  "docs/reverse_engineering/adr_template.md",
  "docs/reverse_engineering/validation_checklist.md",
  "docs/reverse_engineering/receipt_template.json",
  "docs/reverse_engineering/handoff_protocol.md",
  "openspec/changes/reverse-engineering-workflow/proposal.md",
  "openspec/changes/reverse-engineering-workflow/design.md",
  "openspec/changes/reverse-engineering-workflow/tasks.md"
];
const requiredFlow = [
  "Source",
  "Verify",
  "Reverse_Engineer",
  "Spec",
  "Architecture",
  "Knowledge_Vault",
  "Build_Packet",
  "Validate",
  "Receipt",
  "Handoff"
];
const riskyInstructionPatterns = [
  /how to exploit/i,
  /bypass cloudflare/i,
  /stealth scraping/i,
  /credential extraction steps/i,
  /collect credentials/i,
  /dump private data/i
];

async function readRepoFile(path) {
  return readFile(resolve(repoRoot, path), "utf8");
}

export async function validateReverseEngineeringPacket() {
  const failures = [];
  const contents = [];

  for (const file of requiredFiles) {
    try {
      contents.push([file, await readRepoFile(file)]);
    } catch {
      failures.push(`missing_file_${file}`);
    }
  }

  const allText = contents.map(([, text]) => text).join("\n");
  for (const phase of requiredFlow) {
    if (!allText.includes(phase)) failures.push(`missing_flow_phase_${phase}`);
  }
  for (const pattern of riskyInstructionPatterns) {
    if (pattern.test(allText)) failures.push(`risky_instruction_${pattern.source}`);
  }
  for (const required of ["Allowed files", "Forbidden files", "Validation commands", "Receipt", "Handoff"]) {
    if (!allText.includes(required)) failures.push(`missing_build_packet_field_${required}`);
  }
  if (!allText.includes("No unauthorized third-party scanning")) failures.push("missing_no_unauthorized_scanning_policy");
  if (!allText.includes("No customer data")) failures.push("missing_no_customer_data_policy");

  return {
    packet: "A2A2A-P054-RESEARCH-REVERSE-ENGINEERING-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    required_files: requiredFiles,
    required_flow: requiredFlow,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validateReverseEngineeringPacket();
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.failures.length > 0) process.exit(1);
}

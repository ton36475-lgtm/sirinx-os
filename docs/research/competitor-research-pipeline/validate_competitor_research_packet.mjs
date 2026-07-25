import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const baseDir = resolve(repoRoot, "docs/research/competitor-research-pipeline");

export async function validateCompetitorResearchPacket(root = repoRoot) {
  const base = resolve(root, "docs/research/competitor-research-pipeline");
  const requiredFiles = [
    "README.md",
    "source_selection_checklist.md",
    "scoring_matrix_template.csv",
    "swot_template.md",
    "sample_build_packet.md"
  ];
  const failures = [];
  for (const file of requiredFiles) {
    if (!existsSync(resolve(base, file))) failures.push(`missing_${file}`);
  }

  const readme = await readFile(resolve(base, "README.md"), "utf8");
  const checklist = await readFile(resolve(base, "source_selection_checklist.md"), "utf8");
  const scoring = await readFile(resolve(base, "scoring_matrix_template.csv"), "utf8");
  const swot = await readFile(resolve(base, "swot_template.md"), "utf8");
  const buildPacket = await readFile(resolve(base, "sample_build_packet.md"), "utf8");
  const specPath = resolve(root, "openspec/competitor-research-pipeline/spec.md");
  const spec = existsSync(specPath) ? await readFile(specPath, "utf8") : "";

  const requiredColumns = [
    "competitor",
    "source_url_or_note",
    "capture_date",
    "reliability",
    "feature_depth_score",
    "pricing_clarity_score",
    "positioning_score",
    "total_score",
    "next_action"
  ];
  for (const column of requiredColumns) {
    if (!scoring.split("\n")[0].includes(column)) failures.push(`missing_scoring_column_${column}`);
  }

  const requiredSwot = ["## Strengths", "## Weaknesses", "## Opportunities", "## Threats"];
  for (const section of requiredSwot) {
    if (!swot.includes(section)) failures.push(`missing_swot_section_${section}`);
  }

  const safetyPhrases = [
    "Public sources only",
    "No unauthorized third-party scanning",
    "No credential",
    "No de-anonymization"
  ];
  for (const phrase of safetyPhrases) {
    if (!readme.includes(phrase) && !checklist.includes(phrase) && !buildPacket.includes(phrase) && !spec.includes(phrase)) {
      failures.push(`missing_safety_phrase_${phrase}`);
    }
  }

  const buildPacketSections = ["## Research Summary", "## Scoring Snapshot", "## Strategy Readout", "## Build Packet"];
  for (const section of buildPacketSections) {
    if (!buildPacket.includes(section)) failures.push(`missing_build_packet_section_${section}`);
  }

  return {
    packet: "A2A2A-P050-COMPETITOR-RESEARCH-PIPELINE-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    required_files: requiredFiles,
    required_columns: requiredColumns,
    failures
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validateCompetitorResearchPacket();
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.status !== "PASS") process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

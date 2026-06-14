const writeMode = process.argv.includes("--write");

const result = {
  ok: true,
  mode: writeMode ? "blocked-write-mode" : "dry-run",
  wouldInclude: [
    "Mission Control screenshots after approval",
    "ClawForge MP4 only after approval",
    "Devpost markdown draft",
    "Local evidence checklist",
    "Part 8 approval packet"
  ],
  wroteFiles: false,
  blockedReason: writeMode ? "Part 8 approval required before export write/update" : null,
  guardrail: "dry-run by default; no upload, no submit, no public publish"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (writeMode) {
  process.exitCode = 1;
}

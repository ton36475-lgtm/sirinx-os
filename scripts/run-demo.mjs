import { buildWeeklyRadar } from "../packages/content-factory/src/intelligence/weeklyRadar.mjs";

const radar = buildWeeklyRadar({
  weekOf: "2026-05-25",
  observations: [
    {
      sourceHandle: "@levelsio",
      sourceUrl: "https://x.com/levelsio",
      title: "Manual product-shipping inspiration",
      summary: "Use as high-level product shipping signal only; do not copy text or claim endorsement."
    }
  ]
});

const result = {
  ok: radar.ok,
  mode: "local-demo-dry-run",
  radarPreview: {
    weekOf: radar.weekOf,
    observationCount: radar.observations.length,
    sampleSignals: radar.observations[0]?.classification.signalTypes || []
  },
  generatedMedia: false,
  externalCalls: false,
  guardrail: "demo dry-run only; no publish, upload, scrape, paid API, or external connector"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}

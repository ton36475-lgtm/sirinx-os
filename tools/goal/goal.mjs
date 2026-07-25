#!/usr/bin/env node
// /goal — end-to-end spec-driven orchestrator.
//
//   node tools/goal/goal.mjs --name <spec-name> --goal "<statement>" [--dry-run]
//
// Produces the house spec set under docs/specs/<name>/ by driving the local
// coding CLIs, then has a *different* lane review each document. Nothing
// approves its own work — that is the one rule this tool exists to enforce.
//
// Governance, in the order it bites:
//   • TRIAGE classifies the goal. A 🔴 classification stops the run: RED advances
//     only through the structural human gate, never through an orchestrator.
//   • MAKER drafts each document. CHECKER reviews it on a different lane.
//   • Every outbound prompt passes the egress redaction gate first.
//   • Quota exhaustion falls through to the next lane; a fault does not.
//   • Every lane call writes a hash-chained receipt.
//
// Dependency-free: Node builtins only, matching the rest of this repo.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { LANES, runLane, usableLanes } from "./lanes.mjs";
import { ReceiptLog, redactionHit, signalsExhaustion } from "./guards.mjs";

const REPO = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

/** The house spec set — matches the five existing folders under docs/specs/. */
const DOCS = [
  { file: "BRD.md", title: "Business Requirements", ask: "the business problem, who has it, what success looks like, and what is explicitly out of scope" },
  { file: "FRD.md", title: "Functional Requirements", ask: "the concrete behaviours to build, each one testable, with the edge cases named" },
  { file: "DATA_CONTRACT.md", title: "Data Contract", ask: "every field that crosses a boundary: name, type, required, source of truth, and what happens when it is missing" },
  { file: "TEST_CASES.md", title: "Test Cases", ask: "the cases that would catch a regression, including the failure paths, each with its expected observable result" },
  { file: "ROLLBACK_PLAN.md", title: "Rollback Plan", ask: "how to undo this safely: the trigger to roll back, the exact steps, and what cannot be undone" },
];

// ─── args ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { dryRun: false, maker: null, checker: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--dry-run") a.dryRun = true;
    else if (k === "--name") a.name = argv[++i];
    else if (k === "--goal") a.goal = argv[++i];
    else if (k === "--maker") a.maker = argv[++i];
    else if (k === "--checker") a.checker = argv[++i];
    else if (k === "--receipts") a.receipts = argv[++i];
    else {
      console.error(`unknown argument: ${k}`);
      process.exit(2);
    }
  }
  return a;
}

function loadSecrets() {
  const envPath = join(REPO, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m && m[2].trim()) out[m[1]] = m[2];
  }
  return out;
}

// ─── lane dispatch with exhaustion fallthrough ───────────────────────────────

/**
 * Try `order` in sequence. Quota exhaustion moves to the next lane; a plain
 * fault also moves on but is logged differently, because the two mean different
 * things when you read the receipts back.
 */
async function dispatch({ order, prompt, stage, secrets, receipts, cwd }) {
  const hit = redactionHit(prompt);
  if (hit) {
    receipts.append({ lane: "-", stage, outcome: "denied_redaction" });
    throw new Error(`DENIED by egress redaction gate: matched ${hit}`);
  }

  let lastErr = null;
  for (const lane of order) {
    if (LANES[lane]?.status === "gui-only") continue;
    process.stderr.write(`  → ${stage} via ${lane}\n`);

    const r = await runLane(lane, { prompt, cwd }, secrets);
    const combined = `${r.stdout}\n${r.stderr}`;

    if (signalsExhaustion(combined)) {
      receipts.append({ lane, stage, latency_ms: r.ms, outcome: "exhausted" });
      process.stderr.write(`    quota exhausted on ${lane}, falling through\n`);
      lastErr = new Error(`${lane}: quota exhausted`);
      continue;
    }
    if (!r.ok || !r.stdout) {
      receipts.append({ lane, stage, latency_ms: r.ms, outcome: "error" });
      process.stderr.write(`    ${lane} failed (exit ${r.code})\n`);
      lastErr = new Error(`${lane}: ${r.stderr || `exit ${r.code}`}`);
      continue;
    }

    receipts.append({ lane, stage, latency_ms: r.ms, outcome: "ok" });
    return { lane, text: r.stdout, ms: r.ms };
  }
  throw lastErr ?? new Error(`no lane could serve ${stage}`);
}

// ─── prompts ─────────────────────────────────────────────────────────────────

const triagePrompt = (goal) => `Classify this engineering goal by risk.

GOAL: ${goal}

Answer with exactly one line, nothing else:
RISK=GREEN, RISK=YELLOW, or RISK=RED

RED means the work would deploy to production, delete data, spend money, publish
publicly, change DNS, or touch billing. YELLOW means it changes shipped behaviour
but is reversible. GREEN means it is local, additive, and reversible.`;

const makerPrompt = (goal, doc) => `Write the ${doc.title} document for this goal.

GOAL: ${goal}

Cover ${doc.ask}.

Output Markdown only — no preamble, no closing commentary. Start with a level-1
heading. Where a fact is not established, write "UNKNOWN — needs confirmation"
rather than inventing it. Do not invent numbers, dates, file paths, or names.`;

const checkerPrompt = (doc, text) => `Review this ${doc.title} document. You did not write it.

---
${text}
---

Reply with exactly one line, then nothing else:
VERDICT=PASS  — if it is specific, internally consistent, and invents nothing
VERDICT=FAIL: <one sentence naming the single worst problem>

Fail it for invented facts, for vagueness that cannot be tested, or for
contradicting itself. Do not fail it for style.`;

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  if (!args.name || !args.goal) {
    console.error(
      'usage: node tools/goal/goal.mjs --name <spec-name> --goal "<statement>" [--dry-run]\n' +
        "       [--maker <lane>] [--checker <lane>] [--receipts <path>]"
    );
    process.exit(2);
  }

  const usable = usableLanes();
  const maker = args.maker ?? usable[0];
  const checker = args.checker ?? usable.find((l) => l !== maker) ?? null;

  const outDir = join(REPO, "docs", "specs", args.name);
  const receiptPath = args.receipts ?? join(REPO, ".ghostclaw_runtime", "receipts", "goal.jsonl");

  console.log(`goal   : ${args.goal}`);
  console.log(`spec   : docs/specs/${args.name}/`);
  console.log(`lanes  : usable=[${usable.join(", ")}]  maker=${maker}  checker=${checker ?? "NONE"}`);
  for (const [n, l] of Object.entries(LANES)) {
    if (l.status !== "ok") console.log(`         ${n}: ${l.status} — ${l.note}`);
  }

  if (!checker) {
    console.error(
      "\nrefusing to run: only one usable lane, so nothing could review the drafts.\n" +
        "An orchestrator that lets one lane approve its own work is worse than no orchestrator."
    );
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("\n--dry-run: plan only, no lane calls, no files written\n");
    console.log(`  TRIAGE  ${maker}`);
    for (const d of DOCS) console.log(`  MAKER   ${maker} → ${d.file}   CHECKER ${checker}`);
    console.log(`  GUARD   receipts → ${receiptPath}`);
    return;
  }

  const secrets = loadSecrets();
  const receipts = new ReceiptLog(receiptPath);

  // ── TRIAGE ──
  console.log("\n[TRIAGE]");
  const triage = await dispatch({
    order: [maker, ...usable.filter((l) => l !== maker)],
    prompt: triagePrompt(args.goal),
    stage: "triage",
    secrets,
    receipts,
    cwd: REPO,
  });
  const risk = (triage.text.match(/RISK=(GREEN|YELLOW|RED)/i) ?? [])[1]?.toUpperCase() ?? "UNKNOWN";
  console.log(`  risk = ${risk}  (${triage.lane})`);

  if (risk === "RED") {
    receipts.append({ lane: triage.lane, stage: "guard", outcome: "breaker_open" });
    console.error(
      "\n🔴 RED — stopping. This goal needs the human gate; an orchestrator must not\n" +
        "advance it. Nothing was written. Route it through Hermes approve or a\n" +
        "whitelisted Telegram callback."
    );
    process.exit(3);
  }
  if (risk === "UNKNOWN") {
    console.error(`\nrefusing to run: triage did not classify the goal (got: ${triage.text.slice(0, 120)})`);
    process.exit(1);
  }

  // ── MAKER + CHECKER ──
  mkdirSync(outDir, { recursive: true });
  const results = [];

  for (const doc of DOCS) {
    console.log(`\n[${doc.file}]`);
    const draft = await dispatch({
      order: [maker, ...usable.filter((l) => l !== maker)],
      prompt: makerPrompt(args.goal, doc),
      stage: `maker:${doc.file}`,
      secrets,
      receipts,
      cwd: REPO,
    });

    // The reviewer must not be the author. That is the whole point.
    const reviewOrder = usable.filter((l) => l !== draft.lane);
    const review = await dispatch({
      order: [checker, ...reviewOrder].filter((l, i, a) => a.indexOf(l) === i && l !== draft.lane),
      prompt: checkerPrompt(doc, draft.text),
      stage: `checker:${doc.file}`,
      secrets,
      receipts,
      cwd: REPO,
    });

    const pass = /VERDICT=PASS/i.test(review.text);
    const reason = (review.text.match(/VERDICT=FAIL:\s*(.+)/i) ?? [])[1]?.trim() ?? "";

    const header =
      `<!-- generated by tools/goal — maker=${draft.lane} checker=${review.lane} ` +
      `risk=${risk} verdict=${pass ? "PASS" : "FAIL"} -->\n` +
      (pass ? "" : `> ⚠️ CHECKER FAILED THIS DRAFT: ${reason}\n> Treat it as an outline, not a spec.\n\n`);

    writeFileSync(join(outDir, doc.file), header + draft.text + "\n");
    results.push({ doc: doc.file, maker: draft.lane, checker: review.lane, pass, reason });
    console.log(`  ${pass ? "PASS" : "FAIL"}  maker=${draft.lane} checker=${review.lane}${reason ? ` — ${reason}` : ""}`);
  }

  // ── GUARD ──
  const failed = results.filter((r) => !r.pass);
  const chain = receipts.verify();

  console.log("\n[GUARD]");
  console.log(`  documents : ${results.length}`);
  console.log(`  passed    : ${results.length - failed.length}`);
  console.log(`  failed    : ${failed.length}`);
  console.log(`  receipts  : ${chain.ok ? `chain OK, ${chain.count} entries` : `CHAIN BROKEN at ${chain.at} (${chain.why})`}`);
  console.log(`  written   : docs/specs/${args.name}/`);

  if (failed.length) {
    console.log("\n  drafts the checker rejected:");
    for (const f of failed) console.log(`    ${f.doc}: ${f.reason}`);
  }
  console.log("\n  This is a draft spec, reviewed by machine. It is not approved work.");
  process.exit(failed.length ? 4 : 0);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});

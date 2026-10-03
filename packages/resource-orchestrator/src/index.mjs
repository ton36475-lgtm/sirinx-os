export const RESOURCE_ORCHESTRATOR_VERSION = "2026-10-04.resource-orchestrator.v1";
export const MEMORY_TIERS = Object.freeze(["register", "accelerator_memory", "ram", "local_nvme", "remote_nvme", "network"]);
export const TEMPERATURES = Object.freeze(["HOT", "WARM", "COLD", "ARCHIVE"]);
export const DEGRADATION_LEVELS = Object.freeze(["FULL", "REDUCED_CONTEXT", "LOW_CONCURRENCY", "CPU_OFFLOAD", "PERSISTENT_OFFLOAD", "QUEUE"]);

const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, n(v)));

export function classifyTemperature({ reuseProbability = 0, recencyMs = Infinity, hotMs = 5_000, warmMs = 300_000 } = {}) {
  const reuse = clamp(reuseProbability, 0, 1);
  if (reuse >= 0.75 && recencyMs <= hotMs) return "HOT";
  if (reuse >= 0.35 || recencyMs <= warmMs) return "WARM";
  if (recencyMs !== Infinity && recencyMs <= 86_400_000) return "COLD";
  return "ARCHIVE";
}

export function cacheValue({ reuseProbability = 0, latencySavedMs = 0, sizeBytes = 1, transferCostMs = 0 } = {}) {
  return (clamp(reuseProbability, 0, 1) * Math.max(0, n(latencySavedMs)) + Math.max(0, n(transferCostMs))) / Math.max(1, n(sizeBytes));
}

export function buildResourceGraph(nodes = [], edges = []) {
  const ids = new Set();
  for (const node of nodes) {
    if (!node?.id || ids.has(node.id)) throw new Error("invalid-or-duplicate-node:" + (node?.id ?? "missing"));
    ids.add(node.id);
  }
  for (const edge of edges) {
    if (!edge?.source || !edge?.target || !ids.has(edge.source) || !ids.has(edge.target)) throw new Error("invalid-edge:" + (edge?.id ?? "missing"));
  }
  return { nodes: [...nodes], edges: [...edges], nodeCount: nodes.length, edgeCount: edges.length };
}

export function bottleneckCandidates(metrics = {}) {
  const out = [];
  const add = (resource, score, reason) => out.push({ resource, score, reason });
  if (n(metrics.interconnectUtilization) >= 90) add("interconnect", n(metrics.interconnectUtilization), "high-interconnect-utilization");
  if (n(metrics.ioWait) >= 20 || n(metrics.storageQueueDepth) >= 8) add("storage", Math.max(n(metrics.ioWait), n(metrics.storageQueueDepth)), "storage-contention");
  if (n(metrics.networkUtilization) >= 90) add("network", n(metrics.networkUtilization), "high-network-utilization");
  if (n(metrics.gpuUtilization) >= 95) add("accelerator", n(metrics.gpuUtilization), "accelerator-saturation");
  if (n(metrics.cpuUtilization) >= 95) add("cpu", n(metrics.cpuUtilization), "cpu-saturation");
  return out.sort((a, b) => b.score - a.score);
}

export function criticalPathLatency(stages = []) {
  const normalized = stages.filter(Boolean).map((stage) => ({ name: String(stage.name ?? "unknown"), latencyMs: Math.max(0, n(stage.latencyMs)) }));
  return { totalMs: normalized.reduce((s, x) => s + x.latencyMs, 0), dominant: [...normalized].sort((a, b) => b.latencyMs - a.latencyMs)[0] ?? null, stages: normalized };
}

export function overlappedPipeline({ computeMs = 0, transferMs = 0, prefetchMs = 0, writebackMs = 0 } = {}) {
  const stages = [computeMs, transferMs, prefetchMs, writebackMs].map((v) => Math.max(0, n(v)));
  return { sequentialMs: stages.reduce((a, b) => a + b, 0), overlappedMs: Math.max(0, ...stages) };
}

export function recommendPlacement(item, tiers = []) {
  if (!item || !tiers.length) return { decision: "NO_PLACEMENT", reason: "missing-input" };
  const temperature = classifyTemperature(item);
  const preference = {
    HOT: ["accelerator_memory", "ram", "local_nvme", "remote_nvme", "network"],
    WARM: ["ram", "accelerator_memory", "local_nvme", "remote_nvme", "network"],
    COLD: ["local_nvme", "remote_nvme", "ram", "network", "accelerator_memory"],
    ARCHIVE: ["remote_nvme", "network", "local_nvme", "ram", "accelerator_memory"]
  }[temperature];
  const fits = tiers.filter((t) => n(t.availableBytes) >= Math.max(0, n(item.workingSetBytes)));
  if (!fits.length) return { decision: "OFFLOAD", temperature, reason: "no-tier-fits-working-set" };
  const selected = fits.find((t) => preference.includes(t.kind)) ?? fits[0];
  return { decision: "PLACE", temperature, tier: selected.kind, tierId: selected.id ?? selected.kind };
}

export function admissionCheck(required = {}, headroom = {}) {
  const ratios = Object.entries(required).map(([key, value]) => {
    const need = Math.max(0, n(value));
    const available = Math.max(0, n(headroom[key]));
    return { key, need, available, fits: need <= available, ratio: available === 0 ? Infinity : need / available };
  });
  const over = ratios.filter((x) => !x.fits);
  if (!over.length) return { decision: "ACCEPT", ratios };
  return { decision: over.some((x) => x.ratio > 2) ? "QUEUE" : "DEGRADE", ratios, over };
}

export function memoryPressureAction(usageFraction, { startEviction = 0.85, stopEviction = 0.70 } = {}) {
  const usage = clamp(usageFraction, 0, 1);
  return usage >= startEviction ? "EVICT" : usage <= stopEviction ? "KEEP" : "HOLD";
}

export function detectThrashing({ swapInRate = 0, swapOutRate = 0, ioWait = 0, throughputDelta = 0 } = {}) {
  const swap = n(swapInRate) > 0 || n(swapOutRate) > 0;
  const stressedIo = n(ioWait) >= 10;
  const throughputFalling = n(throughputDelta) < 0;
  return { thrashing: swap && stressedIo && throughputFalling, signals: { swap, stressedIo, throughputFalling } };
}

export function chooseDegradation({ memoryHeadroom = 1, computeHeadroom = 1, latencyBudgetMs = Infinity } = {}) {
  if (memoryHeadroom >= 0.25 && computeHeadroom >= 0.25) return "FULL";
  if (memoryHeadroom >= 0.15) return "REDUCED_CONTEXT";
  if (computeHeadroom >= 0.15) return "LOW_CONCURRENCY";
  if (memoryHeadroom >= 0.08) return "CPU_OFFLOAD";
  if (latencyBudgetMs >= 5_000) return "PERSISTENT_OFFLOAD";
  return "QUEUE";
}

export function leaseStatus(lease, nowMs = Date.now()) {
  const expiresAt = n(lease?.expiresAt);
  const heartbeatAt = n(lease?.heartbeatAt);
  const ttlMs = Math.max(0, n(lease?.ttlMs));
  const heartbeatExpired = ttlMs > 0 && nowMs - heartbeatAt > ttlMs;
  const expired = expiresAt > 0 ? nowMs >= expiresAt : heartbeatExpired;
  return { state: expired ? "EXPIRED" : "ACTIVE", expired, expiresAt, heartbeatExpired };
}

export function makeBenchmarkCapsule(input = {}) {
  const required = ["os", "runtime", "framework", "model", "quantization", "context", "batch", "concurrency", "topology", "configuration", "gitCommit"];
  const missing = required.filter((k) => input[k] === undefined || input[k] === null || input[k] === "");
  return { benchmarkId: String(input.benchmarkId || ("bench-" + Date.now())), reproducible: missing.length === 0, missing, capsule: { ...input } };
}

export function makeResourceReceipt({ workload, device, configuration, baseline = {}, candidate = {}, conditions = {}, evidence = [], decision = "hold" }) {
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(candidate)])].filter((k) => Number.isFinite(Number(baseline[k])) && Number.isFinite(Number(candidate[k])));
  return { schemaVersion: 1, createdAt: new Date().toISOString(), workload, device, configuration, baseline, candidate, delta: Object.fromEntries(keys.map((k) => [k, n(candidate[k]) - n(baseline[k])])), conditions, evidence, decision };
}

export function rankCandidates(pairwise = []) {
  const ids = [...new Set(pairwise.flatMap((r) => [r?.a, r?.b]).filter(Boolean))];
  const stats = Object.fromEntries(ids.map((id) => [id, { wins: 0, losses: 0 }]));
  for (const r of pairwise) {
    if (!stats[r.a] || !stats[r.b]) continue;
    if (r.outcome === "a") { stats[r.a].wins++; stats[r.b].losses++; }
    if (r.outcome === "b") { stats[r.b].wins++; stats[r.a].losses++; }
  }
  const ranking = ids.map((id) => {
    const s = stats[id];
    const total = s.wins + s.losses;
    const strength = (s.wins + 1) / (total + 2);
    return { id, score: strength, wins: s.wins, losses: s.losses };
  }).sort((a, b) => b.score - a.score || b.wins - a.wins || a.id.localeCompare(b.id));
  return { method: "regularized-pairwise-ranking", ranking };
}

export function promotionDecision({ smokePassed, benchmarkImproved, receiptComplete, policyAllowed, judgeRankingSignal = "neutral" } = {}) {
  if (!policyAllowed) return { decision: "BLOCK", reason: "policy-not-allowed" };
  if (!smokePassed) return { decision: "HOLD", reason: "smoke-failed" };
  if (!receiptComplete) return { decision: "HOLD", reason: "receipt-incomplete" };
  if (!benchmarkImproved) return { decision: "HOLD", reason: "independent-benchmark-not-improved" };
  return { decision: "PROMOTE", reason: "independent-evidence-passed", judgeRankingSignal };
}

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getExternalGateEvidenceStatus } from "./external-gate-evidence.mjs";
import { classifyTruthState } from "./truth-protocol.mjs";

const projectRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const defaultEvidenceRoot = path.join(projectRoot, "docs/knowledge/external-gates/evidence");
const defaultA2aRoot = path.join(projectRoot, "vault/a2a/soc");

function round(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function gb(bytes) {
  return round(bytes / 1024 / 1024 / 1024);
}

function defaultCollectors() {
  return {
    cpu: async () => ({
      percent: null,
      loadAverage: os.loadavg().map((value) => round(value))
    }),
    memory: async () => {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      return {
        usedGb: gb(used),
        totalGb: gb(total),
        percent: round((used / total) * 100, 1)
      };
    },
    disk: async () => {
      const stats = await statfs(projectRoot);
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      return {
        usedGb: gb(used),
        totalGb: gb(total),
        percent: round((used / total) * 100, 1)
      };
    },
    docker: async () => ({
      state: "not_run",
      containers: [],
      note: "Docker inspection is disabled in the local SOC checker; Ubuntu install pack can enable a read-only docker inspect collector."
    })
  };
}

async function collect(name, collector) {
  if (!collector) {
    return {
      state: "not_run",
      value: null,
      error: null
    };
  }

  try {
    return {
      state: "observed",
      value: await collector(),
      error: null
    };
  } catch (error) {
    return {
      state: "error",
      value: null,
      error: `${name}_collector_failed:${error.message}`
    };
  }
}

async function countA2aQueue(a2aRoot) {
  try {
    const files = await readdir(a2aRoot);
    return files.filter((file) => file.endsWith(".json") && file !== "latest.json").length;
  } catch {
    return 0;
  }
}

async function readTelegramEvidence(evidenceRoot) {
  const evidence = await getExternalGateEvidenceStatus({ evidenceRoot });
  const telegram =
    evidence.results.find((result) => result.id === "telegram-line-recipient-token") || {
      status: "missing-evidence",
      ready: false,
      unsafe: false,
      checkedCount: 0,
      requiredCount: 0,
      nextAction: "Create Telegram/LINE evidence file before any send."
    };

  return {
    status: telegram.unsafe
      ? "blocked-unsafe-evidence"
      : telegram.ready
        ? "ready-for-human-review"
        : "blocked-evidence-incomplete",
    readyForHumanReview: Boolean(telegram.ready),
    unsafe: Boolean(telegram.unsafe),
    canSend: false,
    checkedCount: telegram.checkedCount || 0,
    requiredCount: telegram.requiredCount || 0,
    nextAction: telegram.nextAction,
    evidenceRoot
  };
}

function truthStateFor(result) {
  return classifyTruthState({
    observed: result.state === "observed",
    blocked: result.state === "error"
  });
}

export async function getSocStatus(options = {}) {
  const target = options.target || "mac-local";
  const collectors = options.collectors || defaultCollectors();
  const evidenceRoot = options.evidenceRoot || defaultEvidenceRoot;
  const a2aRoot = options.a2aRoot || defaultA2aRoot;
  const now = options.now || (() => new Date());

  const [cpu, memory, disk, docker, telegram] = await Promise.all([
    collect("cpu", collectors.cpu),
    collect("memory", collectors.memory),
    collect("disk", collectors.disk),
    collect("docker", collectors.docker),
    readTelegramEvidence(evidenceRoot)
  ]);

  const observedMetrics = [cpu, memory, disk].filter((item) => item.state === "observed").length;
  const failedMetrics = [cpu, memory, disk, docker].filter((item) => item.state === "error");
  const status =
    failedMetrics.length > 0
      ? "error"
      : target === "ubuntu-docker" && observedMetrics === 0
        ? "not-installed"
        : "ready-local";

  return {
    title: "A2ASync-1CeoAgent SOC monitor",
    status,
    mode: "dual-target-local-only",
    target,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    snapshot: {
      timestamp: now().toISOString(),
      cpu: cpu.value,
      memory: memory.value,
      disk: disk.value,
      docker: docker.value,
      errors: failedMetrics.map((item) => item.error)
    },
    truthStates: {
      cpu: truthStateFor(cpu),
      memory: truthStateFor(memory),
      disk: truthStateFor(disk),
      docker: truthStateFor(docker),
      telegram: "blocked"
    },
    a2aQueue: {
      path: a2aRoot,
      itemCount: await countA2aQueue(a2aRoot),
      status: "local-only"
    },
    telegram,
    installPack: {
      status: "planned-local-only",
      macLocal: "validate collectors and dashboard from sirinx-os first",
      ubuntuDocker: "prepare systemd/cron install pack after local dry-run is proven",
      externalSend: "blocked until Telegram/LINE evidence and exact approval exist"
    },
    nextActions: [
      "Use `pnpm soc:check` for read-only local validation.",
      "Use `pnpm soc:dry-run` only when local JSON/A2A artifact writes are intended.",
      "Complete Telegram/LINE recipient and token evidence before any send attempt."
    ],
    stopPoint: "A2ASYNC-1CEOAGENT READY LOCAL-ONLY — TELEGRAM DELIVERY BLOCKED UNTIL APPROVAL"
  };
}

export async function writeSocDryRun(options = {}) {
  const status = await getSocStatus(options);
  const a2aRoot = options.a2aRoot || defaultA2aRoot;
  const stamp = status.snapshot.timestamp.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const latestPath = path.join(a2aRoot, "latest.json");
  const queuePath = path.join(a2aRoot, `soc-${stamp}.json`);

  await mkdir(a2aRoot, { recursive: true });
  status.a2aQueue.itemCount = (await countA2aQueue(a2aRoot)) + 1;
  const payload = `${JSON.stringify(status, null, 2)}\n`;
  await writeFile(latestPath, payload, "utf8");
  await writeFile(queuePath, payload, "utf8");

  return {
    ok: true,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    latestPath,
    queuePath,
    status
  };
}

export async function readLatestSocSnapshot(options = {}) {
  const a2aRoot = options.a2aRoot || defaultA2aRoot;
  try {
    return JSON.parse(await readFile(path.join(a2aRoot, "latest.json"), "utf8"));
  } catch {
    return null;
  }
}

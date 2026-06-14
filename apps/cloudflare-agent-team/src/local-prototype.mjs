import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF_LOCAL_AGENT_PROTOTYPE_ID = "CF_LOCAL_AGENT_PROTOTYPE_001";

export const stopBeforeCloudflareMutation = [
  "wrangler_deploy",
  "dns_edit",
  "access_policy_write",
  "secret_write",
  "d1_create",
  "r2_create",
  "queue_create",
  "vectorize_create",
  "ai_gateway_mutation",
  "remote_mcp_registration",
  "cloudflare_api_execute_mutation"
];

const requiredJobFields = [
  "job_id",
  "correlation_id",
  "type",
  "status",
  "approval_required",
  "requested_action",
  "target_environment",
  "input_path",
  "log_path"
];

const riskyActionRules = [
  ["wrangler_deploy", /\bwrangler\s+deploy\b|\bdeploy\b/i],
  ["dns_edit", /\b(dns|cname|a record|route edit|zone edit)\b/i],
  ["access_policy_write", /\b(access policy|zero trust policy|cloudflare access|mfa policy)\b/i],
  ["secret_write", /\b(secret put|create secret|write secret|token creation|api token)\b/i],
  ["d1_create", /\b(d1 create|create d1|d1 database|create database|\bd1\b)\b/i],
  ["r2_create", /\b(r2 bucket create|create r2|r2 bucket|\br2\b)\b/i],
  ["queue_create", /\b(queue create|create queue|queues create|\bqueue\b|\bqueues\b)\b/i],
  ["vectorize_create", /\b(vectorize create|create vectorize|vector database|\bvectorize\b)\b/i],
  ["ai_gateway_mutation", /\b(ai gateway|gateway mutation|model gateway)\b/i],
  ["remote_mcp_registration", /\b(remote mcp|mcp registration|register mcp)\b/i],
  ["cloudflare_api_execute_mutation", /\b(cloudflare api|execute mutation|api execute)\b/i],
  ["external_write", /\b(github|supabase|clickup|notion|telegram|line|email)\b.*\b(write|send|create|update|delete)\b/i]
];

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /cfat_[A-Za-z0-9_-]{16,}/g,
  /github_pat_[A-Za-z0-9_-]{16,}/g,
  /xai-[A-Za-z0-9_-]{16,}/g,
  /hf_[A-Za-z0-9_-]{16,}/g
];

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function redact(value) {
  return String(value ?? "").replace(
    new RegExp(secretPatterns.map((pattern) => pattern.source).join("|"), "g"),
    "<REDACTED>"
  );
}

function normalizeBoolean(value) {
  return value === true;
}

function unique(values) {
  return [...new Set(values)];
}

function detectRiskyActions(job) {
  const haystack = [
    job.requested_action,
    job.target_environment,
    job.type,
    job.input_path,
    job.log_path
  ]
    .map((value) => String(value || ""))
    .join("\n");

  return riskyActionRules
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([reason]) => reason);
}

export function createDefaultMockJob(options = {}) {
  const overrides = options.overrides || {};

  return {
    job_id: "job_20260530_cf_local_001",
    correlation_id: "corr_20260530_cf_local_001",
    type: "cloudflare_agent_team_local_prototype",
    status: "queued",
    approval_required: false,
    requested_action: "run local mock job and write local evidence packet",
    target_environment: "local-only",
    input_path: "apps/cloudflare-agent-team",
    output_summary: "",
    log_path: ".hermes/reports/CF_LOCAL_AGENT_PROTOTYPE_001_EVIDENCE.md",
    created_at: nowIso(options),
    cloudflareApiCall: false,
    externalWrite: false,
    secretRequired: false,
    ...overrides
  };
}

export function validateMockJob(job = {}) {
  const findings = [];

  if (!job || typeof job !== "object" || Array.isArray(job)) {
    return {
      ok: false,
      status: "invalid_mock_job",
      findings: ["job_object_required"],
      normalized: null
    };
  }

  for (const field of requiredJobFields) {
    if (job[field] === undefined || job[field] === null || job[field] === "") {
      findings.push(`${field}_required`);
    }
  }

  if (job.approval_required !== undefined && typeof job.approval_required !== "boolean") {
    findings.push("approval_required_must_be_boolean");
  }

  if (job.job_id && !/^job_[A-Za-z0-9_-]+$/.test(String(job.job_id))) {
    findings.push("job_id_invalid");
  }

  if (job.correlation_id && !/^corr_[A-Za-z0-9_-]+$/.test(String(job.correlation_id))) {
    findings.push("correlation_id_invalid");
  }

  if (findings.length > 0) {
    return {
      ok: false,
      status: "invalid_mock_job",
      findings,
      normalized: null
    };
  }

  return {
    ok: true,
    status: "valid_mock_job",
    findings: [],
    normalized: {
      ...job,
      approval_required: normalizeBoolean(job.approval_required),
      cloudflareApiCall: false,
      externalWrite: false,
      secretRequired: false
    }
  };
}

export class ComplianceGuardAgent {
  constructor(options = {}) {
    this.options = options;
  }

  review(job) {
    const validation = validateMockJob(job);

    if (!validation.ok) {
      return {
        status: "blocked_invalid_job",
        canProceedLocalOnly: false,
        canExecuteCloudMutation: false,
        blockedReasons: validation.findings,
        approvalRequired: true,
        cloudflareApiCall: false,
        externalWrite: false,
        reviewedAt: nowIso(this.options)
      };
    }

    const normalized = validation.normalized;
    const blockedReasons = unique([
      ...detectRiskyActions(normalized),
      ...(normalized.approval_required ? ["approval_required"] : [])
    ]);

    if (blockedReasons.length > 0) {
      return {
        status: "blocked_preapproval_required",
        canProceedLocalOnly: false,
        canExecuteCloudMutation: false,
        blockedReasons,
        approvalRequired: true,
        cloudflareApiCall: false,
        externalWrite: false,
        reviewedAt: nowIso(this.options)
      };
    }

    return {
      status: "allowed_local_only",
      canProceedLocalOnly: true,
      canExecuteCloudMutation: false,
      blockedReasons: [],
      approvalRequired: false,
      cloudflareApiCall: false,
      externalWrite: false,
      reviewedAt: nowIso(this.options)
    };
  }
}

export class EvidencePackagerAgent {
  constructor(options = {}) {
    this.options = options;
  }

  writeEvidence({ job, compliance, outputPath }) {
    const resolvedPath = outputPath || job.log_path || ".hermes/reports/CF_LOCAL_AGENT_PROTOTYPE_001_EVIDENCE.md";
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

    const evidence = [
      `# ${CF_LOCAL_AGENT_PROTOTYPE_ID} Evidence`,
      "",
      `createdAt: ${nowIso(this.options)}`,
      `job_id: ${redact(job.job_id)}`,
      `correlation_id: ${redact(job.correlation_id)}`,
      `type: ${redact(job.type)}`,
      `requested_action: ${redact(job.requested_action)}`,
      `target_environment: ${redact(job.target_environment)}`,
      `job_status: ${redact(job.status)}`,
      `compliance_status: ${compliance.status}`,
      `blocked_reasons: ${compliance.blockedReasons.join(", ") || "none"}`,
      "cloudflareApiCall: false",
      "externalWrite: false",
      "secretRequired: false",
      "deployAttempted: false",
      "resourceCreated: false",
      "",
      "## Stop Before",
      "",
      ...stopBeforeCloudflareMutation.map((item) => `- ${item}`),
      "",
      "## Boundary",
      "",
      "This evidence was written by the local mock prototype only. It does not call Cloudflare, create resources, send messages, deploy, edit DNS, register MCP, or write secrets.",
      ""
    ].join("\n");

    fs.writeFileSync(resolvedPath, evidence);

    return {
      status: "local_evidence_written",
      path: resolvedPath,
      externalWrite: false,
      cloudflareApiCall: false,
      secretRequired: false,
      writtenAt: nowIso(this.options)
    };
  }
}

export class EdgeOrchestratorAgent {
  constructor(options = {}) {
    this.options = options;
    this.complianceGuard = new ComplianceGuardAgent(options);
    this.evidencePackager = new EvidencePackagerAgent(options);
  }

  run(job, options = {}) {
    const validation = validateMockJob(job);

    if (!validation.ok) {
      return {
        status: "failed_validation",
        validation,
        cloudflareApiCall: false,
        externalWrite: false,
        stopBefore: stopBeforeCloudflareMutation
      };
    }

    const normalizedJob = {
      ...validation.normalized,
      status: "validated",
      output_summary: "Local-only Cloudflare agent prototype validation completed."
    };
    const compliance = this.complianceGuard.review(normalizedJob);
    const evidence = this.evidencePackager.writeEvidence({
      job: normalizedJob,
      compliance,
      outputPath: options.outputPath || normalizedJob.log_path
    });

    return {
      status: compliance.canProceedLocalOnly ? "done_local_evidence_only" : "blocked_by_compliance",
      prototypeId: CF_LOCAL_AGENT_PROTOTYPE_ID,
      job: normalizedJob,
      compliance,
      evidence,
      cloudflareApiCall: false,
      externalWrite: false,
      secretRequired: false,
      stopBefore: stopBeforeCloudflareMutation
    };
  }
}

function parseArgs(argv) {
  const parsed = {
    jobPath: "",
    outputPath: ".hermes/reports/CF_LOCAL_AGENT_PROTOTYPE_001_EVIDENCE.md"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--job") {
      parsed.jobPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--output") {
      parsed.outputPath = argv[index + 1] || parsed.outputPath;
      index += 1;
    }
  }

  return parsed;
}

function readJob(jobPath) {
  if (!jobPath) {
    return createDefaultMockJob();
  }

  return JSON.parse(fs.readFileSync(jobPath, "utf8"));
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const job = readJob(args.jobPath);
  const orchestrator = new EdgeOrchestratorAgent();
  const result = orchestrator.run(job, { outputPath: args.outputPath });

  console.log(
    JSON.stringify(
      {
        status: result.status,
        prototypeId: result.prototypeId,
        evidencePath: result.evidence?.path || null,
        cloudflareApiCall: false,
        externalWrite: false,
        secretRequired: false,
        stopBefore: stopBeforeCloudflareMutation
      },
      null,
      2
    )
  );

  if (result.status === "failed_validation") {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli();
}

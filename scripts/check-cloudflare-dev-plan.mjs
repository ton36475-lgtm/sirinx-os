import fs from "node:fs";

const requiredFiles = [
  "00_COMMAND_CENTER/PRE_APPROVAL_PACKET_CLOUDFLARE_DEV.md",
  "docs/cloudflare/CLOUDFLARE_DEV_PLAN_LOCAL_ONLY.md",
  "apps/cloudflare-agent-team/wrangler.jsonc.example",
  "apps/cloudflare-agent-team/src/bindings.plan.json",
  "apps/cloudflare-agent-team/src/db/schema.sql"
];

const secretValuePatterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /cfat_[A-Za-z0-9_-]{16,}/,
  /github_pat_[A-Za-z0-9_-]{16,}/,
  /xai-[A-Za-z0-9_-]{16,}/,
  /hf_[A-Za-z0-9_-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

const mutationCommandPatterns = [
  /^\s*wrangler\s+deploy\b/im,
  /^\s*wrangler\s+secret\s+put\b/im,
  /^\s*wrangler\s+d1\s+create\b/im,
  /^\s*wrangler\s+r2\s+bucket\s+create\b/im,
  /^\s*wrangler\s+queues\s+create\b/im,
  /^\s*wrangler\s+vectorize\s+create\b/im
];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message, findings) {
  if (!condition) findings.push(message);
}

const findings = [];

for (const file of requiredFiles) {
  assert(fs.existsSync(file), `missing:${file}`, findings);
}

if (findings.length === 0) {
  const packet = read("00_COMMAND_CENTER/PRE_APPROVAL_PACKET_CLOUDFLARE_DEV.md");
  const plan = JSON.parse(read("apps/cloudflare-agent-team/src/bindings.plan.json"));
  const scanFiles = requiredFiles.map((file) => [file, read(file)]);

  assert(packet.includes("READY FOR HUMAN REVIEW - NOT APPROVED"), "packet_must_remain_not_approved", findings);
  assert(packet.includes("APPROVE_CLOUDFLARE_PRIVATE_DEV_DEPLOY"), "deploy_gate_phrase_missing", findings);
  assert(plan.status === "local-plan-only", "binding_plan_status_must_be_local_plan_only", findings);
  assert(plan.deployApprovalRequired === "APPROVE_CLOUDFLARE_PRIVATE_DEV_DEPLOY", "deploy_approval_gate_mismatch", findings);
  assert(plan.cloudflareApiCall === false, "binding_plan_cloudflare_api_call_must_be_false", findings);
  assert(plan.externalWrite === false, "binding_plan_external_write_must_be_false", findings);
  assert(plan.secretRequired === false, "binding_plan_secret_required_must_be_false", findings);
  assert(Array.isArray(plan.hosts) && plan.hosts.length === 3, "expected_three_private_hosts", findings);
  assert(Array.isArray(plan.bindings) && plan.bindings.length >= 6, "expected_core_binding_plan", findings);
  assert(plan.bindings.every((binding) => binding.created === false), "bindings_must_not_be_marked_created", findings);

  for (const [file, content] of scanFiles) {
    for (const pattern of secretValuePatterns) {
      assert(!pattern.test(content), `secret_like_value_detected:${file}`, findings);
    }
  }

  for (const [file, content] of scanFiles) {
    for (const pattern of mutationCommandPatterns) {
      assert(!pattern.test(content), `mutation_command_not_allowed:${file}`, findings);
    }
  }
}

const result = {
  ok: findings.length === 0,
  checkedFiles: requiredFiles,
  findings,
  guardrail: "local Cloudflare planning validation only; no Cloudflare API, deploy, resource creation, secret write, DNS edit, or remote MCP registration"
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RECEIPT_SCHEMA = "sirinx.full-stack-godmode.receipt/v1";
export const HIGH_RISK_ACTIONS = Object.freeze([
  "install",
  "provider_call",
  "live_send",
  "push",
  "deploy",
]);

const VERDICTS = new Set(["VERIFIED", "FAILED", "BLOCKED", "UNVERIFIED"]);
const STATUSES = new Set(["verified", "failed", "blocked", "unverified"]);
const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value)
    && ISO_UTC_TIMESTAMP.test(value)
    && Number.isFinite(Date.parse(value));
}

function isBroadAuthorizationValue(key, value) {
  if (!isNonEmptyString(value)) return false;
  const normalized = value.trim().toLowerCase();
  if (["all", "*", "any", "everything"].includes(normalized)) return true;
  if (/target\s*=\s*all|approve\s+all|full\s+auto|\/approveskill/.test(normalized)) return true;
  if (key === "exact_operation" && HIGH_RISK_ACTIONS.includes(normalized)) return true;
  return false;
}

function requireString(object, key, prefix, errors) {
  if (!isNonEmptyString(object?.[key])) {
    errors.push(`${prefix}.${key} must be a non-empty string`);
  }
}

function validateGate(gate, index, receipt, observedAt, errors) {
  const prefix = `gates[${index}]`;
  if (!isObject(gate)) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  for (const key of [
    "gate_id",
    "task_id",
    "action",
    "target",
    "scope",
    "exact_operation",
    "approved_by",
    "approved_at",
    "expires_at",
  ]) {
    requireString(gate, key, prefix, errors);
  }

  for (const key of ["target", "scope", "exact_operation", "approved_by"]) {
    if (isBroadAuthorizationValue(key, gate[key])) {
      errors.push(`${prefix}.${key} is broad or generic; authorization must be task-specific`);
    }
  }

  if (isNonEmptyString(gate.task_id) && gate.task_id !== receipt.task_id) {
    errors.push(`${prefix}.task_id must match receipt.task_id`);
  }
  if (isNonEmptyString(gate.action) && !HIGH_RISK_ACTIONS.includes(gate.action)) {
    errors.push(`${prefix}.action is not an allowed high-risk action name`);
  }
  if (isNonEmptyString(gate.approved_at) && !isIsoTimestamp(gate.approved_at)) {
    errors.push(`${prefix}.approved_at must be an ISO timestamp`);
  }
  if (isNonEmptyString(gate.expires_at) && !isIsoTimestamp(gate.expires_at)) {
    errors.push(`${prefix}.expires_at must be an ISO timestamp`);
  }
  if (isIsoTimestamp(gate.approved_at) && isIsoTimestamp(gate.expires_at)) {
    if (Date.parse(gate.expires_at) <= Date.parse(gate.approved_at)) {
      errors.push(`${prefix}.expires_at must be after approved_at`);
    }
    if (isIsoTimestamp(observedAt) && Date.parse(gate.expires_at) < Date.parse(observedAt)) {
      errors.push(`${prefix} was expired when the receipt was observed`);
    }
    if (isIsoTimestamp(observedAt) && Date.parse(gate.approved_at) > Date.parse(observedAt)) {
      errors.push(`${prefix} was approved after the receipt was observed`);
    }
  }
}

export function validateReceipt(receipt) {
  const errors = [];
  if (!isObject(receipt)) {
    return { valid: false, errors: ["receipt must be a JSON object"] };
  }

  if (receipt.schema !== RECEIPT_SCHEMA) {
    errors.push(`schema must equal ${RECEIPT_SCHEMA}`);
  }
  for (const key of ["receipt_id", "task_id", "claim", "observed_at", "next_safe_action"]) {
    requireString(receipt, key, "receipt", errors);
  }
  if (!STATUSES.has(receipt.status)) {
    errors.push(`receipt.status must be one of ${[...STATUSES].join(", ")}`);
  }
  if (isNonEmptyString(receipt.observed_at) && !isIsoTimestamp(receipt.observed_at)) {
    errors.push("receipt.observed_at must be an ISO timestamp");
  }
  if (!Array.isArray(receipt.scope) || receipt.scope.length === 0 || receipt.scope.some((v) => !isNonEmptyString(v))) {
    errors.push("receipt.scope must be a non-empty array of strings");
  }

  if (!Array.isArray(receipt.requirements) || receipt.requirements.length === 0) {
    errors.push("receipt.requirements must be a non-empty array");
  } else {
    receipt.requirements.forEach((item, index) => {
      const prefix = `requirements[${index}]`;
      if (!isObject(item)) {
        errors.push(`${prefix} must be an object`);
        return;
      }
      requireString(item, "id", prefix, errors);
      requireString(item, "requirement", prefix, errors);
      requireString(item, "evidence", prefix, errors);
      if (!VERDICTS.has(item.verdict)) {
        errors.push(`${prefix}.verdict must be VERIFIED, FAILED, BLOCKED, or UNVERIFIED`);
      }
    });
  }

  if (!Array.isArray(receipt.evidence) || receipt.evidence.length === 0) {
    errors.push("receipt.evidence must be a non-empty array");
  } else {
    receipt.evidence.forEach((item, index) => {
      const prefix = `evidence[${index}]`;
      if (!isObject(item)) {
        errors.push(`${prefix} must be an object`);
        return;
      }
      requireString(item, "kind", prefix, errors);
      requireString(item, "path", prefix, errors);
      requireString(item, "observed_at", prefix, errors);
      if (isNonEmptyString(item.observed_at) && !isIsoTimestamp(item.observed_at)) {
        errors.push(`${prefix}.observed_at must be an ISO timestamp`);
      }
      if (item.sha256 !== null && item.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(item.sha256)) {
        errors.push(`${prefix}.sha256 must be null or a 64-character hex digest`);
      }
    });
  }

  if (!Array.isArray(receipt.validation) || receipt.validation.length === 0) {
    errors.push("receipt.validation must be a non-empty array");
  } else {
    receipt.validation.forEach((item, index) => {
      const prefix = `validation[${index}]`;
      if (!isObject(item)) {
        errors.push(`${prefix} must be an object`);
        return;
      }
      requireString(item, "command", prefix, errors);
      if (!Number.isInteger(item.exit_code)) {
        errors.push(`${prefix}.exit_code must be an integer`);
      }
      requireString(item, "coverage", prefix, errors);
    });
  }

  const gates = Array.isArray(receipt.gates) ? receipt.gates : [];
  if (!Array.isArray(receipt.gates)) {
    errors.push("receipt.gates must be an array");
  }
  gates.forEach((gate, index) => validateGate(gate, index, receipt, receipt.observed_at, errors));
  const gateIds = gates
    .map((gate) => gate?.gate_id)
    .filter(isNonEmptyString);
  if (new Set(gateIds).size !== gateIds.length) {
    errors.push("receipt.gates must not contain duplicate gate_id values");
  }

  if (!isObject(receipt.external_actions)) {
    errors.push("receipt.external_actions must be an object");
  } else {
    const secretRead = receipt.external_actions.secret_read;
    if (!isObject(secretRead) || secretRead.executed !== false) {
      errors.push("external_actions.secret_read.executed must be false; secret reads cannot be gated by this bundle");
    }

    for (const action of HIGH_RISK_ACTIONS) {
      const record = receipt.external_actions[action];
      const prefix = `external_actions.${action}`;
      if (!isObject(record) || typeof record.executed !== "boolean") {
        errors.push(`${prefix}.executed must be a boolean`);
        continue;
      }
      if (!record.executed) {
        if (record.gate_id !== null && record.gate_id !== undefined) {
          errors.push(`${prefix}.gate_id must be null when the action was not executed`);
        }
        continue;
      }

      for (const key of ["gate_id", "target", "scope", "exact_operation"]) {
        requireString(record, key, prefix, errors);
      }
      const gate = gates.find((candidate) => candidate?.gate_id === record.gate_id);
      if (!gate) {
        errors.push(`${prefix} executed without a matching gate`);
        continue;
      }
      for (const [key, expected] of [
        ["action", action],
        ["task_id", receipt.task_id],
        ["target", record.target],
        ["scope", record.scope],
        ["exact_operation", record.exact_operation],
      ]) {
        if (gate[key] !== expected) {
          errors.push(`${prefix}.${key} must exactly match gate ${record.gate_id}`);
        }
      }
    }
  }

  if (receipt.status === "verified") {
    const nonVerified = Array.isArray(receipt.requirements)
      ? receipt.requirements.filter((item) => item?.verdict !== "VERIFIED")
      : [];
    if (nonVerified.length > 0) {
      errors.push("verified receipt cannot contain non-VERIFIED requirements");
    }
    const failedCommands = Array.isArray(receipt.validation)
      ? receipt.validation.filter((item) => item?.exit_code !== 0)
      : [];
    if (failedCommands.length > 0) {
      errors.push("verified receipt cannot contain failing validation commands");
    }
  }

  return { valid: errors.length === 0, errors };
}

function runCli(argv) {
  if (argv.length !== 1) {
    console.error("usage: node validate_receipt.mjs <receipt.json>");
    return 2;
  }

  const inputPath = path.resolve(argv[0]);
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    console.error(JSON.stringify({ valid: false, errors: [`unable to read receipt: ${error.message}`] }, null, 2));
    return 2;
  }

  const result = validateReceipt(receipt);
  console.log(JSON.stringify(result, null, 2));
  return result.valid ? 0 : 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exitCode = runCli(process.argv.slice(2));
}

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";

const secretPatterns = [
  ["hardcoded_api_key", /\bsk-or-v1[_-][A-Za-z0-9_-]{24,}\b/g],
  ["hardcoded_api_key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g],
  ["hardcoded_api_key", /\b\d{7,12}:[A-Za-z0-9_-]{25,}\b/g],
  ["hardcoded_bearer_token", /\bBearer\s+[A-Za-z0-9._-]{24,}\b/gi],
  ["hardcoded_jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  [
    "hardcoded_api_key",
    /\b(?:OPENROUTER_API_KEY|OPENAI_API_KEY|TELEGRAM_BOT_TOKEN|API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*["']?[^"'\s]{12,}/gi
  ]
];

const dangerousPatterns = [
  ["dangerous_shell_command", /\brm\s+-rf\s+(?:\/|\$HOME|~|\*)/i],
  ["dangerous_shell_command", /\b(?:curl|wget)\b[^\n|;]*(?:\||&&)\s*(?:sh|bash|zsh)\b/i],
  ["dangerous_shell_command", /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}/],
  ["secret_file_read", /\b(?:cat|less|more|open|readFileSync|readFile)\s*\(?["']?(?:\.env|[^"'\s]*(?:auth\.json|config\.yaml|id_rsa|\.pem))/i],
  ["external_mutation_command", /\b(?:wrangler\s+deploy|git\s+push|vercel\s+deploy|cloudflare\s+pages\s+deploy)\b/i],
  ["unapproved_mcp_execution", /\b(?:mcp\s+(?:start|run)|(?:start|run)\s+(?:real\s+)?mcp)\b/i]
];

const allPatterns = [...secretPatterns, ...dangerousPatterns];

export function validateGeneratedCodeText(source = "", options = {}) {
  const text = String(source || "");
  const filePath = String(options.filePath || "generated-code");
  const findings = [];

  for (const [ruleId, pattern] of allPatterns) {
    for (const match of findMatches(text, pattern)) {
      findings.push(makeFinding(ruleId, text, match.index || 0, filePath));
    }
  }

  const deduped = dedupeFindings(findings);
  return {
    ok: deduped.length === 0,
    blocked: deduped.length > 0,
    filePath,
    findings: deduped,
    policy: "generated code must pass validator shield before execution",
    secretValuesPrinted: false
  };
}

export function validateGeneratedCodeFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  return validateGeneratedCodeText(source, {
    filePath: relative(process.cwd(), filePath)
  });
}

function findMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return text.matchAll(new RegExp(pattern.source, flags));
}

function makeFinding(ruleId, text, index, filePath) {
  const before = text.slice(0, index);
  const line = before.split(/\r?\n/).length;
  const lastLineBreak = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
  const column = index - lastLineBreak;
  const lineText = text.split(/\r?\n/)[line - 1] || "";

  return {
    ruleId,
    severity: "blocker",
    filePath,
    line,
    column,
    snippet: redactSensitiveSnippet(lineText.trim()).slice(0, 180)
  };
}

function redactSensitiveSnippet(value) {
  let redacted = String(value || "");
  for (const [, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, "<REDACTED_SECRET>");
  }
  return redacted;
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.ruleId}:${finding.filePath}:${finding.line}:${finding.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function runCli(argv) {
  const files = argv.filter((arg) => !arg.startsWith("--"));
  if (files.length === 0) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error: "missing_files",
          usage: "node scripts/validator-shield.mjs <file ...>",
          secretValuesPrinted: false
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
    return;
  }

  const results = files.map(validateGeneratedCodeFile);
  const output = {
    ok: results.every((result) => result.ok),
    results,
    findings: results.flatMap((result) => result.findings),
    guardrail: "deterministic generated-code validator; secret values redacted"
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2));
}

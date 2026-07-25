const pageClosedGateChecks = [
  { pattern: /<form\b/i, reason: "HTML form submit" },
  { pattern: /\bmethod\s*=\s*["']?(post|get)\b/i, reason: "form method attribute" },
  { pattern: /\baction\s*=\s*["'][^"']+/i, reason: "form action attribute" },
  { pattern: /<script\b[^>]*src=["']https?:\/\//i, reason: "third-party script source" },
  { pattern: /\b(href|src|action)\s*=\s*["'][^"']*\/api\//i, reason: "API endpoint link" }
];

const runtimeClosedGateChecks = [
  { pattern: /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/i, reason: "browser storage" },
  { pattern: /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/i, reason: "browser network call" },
  { pattern: /\bnavigator\.sendBeacon\b/i, reason: "analytics beacon send" },
  { pattern: /\b(gtag|fbq|plausible|clarity|hj|dataLayer)\b/i, reason: "production analytics vendor" },
  { pattern: /\b(posthog|mixpanel|segment|amplitude)\b/i, reason: "production analytics SDK" },
  { pattern: /\bsupabase\w*|\bcreateClient\s*\(/i, reason: "Supabase client/runtime wiring" },
  { pattern: /\bmongodb(?:\+srv)?:\/\//i, reason: "MongoDB connection string" }
];

function collectViolations(kind, label, content, checks) {
  return checks
    .filter((check) => check.pattern.test(content))
    .map((check) => ({
      kind,
      label,
      reason: check.reason
    }));
}

export function findClosedGateViolations({ pages = new Map(), scripts = new Map() } = {}) {
  return [
    ...Array.from(pages, ([label, content]) => collectViolations("page", label, content, pageClosedGateChecks)).flat(),
    ...Array.from(scripts, ([label, content]) =>
      collectViolations("script", label, content, runtimeClosedGateChecks)
    ).flat()
  ];
}

export function assertNoClosedGateViolations(input = {}) {
  const violations = findClosedGateViolations(input);
  if (violations.length > 0) {
    const [first] = violations;
    throw new Error(`${first.label} includes blocked closed-gate behavior: ${first.reason}`);
  }
}

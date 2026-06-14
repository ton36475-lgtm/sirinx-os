export const X_AI_ACCOUNTS = Object.freeze([
  creator("@karpathy", "AI engineering taste and educational clarity"),
  creator("@steipete", "developer tooling and app engineering"),
  creator("@gregisenberg", "startup growth and community building"),
  creator("@rileybrown", "AI workflow demos and operator education"),
  creator("@jackfriks", "AI builder workflows"),
  creator("@levelsio", "solo product shipping and public building"),
  creator("@marclou", "lean SaaS shipping"),
  creator("@EXM7777", "AI market observation"),
  creator("@eptwts", "AI tool discovery"),
  creator("@godofprompt", "prompt library patterns"),
  creator("@vasuman", "AI product and workflow notes"),
  creator("@AmirMushich", "AI automation patterns"),
  creator("@0xROAS", "growth systems and paid acquisition"),
  creator("@egeberkina", "AI design and product storytelling"),
  creator("@MengTo", "design systems and product UX")
]);

export const X_AI_RADAR_POLICY = Object.freeze({
  dataSource: "user_seed_public_accounts_only",
  automationAllowed: false,
  privateDataAllowed: false,
  impersonationAllowed: false,
  directPostCopyAllowed: false,
  endorsementClaimAllowed: false,
  requiresHumanReview: true,
  outputMode: "inspiration_and_signal_map_only"
});

export function validateXAccounts(accounts = X_AI_ACCOUNTS) {
  const findings = [];
  const seen = new Set();
  for (const account of accounts) {
    if (!/^@[A-Za-z0-9_]{1,15}$/.test(account.handle)) {
      findings.push(`invalid_handle:${account.handle}`);
    }
    const key = account.handle.toLowerCase();
    if (seen.has(key)) {
      findings.push(`duplicate_handle:${account.handle}`);
    }
    seen.add(key);
    if (account.verificationStatus !== "user_seed_unverified") {
      findings.push(`verification_status_must_remain_user_seed_unverified:${account.handle}`);
    }
    if (account.automationAllowed !== false) {
      findings.push(`automation_must_remain_false:${account.handle}`);
    }
    if (account.sourceUrl !== `https://x.com/${account.handle.slice(1)}`) {
      findings.push(`source_url_mismatch:${account.handle}`);
    }
  }
  if (accounts.length !== 15) {
    findings.push(`expected_15_seed_accounts_found_${accounts.length}`);
  }
  return {
    ok: findings.length === 0,
    count: accounts.length,
    findings
  };
}

function creator(handle, internalUse) {
  return Object.freeze({
    handle,
    sourceUrl: `https://x.com/${handle.slice(1)}`,
    internalUse,
    verificationStatus: "user_seed_unverified",
    automationAllowed: false,
    notes: "Internal seed only. Do not claim endorsement, copy posts, scrape private data, or automate X actions."
  });
}

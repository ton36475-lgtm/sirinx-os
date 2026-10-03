# Governed Self-Improvement for SIRINX OS

SIRINX adopts the useful part of MIT/Sakana SIFT without delegating promotion to an LLM judge.

## Search loop

\`\`\`text
candidate patch
   |
   +--> cheap smoke / syntax / unit checks
   |
   +--> pairwise judge ranking
   |       |
   |       +--> regularized Bradley-Terry strength
   |
   +--> expensive benchmark for top candidates
   |
   +--> independent verification
   |
   +--> immutable resource receipt
   |
   +--> GhostClaw policy gate
   |
   +--> promote / rollback
\`\`\`

SIFT's contribution is search efficiency: use a cheap pairwise signal to prioritize which candidate branches deserve expensive evaluation. It does not replace a real benchmark, and it should never be the sole evidence for a production promotion.

## Anti-gaming controls

Because self-improving systems can accidentally optimize the evaluator, SIRINX keeps:

- independent benchmark code from candidate patch code;
- immutable telemetry/receipt records;
- separate control and data planes;
- smoke tests before benchmark allocation;
- lane ownership and single-writer rules;
- bounded budgets and loop guards;
- checkpoint/rollback paths.

## Promotion contract

A candidate can be promoted only when:

\`\`\`text
policyAllowed = true
smokePassed = true
receiptComplete = true
benchmarkImproved = true
\`\`\`

The judge score is stored as a ranking signal and audit field. A high judge score cannot override a failing benchmark, incomplete evidence or policy denial.

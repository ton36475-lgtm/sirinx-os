// Egress redaction — the worker forwards whatever it receives to five external
// providers, so a payload carrying a credential leaks it to five parties at once.
//
// Mirrors ghostclaw-providers::maxplus::redaction_gate. The markers are the same
// list, including the ones this project has actually handled: `ccsk-` (maxplus),
// `glm-share-` (cointh), `sk-ws-` (Alibaba MaaS).

export const SECRET_MARKERS = [
  '-----BEGIN',
  'cert.pem',
  '.pem',
  'ccsk-',
  'glm-share-',
  'sk-ant-',
  'sk-ws-',
  'ghp_',
  'gho_',
  'xoxb-',
  'AKIA',
  'CHANNEL_ACCESS_TOKEN',
  'CHANNEL_SECRET',
  'LINE_CHANNEL',
  'MAXPLUS_API_KEY',
  'COINTH_API_KEY',
  'ALIBABA_MAAS_API_KEY',
  'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
];

/**
 * Returns the marker that tripped, or null when clean.
 *
 * A hit means drop the request. There is deliberately no "redact and continue":
 * a payload that contains a credential was assembled wrong upstream, and sending
 * a scrubbed version hides that from whoever needs to fix it.
 */
export function redactionHit(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');
  return SECRET_MARKERS.find((m) => text.includes(m)) ?? null;
}

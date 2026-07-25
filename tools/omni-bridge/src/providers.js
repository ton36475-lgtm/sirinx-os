// The fallback matrix.
//
// Order is speed first, then free quota. Every entry is skipped when its secret
// is not bound, so the worker runs with any subset configured.
//
// ⚠️ The model ids below came from the original draft and have NOT been probed
// against each provider's live model list. On this project a declared id has
// failed against a live list four times — maxplus listed three ids that were not
// routable, cointh's config misspelled two of four, a requested qwen3.8 did not
// exist, and a dashboard claimed schema support that returned 400. Run
// `npm run verify:models` before trusting them.

export const PROVIDERS = [
  {
    name: 'DeepSeek-V4-Flash',
    url: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    modelsUrl: 'https://api.deepseek.com/v1/models',
    headers: {},
  },
  {
    name: 'Groq-Speed-Llama',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    headers: {},
  },
  {
    name: 'OpenRouter-Zero-Cost',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    model: 'meta-llama/llama-3-8b-instruct:free',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    // OpenRouter attributes free-tier usage by referer and title.
    headers: {
      'HTTP-Referer': 'https://omni-bridge.cloud',
      'X-Title': 'GhostClaw-OmniBridge-Edge',
    },
  },
  {
    name: 'Alibaba-Qwen-Free',
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyEnv: 'ALIBABA_API_KEY',
    model: 'qwen-long',
    modelsUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
    headers: {},
  },
  {
    name: 'Google-Gemini-Flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyEnv: 'GEMINI_API_KEY',
    model: 'gemini-1.5-flash',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    headers: {},
  },
];

/**
 * Whether a failed response means "try the next provider" or "stop".
 *
 * A revoked or wrong key returns 401/403. Treating that as a reason to fall
 * through means every credential failure silently moves traffic to the next
 * provider — the operator sees working requests and never learns the key broke,
 * until the bill or the quota says so.
 *
 * Rate limits and server faults are what the fallback chain is for.
 */
export function shouldFallThrough(status) {
  if (status === 401 || status === 403) return false;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

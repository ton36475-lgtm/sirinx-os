// The fallback matrix.
//
// Every lane here was probed live against its own endpoint on 2026-07-25/26 and
// re-verified immediately before this file was written. Order is by measured
// latency, not by price — the point of a fallback chain is to reach a working
// model quickly, and the cheapest lane on this list is also the slowest.
//
// The original draft of this worker listed DeepSeek, Groq, OpenRouter,
// dashscope-intl and Gemini. Those were carried over unverified and no
// credential for any of them exists on this host, so every one of them would
// have been skipped at runtime, leaving a worker that could not answer at all.
// They were replaced rather than kept as dead entries.
//
// Two wire formats appear below. `anthropic` sends `messages` + `max_tokens`
// with an `anthropic-version` header; `openai` sends the same body to a
// chat-completions path. The worker forwards the caller's body either way, so
// an OpenAI-shaped request works against both — `max_tokens` is the only field
// Anthropic requires that OpenAI treats as optional, and callers already send it.

export const PROVIDERS = [
  {
    // Fastest measured lane. deepseek-v4-flash answered in 870 ms here against
    // 3112 ms for the same id on maxplus; qwen3.7-max 2191 ms against 5357 ms.
    name: 'Alibaba-MaaS',
    url: 'https://ws-pmpu62szcpaossb6.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyEnv: 'ALIBABA_MAAS_API_KEY',
    model: 'qwen3.7-max',
    modelsUrl: 'https://ws-pmpu62szcpaossb6.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models',
    wire: 'openai',
    headers: {},
    // The hostname carries the workspace id. A different Model Studio workspace
    // is a different host — this URL is a fact about this account, not the service.
    note: '11/11 probed ids answered. 151 listed. Free tier is 10k neurons/day.',
  },
  {
    // Beats Alibaba on GLM specifically: glm-5.2 at 1265 ms against 1676 ms.
    // That asymmetry is why the in-process router (P098 Rev G) routes per family
    // rather than picking one provider for everything.
    name: 'Cointh-GLM',
    url: 'https://cointh.com/glm/anthropic/v1/messages',
    keyEnv: 'COINTH_API_KEY',
    model: 'glm-5.2',
    modelsUrl: 'https://cointh.com/glm/anthropic/v1/models',
    wire: 'anthropic',
    headers: { 'anthropic-version': '2023-06-01' },
    note: '8/8 listed ids answered. anthropic_messages only — /v1/chat/completions 404s.',
  },
  {
    // LEAF. Slowest of the three on every id they share, so it sits last — the
    // classification in P098 Rev D is about latency, not about it being free.
    //
    // MAXPLUS_KEY_CHINESE, not MAXPLUS_API_KEY: a maxplus pool is bound to the
    // key, and the key held in MAXPLUS_API_KEY was moved to the VIP pool, which
    // lists models but rejects inference (400 at the root, 503 on /maxpools).
    name: 'MaxPlus-Chinese',
    url: 'https://api.maxplus-ai.cc/v1/messages',
    keyEnv: 'MAXPLUS_KEY_CHINESE',
    model: 'glm-5.2',
    modelsUrl: 'https://api.maxplus-ai.cc/v1/models',
    wire: 'anthropic',
    headers: { 'anthropic-version': '2023-06-01' },
    note: '10/13 listed ids answered. 3 are listed but not routable on any schema.',
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

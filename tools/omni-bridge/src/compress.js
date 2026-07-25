// Ghost-Trimmer — context compression for the Omni-Bridge worker.
//
// The rules here are aggressive on purpose: a git diff or a log file is mostly
// structure, and a model only needs the changed lines and the shape around them.
//
// They are also *only* correct for that kind of content. The original version
// applied them to every message, which truncated ordinary prompts to 35
// characters before they reached any model:
//
//     in : "Please refactor the payment handler so it retries on 429 and adds…"
//     out : "Please refactor the payment handle..."
//
// The model then answered a question nobody asked, and nothing in the logs said
// why. So compression is now gated on recognising the content first.

/** A unified diff — the case the truncation rule was written for. */
export function looksLikeDiff(text) {
  return /^diff --git |^@@ .* @@|^--- \S|^\+\+\+ \S|^index [0-9a-f]{7,}\.\.[0-9a-f]{7,}/m.test(text);
}

/** A log with timestamps or level prefixes. */
export function looksLikeLog(text) {
  return (
    /^\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/m.test(text) ||
    /^(INFO|DEBUG|TRACE|WARN|ERROR)\b/m.test(text)
  );
}

/** Whether this content is the kind compression was designed for. */
export function isCompressible(text) {
  return looksLikeDiff(text) || looksLikeLog(text);
}

/** Context lines in a diff are truncated to this many characters. */
export const CONTEXT_LINE_BUDGET = 35;

/**
 * Compress diff/log content. Returns the input unchanged when it is neither —
 * that guard is the whole point of this module.
 */
export function compressContent(content) {
  if (typeof content !== 'string') return content;
  if (!isCompressible(content)) return content;

  let out = content;

  // Git index hashes carry no meaning for the model.
  out = out.replace(/^index [0-9a-f]+\.\.[0-9a-f]+.*$/gm, '');

  // Unchanged context lines: keep enough to locate the hunk, drop the rest.
  // Lines starting with + or - are the change itself and stay whole.
  if (looksLikeDiff(out)) {
    out = out.replace(/^(?![+-]).*$/gm, (line) =>
      line.trim() === '' ? '' : line.slice(0, CONTEXT_LINE_BUDGET) + '...'
    );
  }

  // Timestamps repeat on every line and say nothing the model can use.
  out = out.replace(/\[?\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d+Z]*\]?\s*/g, '');

  // Routine log levels. WARN and ERROR are kept — those are usually the reason
  // the log was pasted in the first place.
  out = out.replace(/^(INFO|DEBUG|TRACE).*$/gm, '');

  out = out.replace(/[ \t]+/g, ' ');
  out = out.replace(/\n\s*\n/g, '\n');
  return out.trim();
}

/**
 * Apply compression across a messages array without mutating the caller's
 * objects — the original mutated `originalBody` in place, which makes a retry
 * operate on already-compressed text.
 */
export function compressMessages(messages) {
  if (!Array.isArray(messages)) return messages;
  return messages.map((msg) => {
    if (typeof msg?.content === 'string') {
      return { ...msg, content: compressContent(msg.content) };
    }
    if (Array.isArray(msg?.content)) {
      return {
        ...msg,
        content: msg.content.map((item) =>
          item?.type === 'text' && typeof item.text === 'string'
            ? { ...item, text: compressContent(item.text) }
            : item
        ),
      };
    }
    return msg;
  });
}

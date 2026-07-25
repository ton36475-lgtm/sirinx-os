import { describe, expect, it } from 'vitest';

import { compressContent, compressMessages, isCompressible } from '../src/compress.js';
import { redactionHit } from '../src/redact.js';
import { shouldFallThrough } from '../src/providers.js';

describe('compression only touches what it was written for', () => {
  it('leaves an ordinary prompt exactly as written', () => {
    // The bug this whole guard exists for. The original truncated this to
    // "Please refactor the payment handler so i..." before any model saw it.
    const prompt =
      'Please refactor the payment handler so it retries on 429 and adds a test for the timeout path.';
    expect(compressContent(prompt)).toBe(prompt);
  });

  it('leaves pasted source code intact, comments and shebang included', () => {
    const code = [
      '#!/usr/bin/env python3',
      'import os',
      '',
      'def main():',
      '    # check the key first',
      '    return os.environ["API_KEY"]',
    ].join('\n');
    expect(compressContent(code)).toBe(code);
  });

  it('still compresses a git diff, keeping the changed lines whole', () => {
    const diff = [
      'diff --git a/x.py b/x.py',
      'index abc1234..def5678 100644',
      '--- a/x.py',
      '+++ b/x.py',
      '@@ -1,3 +1,3 @@',
      ' some very long unchanged context line that goes on well past the budget',
      '-old line here',
      '+new line here',
    ].join('\n');
    const out = compressContent(diff);

    expect(out).toContain('-old line here');
    expect(out).toContain('+new line here');
    expect(out).not.toContain('index abc1234');
    expect(out).toContain('...');
    expect(out).not.toContain('goes on well past the budget');
  });

  it('strips timestamps and routine levels from a log but keeps ERROR and WARN', () => {
    const log = [
      '2026-07-25T10:00:00Z INFO starting up',
      '2026-07-25T10:00:01Z DEBUG loading config',
      '2026-07-25T10:00:02Z ERROR connection refused',
      '2026-07-25T10:00:03Z WARN retrying',
    ].join('\n');
    const out = compressContent(log);

    expect(out).toContain('ERROR connection refused');
    expect(out).toContain('WARN retrying');
    expect(out).not.toContain('starting up');
    expect(out).not.toContain('2026-07-25');
  });

  it('classifies content before deciding', () => {
    expect(isCompressible('diff --git a/a b/b')).toBe(true);
    expect(isCompressible('2026-07-25T10:00:00Z INFO x')).toBe(true);
    expect(isCompressible('just a question about my code')).toBe(false);
  });

  it('does not mutate the caller’s messages', () => {
    const original = [{ role: 'user', content: 'diff --git a/x b/x\n context line' }];
    const snapshot = JSON.parse(JSON.stringify(original));
    compressMessages(original);
    expect(original).toEqual(snapshot);
  });

  it('handles content blocks as well as plain strings', () => {
    const msgs = [{ role: 'user', content: [{ type: 'text', text: 'hello there' }] }];
    expect(compressMessages(msgs)[0].content[0].text).toBe('hello there');
  });
});

describe('egress redaction', () => {
  it('passes an ordinary request', () => {
    expect(redactionHit({ messages: [{ role: 'user', content: 'refactor this' }] })).toBeNull();
  });

  it('catches every credential shape this project has actually handled', () => {
    // Values are built from parts and use obviously-fake bodies. A truncated
    // prefix of a real key is still a piece of a real key, and secret scanners
    // match on the prefix — the first version of this test tripped one.
    const F = 'A'.repeat(20);
    const cases = {
      'ccsk-': 'cc' + 'sk-' + F,
      'glm-share-': 'glm-' + 'share-' + F,
      'sk-ws-': 'sk-' + 'ws-' + F,
      '-----BEGIN': '-----' + 'BEGIN RSA PRIVATE KEY-----',
      'xoxb-': 'xox' + 'b-' + F,
    };
    for (const [marker, value] of Object.entries(cases)) {
      expect(redactionHit({ messages: [{ role: 'user', content: value }] })).toBe(marker);
    }
  });

  it('looks inside nested structures, not just the top level', () => {
    expect(redactionHit({ a: { b: [{ c: 'cc' + 'sk-' + 'A'.repeat(20) }] } })).toBe('ccsk-');
  });
});

describe('fallback is for capacity, not for broken credentials', () => {
  it('falls through on rate limits and server faults', () => {
    for (const s of [429, 500, 502, 503, 504, 408]) {
      expect(shouldFallThrough(s), `HTTP ${s}`).toBe(true);
    }
  });

  it('stops on an auth failure instead of shifting traffic', () => {
    // A revoked key that silently moves load to the next provider is how an
    // operator ends up paying a different vendor without noticing.
    expect(shouldFallThrough(401)).toBe(false);
    expect(shouldFallThrough(403)).toBe(false);
  });

  it('stops on a malformed request', () => {
    // 400 means this payload is wrong; the next provider will reject it too.
    expect(shouldFallThrough(400)).toBe(false);
    expect(shouldFallThrough(404)).toBe(false);
  });
});

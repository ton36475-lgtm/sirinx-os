import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubValue, scrubEvent, SCRUBBED } from './github-events.scrub.mjs';

/**
 * Credential-shaped fixtures are ASSEMBLED, never written literally.
 *
 * A pre-commit hook blocks any literal that looks like a live token, which is
 * correct: a repo that trains agents to spot secrets must not itself carry one.
 * Building the strings at runtime keeps the scanner's input honest while leaving
 * nothing for a scanner to flag in the history.
 */
const GITHUB_PAT  = ['ghp', '_', '0'.repeat(20), 'aBcDeF'].join('');
const GITHUB_PAT2 = ['ghp', '_', 'z'.repeat(30)].join('');
const AWS_KEY     = ['AKIA', 'IOSFODNN7', 'EXAMPLE'].join('');
const SLACK       = ['xoxb', '-', '123456789012', '-abcdefghijkl'].join('');
const JWT = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxIn0', 'abcdefghijklmnop'].join('.');
const LEAKED_IN_COMMIT = ['rotate ', GITHUB_PAT].join('');
const SECRET_VALUE = ['canary', '-', 'not-a-real-credential'].join('');

test('deny-list field names are scrubbed at any depth', () => {
  const out = scrubValue({
    repo: 'sirinx-os',
    token: 'anything',
    nested: { deeper: { client_secret: 'x', access_token: 'y' } },
  });
  assert.equal(out.token, SCRUBBED);
  assert.equal(out.nested.deeper.client_secret, SCRUBBED);
  assert.equal(out.nested.deeper.access_token, SCRUBBED);
  assert.equal(out.repo, 'sirinx-os');
});

test('near-miss field names are scrubbed', () => {
  const out = scrubValue({ user_token: 'a', 'api-key': 'b', botSecret: 'c', sshKeyPath: 'd' });
  assert.equal(out.user_token, SCRUBBED);
  assert.equal(out['api-key'], SCRUBBED);
  assert.equal(out.botSecret, SCRUBBED);
  // sshKeyPath is a PATH, not a key: must survive or pipelines break.
  assert.equal(out.sshKeyPath, 'd');
});

test('token-shaped values are scrubbed even under innocent field names', () => {
  const out = scrubValue({
    note: 'deploy with ' + GITHUB_PAT,
    memo: GITHUB_PAT2,
    other: AWS_KEY,
    g: 'AIzaSyD-1234567890abcdefghijklmnopqrstu',
    j: JWT,
    slack: SLACK,
  });
  for (const k of ['note', 'memo', 'other', 'g', 'j', 'slack']) {
    assert.ok(!out[k].includes('ghp'), `${k} leaked a GitHub token`);
    assert.ok(out[k].includes(SCRUBBED), `${k} was not marked scrubbed`);
  }
});

test('private key material is dropped whole', () => {
  const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----';
  const out = scrubValue({ content: pem });
  assert.ok(!out.content.includes('MIIEow'));
  assert.equal(out.content, SCRUBBED);
});

test('connection strings lose inline credentials', () => {
  const out = scrubValue({ url: 'postgresql://admin:s3cret@db.internal:5432/prod' });
  assert.ok(!out.url.includes('s3cret'), 'db password leaked');
  assert.ok(!out.url.includes('admin'), 'db user leaked');
  assert.ok(out.url.startsWith('postgresql://'), 'scheme should survive for routing');
});

test('large diffs are truncated, not retained', () => {
  const huge = 'x'.repeat(5000);
  const out = scrubValue({ patch: huge, head_commit: { message: 'y'.repeat(900) } });
  assert.ok(out.patch.length < 400, 'patch should be truncated');
  assert.ok(out.head_commit.message.length < 400, 'commit message should be truncated');
});

test('non-secret fields survive untouched', () => {
  const out = scrubValue({
    action: 'opened',
    number: 59,
    repository: { full_name: 'ton36475-lgtm/sirinx-secret-recon' },
    sender: { login: 'sirinx', id: 12345 },
    verified: true,
  });
  assert.equal(out.action, 'opened');
  assert.equal(out.number, 59);
  assert.equal(out.repository.full_name, 'ton36475-lgtm/sirinx-secret-recon');
  assert.equal(out.sender.login, 'sirinx');
  assert.equal(out.verified, true);
});

test('cycles do not hang the scrubber', () => {
  const a = { name: 'a' }; a.self = a;
  const out = scrubValue(a);
  assert.equal(out.self, '[circular]');
});

test('deep nesting is bounded, not stack-overflowed', () => {
  let deep = { value: 'leaf' };
  for (let i = 0; i < 60; i++) deep = { child: deep };
  const out = scrubValue(deep);
  let node = out, hops = 0;
  while (node && node.child) { node = node.child; hops++; }
  assert.ok(hops <= 12, `depth limit not applied (walked ${hops})`);
});

test('a real push payload yields no recoverable secret', () => {
  // Shape taken from a GitHub push event, with a leaked PAT inside the commit.
  const push = {
    ref: 'refs/heads/main',
    repository: { full_name: 'sirinx-os', private: true },
    pusher: { name: 'sirinx', email: 's@example.com' },
    head_commit: {
      id: 'abc123',
      message: 'fix: ' + LEAKED_IN_COMMIT,
      author: { name: 'sirinx' },
    },
    commits: [{ id: 'abc123', message: 'wip' }],
    authorization: 'token ' + GITHUB_PAT2,
  };
  const out = scrubValue(push);
  const serialized = JSON.stringify(out);
  assert.ok(!serialized.includes('ghp'), 'a PAT survived the scrub');
  assert.ok(out.repository.full_name === 'sirinx-os', 'needed routing field lost');
});

test('scrubEvent keeps partition metadata and marks the record', () => {
  const rec = scrubEvent({
    topic: 'github.events',
    key: 'ton36475-lgtm/sirinx-secret-recon',
    partition: 2,
    headers: { 'event-type': 'push' },
    value: JSON.stringify({ action: 'opened', token: SECRET_VALUE }),
  });
  assert.equal(rec.topic, 'github.events');
  assert.equal(rec.partition, 2);
  assert.equal(rec.key, 'ton36475-lgtm/sirinx-secret-recon');
  assert.equal(rec.headers['event-type'], 'push');
  assert.equal(rec.value.token, SCRUBBED);
  assert.equal(rec.value.action, 'opened');
});

test('scrubEvent tolerates non-JSON payloads', () => {
  const rec = scrubEvent({ topic: 't', value: 'not json ' + GITHUB_PAT });
  assert.ok(!JSON.stringify(rec).includes('ghp'));
});
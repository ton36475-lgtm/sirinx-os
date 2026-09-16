import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  getOmniRouteStatus,
  resolveOmniRouteBinary,
  runOmniRouteCommand
} from '../integrations/omniroute-connector/index.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));

async function createExecutable(directory, name = 'omniroute') {
  const executable = join(directory, name);
  await writeFile(executable, '#!/bin/sh\nexit 0\n', 'utf8');
  await chmod(executable, 0o755);
  return executable;
}

test('reports a real local artifact without executing it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'omniroute-status-'));
  const executable = await createExecutable(directory);

  const status = getOmniRouteStatus({ candidates: [executable] });

  assert.equal(status.installation.installed, true);
  assert.equal(status.installation.state, 'local-artifact-found');
  assert.equal(status.installation.binaryPath, await realpath(executable));
});

test('reports not-installed when every candidate is missing', () => {
  const status = getOmniRouteStatus({ candidates: ['/definitely/missing/omniroute'] });

  assert.equal(status.installation.installed, false);
  assert.equal(status.installation.state, 'not-installed');
  assert.equal(status.installation.binaryPath, null);
});

test('rejects cmux shims even when a launcher resolves into the shim directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'omniroute-shim-'));
  const shimDirectory = join(directory, 'cmux-cli-shims');
  const realDirectory = join(directory, 'real-bin');
  await chmod(directory, 0o755);
  await mkdir(shimDirectory);
  await mkdir(realDirectory);
  const shim = await createExecutable(shimDirectory);
  const launcher = join(realDirectory, 'omniroute');
  await symlink(shim, launcher);

  assert.equal(resolveOmniRouteBinary({ candidates: [launcher] }), null);
});

test('command path remains a non-executing preview behind an exact gate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'omniroute-preview-'));
  const executable = await createExecutable(directory);

  const result = await runOmniRouteCommand(['status'], { candidates: [executable] });

  assert.deepEqual(result.commandPreview, ['omniroute', 'status']);
  assert.equal(result.status, 'blocked-execution-gate');
  assert.equal(result.executionAllowed, false);
});

test('connector source has no child-process execution import or spawn call', async () => {
  const source = await readFile(
    join(TEST_DIR, '../integrations/omniroute-connector/index.mjs'),
    'utf8'
  );

  assert.doesNotMatch(source, /node:child_process/);
  assert.doesNotMatch(source, /\bspawn\s*\(/);
});

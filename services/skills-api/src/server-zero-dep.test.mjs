import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import test from 'node:test';

const SERVER_PATH = new URL('./server-zero-dep.mjs', import.meta.url);

async function findFreePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitForHealth(child, port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`server exited before health check (exit ${child.exitCode})`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return response.json();
    } catch {
      // The listener may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`server did not listen on the requested port ${port}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await once(child, 'exit');
}

test('combined server accepts SKILLS_WS_PORT as a compatibility alias', async () => {
  const port = await findFreePort();
  const env = {
    ...process.env,
    SKILLS_API_HOST: '127.0.0.1',
    SKILLS_WS_PORT: String(port),
  };
  delete env.SKILLS_API_PORT;

  const child = spawn(process.execPath, [SERVER_PATH.pathname], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const health = await waitForHealth(child, port);
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'ghostclaw-skills-api');
  } finally {
    await stopChild(child);
  }
});

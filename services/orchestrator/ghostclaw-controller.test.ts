import assert from "node:assert/strict";
import { test } from "node:test";

import { startGhostClawController } from "./ghostclaw-controller.ts";

test("startGhostClawController writes timestamped startup logs", () => {
  const messages: string[] = [];
  const originalLog = console.log;

  console.log = (message?: unknown) => {
    messages.push(String(message));
  };

  try {
    startGhostClawController();
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(messages.map((message) => message.replace(/^\S+ /, "")), [
    "[GhostClawController] Controller starting",
    "[GhostClawController] Core control plane ready",
  ]);

  for (const message of messages) {
    assert.match(
      message,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[GhostClawController\] .+$/,
    );
  }
});

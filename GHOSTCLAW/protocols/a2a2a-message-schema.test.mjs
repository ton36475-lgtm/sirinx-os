import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaPath = new URL("./a2a2a-message-schema.json", import.meta.url);

describe("A2A2A message schema", () => {
  it("parses as JSON and exposes Autonomous Safe Execution v3 metadata", () => {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

    expect(schema.properties.autonomous_approval.properties.safe_replacement_actions).toMatchObject({
      type: "array"
    });
    expect(schema.properties.safe_execution_v3).toMatchObject({
      type: "object",
      additionalProperties: true
    });
    expect(schema.properties.safe_execution_v3.properties.blocked_action_behavior.enum).toContain(
      "auto_block_and_continue"
    );
    expect(schema.properties.safe_execution_v3.properties.human_prompt_required).toMatchObject({
      type: "boolean"
    });
    expect(schema.properties.safe_execution_v3.properties.receipt_format.enum).toContain(
      "ghostclaw.receipt.v3_1"
    );
    expect(schema.properties.safe_execution_v3.properties.runtime_telemetry_gate.properties).toMatchObject({
      enforce_deterministic_fallback: { type: "boolean" },
      suppress_interactive_prompts: { type: "boolean" }
    });
  });
});

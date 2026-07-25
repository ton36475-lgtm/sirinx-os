import assert from "node:assert/strict";
import test from "node:test";

import { extractLeadPayload, getLeadIntakeSchema, handleLeadSubmit } from "./worker.js";

function createMockD1() {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        sql,
        bindings: [],
        bind(...values) {
          this.bindings = values;
          return this;
        },
        async run() {
          statements.push({ sql: this.sql, bindings: this.bindings });
          return { success: true };
        }
      };
    }
  };
}

test("lead schema remains an explicit public-write contract", () => {
  const schema = getLeadIntakeSchema();
  assert.equal(schema.endpoint, "/api/trpc/lead.submit");
  assert.equal(schema.method, "POST");
  assert.equal(schema.commandCenterProbeBehavior, "GET only; never creates production leads");
  assert.equal(schema.reviewGates.includes("production POST smoke requires explicit approval"), true);
});

test("lead extraction accepts the documented tRPC numeric-keyed shape", () => {
  const result = extractLeadPayload({
    0: {
      json: {
        source: "assessment",
        name: "Test Lead",
        email: "test@example.invalid",
        monthlyBill: "45000"
      }
    }
  });

  assert.equal(result.isBatch, true);
  assert.equal(result.lead.name, "Test Lead");
  assert.equal(result.lead.monthlyBill, "45000");
});

test("missing D1 binding fails closed without a write", async () => {
  const response = await handleLeadSubmit(
    new Request("https://www.sirinx.co/api/trpc/lead.submit", {
      method: "POST",
      body: JSON.stringify({ json: { name: "Test Lead", email: "test@example.invalid" } })
    }),
    {}
  );

  assert.equal(response.status, 503);
});

test("a valid synthetic lead writes only to the injected mock binding", async () => {
  const db = createMockD1();
  const response = await handleLeadSubmit(
    new Request("https://www.sirinx.co/api/trpc/lead.submit?batch=1", {
      method: "POST",
      body: JSON.stringify({
        0: { json: { source: "contact", name: "Test Lead", phone: "0000000000" } }
      })
    }),
    { LEAD_DB: db }
  );

  assert.equal(response.status, 200);
  assert.equal(db.statements.length, 2);
  assert.equal(db.statements[1].bindings.includes("Test Lead"), true);
});

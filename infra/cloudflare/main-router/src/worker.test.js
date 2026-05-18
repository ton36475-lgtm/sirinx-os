import { describe, expect, it } from "vitest";
import { extractLeadPayload, getLeadIntakeSchema, handleLeadSubmit } from "./worker.js";

function createMockD1() {
  const statements = [];

  return {
    statements,
    prepare(sql) {
      const statement = {
        sql,
        bindings: [],
        bind(...values) {
          this.bindings = values;
          return this;
        },
        async run() {
          statements.push({
            sql: this.sql,
            bindings: this.bindings
          });
          return { success: true };
        }
      };
      return statement;
    }
  };
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

describe("main-router lead payload extraction", () => {
  it("exposes a read-only lead intake schema contract", () => {
    const schema = getLeadIntakeSchema();

    expect(schema.version).toBe("2026-05-19.lead-intake.v1");
    expect(schema.endpoint).toBe("/api/trpc/lead.submit");
    expect(schema.required.all).toContain("name");
    expect(schema.required.oneOf).toEqual(["phone", "email", "lineUserId"]);
    expect(schema.payloadShapes).toContain("tRPC numeric-keyed batch");
    expect(schema.fields.map((field) => field.name)).toContain("monthlyBill");
    expect(schema.reviewGates).toContain("production POST smoke requires explicit approval");
  });

  it("extracts a tRPC numeric-keyed batch payload", () => {
    const result = extractLeadPayload({
      0: {
        json: {
          source: "contact",
          name: "Ada Solar",
          phone: "0812345678",
          monthlyBill: "45000"
        }
      }
    });

    expect(result.isBatch).toBe(true);
    expect(result.lead).toMatchObject({
      source: "contact",
      name: "Ada Solar",
      phone: "0812345678",
      monthlyBill: "45000"
    });
  });

  it("extracts array batch and input.json payload variants", () => {
    const result = extractLeadPayload([
      {
        input: {
          json: {
            source: "assessment",
            name: "Grace Energy",
            email: "grace@example.com",
            systemSize: "120 kWp",
            bessInterest: "yes"
          }
        }
      }
    ]);

    expect(result.isBatch).toBe(true);
    expect(result.lead).toMatchObject({
      source: "assessment",
      name: "Grace Energy",
      email: "grace@example.com",
      systemSize: "120 kWp",
      bessInterest: "yes"
    });
  });

  it("trims and bounds free-form fields", () => {
    const result = extractLeadPayload({
      json: {
        name: "  Nida  ",
        phone: "  0800000000  ",
        message: "x".repeat(5000)
      }
    });

    expect(result.lead.name).toBe("Nida");
    expect(result.lead.phone).toBe("0800000000");
    expect(result.lead.message).toHaveLength(4000);
  });
});

describe("main-router handleLeadSubmit", () => {
  it("stores a valid tRPC batch lead into D1", async () => {
    const db = createMockD1();
    const response = await handleLeadSubmit(
      new Request("https://www.sirinx.co/api/trpc/lead.submit?batch=1", {
        method: "POST",
        body: JSON.stringify({
          0: {
            json: {
              source: "contact",
              name: "Ada Solar",
              phone: "0812345678",
              interest: "Solar Carport",
              monthlyBill: "45000"
            }
          }
        })
      }),
      { LEAD_DB: db }
    );

    expect(response.status).toBe(200);
    const payload = await readJson(response);
    expect(payload[0].result.data.json.ok).toBe(true);
    expect(db.statements).toHaveLength(2);
    expect(db.statements[1].bindings).toContain("Ada Solar");
    expect(db.statements[1].bindings).toContain("0812345678");
  });

  it("accepts an email-only partner lead because email is a contact channel", async () => {
    const db = createMockD1();
    const response = await handleLeadSubmit(
      new Request("https://www.sirinx.co/api/trpc/lead.submit?batch=1", {
        method: "POST",
        body: JSON.stringify({
          0: {
            json: {
              source: "partner",
              name: "Partner Lead",
              email: "partner@example.com",
              interest: "พันธมิตร: investor"
            }
          }
        })
      }),
      { LEAD_DB: db }
    );

    expect(response.status).toBe(200);
    expect(db.statements[1].bindings).toContain("partner@example.com");
  });

  it("rejects a lead without any contact channel", async () => {
    const response = await handleLeadSubmit(
      new Request("https://www.sirinx.co/api/trpc/lead.submit", {
        method: "POST",
        body: JSON.stringify({
          json: {
            name: "No Channel"
          }
        })
      }),
      { LEAD_DB: createMockD1() }
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: {
        message: "At least one contact channel is required"
      }
    });
  });

  it("returns 503 when the lead database binding is missing", async () => {
    const response = await handleLeadSubmit(
      new Request("https://www.sirinx.co/api/trpc/lead.submit", {
        method: "POST",
        body: JSON.stringify({
          json: {
            name: "Missing Binding",
            phone: "0812345678"
          }
        })
      }),
      {}
    );

    expect(response.status).toBe(503);
  });
});

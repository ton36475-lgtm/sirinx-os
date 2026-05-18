import { describe, expect, it } from "vitest";
import { qualifyLead } from "./lead-qualification.mjs";

describe("lead qualification model", () => {
  it("routes a high-bill hybrid assessment lead to sales engineering review", () => {
    const result = qualifyLead({
      source: "assessment",
      name: "High Load Home",
      phone: "0812345678",
      email: "owner@example.com",
      monthlyBill: "8,500",
      systemType: "hybrid solar",
      bessInterest: "yes",
      timeline: "this month"
    });

    expect(result.externalWrites).toBe(false);
    expect(result.modelVersion).toBe("2026-05-19.lead-qualification.v1");
    expect(result.priority).toBe("hot");
    expect(result.workflowLane).toBe("sales-engineering-review");
    expect(result.packageLane).toBe("hybrid-h10");
  });

  it("keeps low-information leads in education mode", () => {
    const result = qualifyLead({
      source: "contact",
      name: "Early Research",
      email: "lead@example.com",
      monthlyBill: "2500"
    });

    expect(result.priority).toBe("nurture");
    expect(result.workflowLane).toBe("nurture-and-education");
    expect(result.packageLane).toBe("on-grid-og5");
  });

  it("blocks workflow routing when no contact channel exists", () => {
    const result = qualifyLead({
      name: "No Contact",
      monthlyBill: "12000",
      bessInterest: "backup"
    });

    expect(result.workflowLane).toBe("missing-contact-channel");
    expect(result.nextAction).toContain("valid contact channel");
  });
});

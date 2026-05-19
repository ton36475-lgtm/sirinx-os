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
    expect(result.modelVersion).toBe("2026-05-20.lead-qualification.v2");
    expect(result.priority).toBe("hot");
    expect(result.workflowLane).toBe("sales-engineering-review");
    expect(result.packageLane).toBe("hybrid-h10");
    expect(result.trafficStatus).toBe("trusted");
    expect(result.solarSegment).toBe("residential-hybrid");
    expect(result.reasons.length).toBeGreaterThan(0);
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
    expect(result.trafficStatus).toBe("suspicious");
  });

  it("blocks workflow routing when no contact channel exists", () => {
    const result = qualifyLead({
      name: "No Contact",
      monthlyBill: "12000",
      bessInterest: "backup"
    });

    expect(result.workflowLane).toBe("missing-contact-channel");
    expect(result.riskFlags).toContain("missing-contact-channel");
    expect(result.nextAction).toContain("valid contact channel");
  });

  it("adds attribution reasons for UTM-qualified traffic", () => {
    const result = qualifyLead({
      source: "assessment",
      name: "Home Office Owner",
      phone: "0812345678",
      monthlyBill: "18000",
      systemType: "hybrid",
      bessInterest: "backup",
      utmSource: "google",
      utmCampaign: "home-solution-high-load",
      referrer: "https://www.google.com",
      landingPage: "/home-solution/",
      deviceType: "mobile"
    });

    expect(result.priority).toBe("hot");
    expect(result.workflowLane).toBe("sales-engineering-review");
    expect(result.packageLane).toBe("hybrid-h20-engineered");
    expect(result.solarSegment).toBe("large-home-office-hybrid-bess");
    expect(result.attribution.utmSource).toBe("google");
    expect(result.reasons).toEqual(expect.arrayContaining(["UTM source is present for campaign attribution."]));
  });

  it("marks preview and bot-like traffic for review", () => {
    const result = qualifyLead({
      source: "contact",
      name: "Test Lead Bot",
      monthlyBill: "18000",
      bessInterest: "yes",
      landingPage: "/preview",
      referrer: "http://localhost:3000",
      deviceType: "unknown"
    });

    expect(result.workflowLane).toBe("missing-contact-channel");
    expect(result.trafficStatus).toBe("suspicious");
    expect(result.riskFlags).toEqual(
      expect.arrayContaining(["suspicious-pattern-detected", "missing-contact-channel", "unknown-device-type"])
    );
  });
});

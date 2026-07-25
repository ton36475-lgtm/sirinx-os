import { describe, expect, it } from "vitest";
import {
  getPocketHatcherySummary,
  listPocketHatcheryCreatures,
} from "./pocket-hatchery";

describe("pocket hatchery view-model", () => {
  it("loads the sample creatures as a deterministic read-only catalog", () => {
    const creatures = listPocketHatcheryCreatures();

    expect(creatures).toHaveLength(3);
    expect(creatures.map((creature) => creature.id)).toContain("plakod_egg");
    expect(creatures.every((creature) => creature.deterministic)).toBe(true);
    expect(creatures.map((creature) => creature.stage)).toContain("egg");
  });

  it("summarizes safety boundaries for the route", () => {
    const summary = getPocketHatcherySummary();

    expect(summary.route).toBe("/pocket-hatchery");
    expect(summary.externalWrites).toBe(false);
    expect(summary.paidRandomness).toBe(false);
    expect(summary.publicWalletPath).toEqual(["WAX Cloud Wallet", "My Cloud Wallet"]);
  });
});

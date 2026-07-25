import sampleCatalog from "../../../pocket-hatchery/schemas/sample_creatures.json";

export type PocketHatcheryCreature = {
  id: string;
  name: string;
  family: string;
  rarity: string;
  stage: string;
  deterministic: boolean;
  evolvesTo: string | null;
  evolveConditions: Array<{
    type: string;
    value: number;
  }>;
  metadataUri: string;
};

export type PocketHatcherySummary = {
  route: "/pocket-hatchery";
  version: string;
  totalCreatures: number;
  externalWrites: false;
  paidRandomness: false;
  publicWalletPath: ["WAX Cloud Wallet", "My Cloud Wallet"];
  blockedActions: string[];
};

type SampleCreature = {
  id: string;
  name: string;
  family: string;
  rarity: string;
  stage: string;
  deterministic: boolean;
  evolves_to?: string;
  evolve_conditions: Array<{
    type: string;
    value: number;
  }>;
  metadata_uri: string;
};

type SampleCatalog = {
  version: string;
  creatures: SampleCreature[];
};

const catalog = sampleCatalog as SampleCatalog;

export function listPocketHatcheryCreatures(): PocketHatcheryCreature[] {
  return catalog.creatures.map((creature) => ({
    id: creature.id,
    name: creature.name,
    family: creature.family,
    rarity: creature.rarity,
    stage: creature.stage,
    deterministic: creature.deterministic,
    evolvesTo: creature.evolves_to ?? null,
    evolveConditions: creature.evolve_conditions.map((condition) => ({
      type: condition.type,
      value: condition.value,
    })),
    metadataUri: creature.metadata_uri,
  }));
}

export function getPocketHatcherySummary(): PocketHatcherySummary {
  return {
    route: "/pocket-hatchery",
    version: catalog.version,
    totalCreatures: catalog.creatures.length,
    externalWrites: false,
    paidRandomness: false,
    publicWalletPath: ["WAX Cloud Wallet", "My Cloud Wallet"],
    blockedActions: [
      "paid randomness",
      "loot box minting",
      "cash-out mechanics",
      "inline private key input",
      "server-side signing",
    ],
  };
}

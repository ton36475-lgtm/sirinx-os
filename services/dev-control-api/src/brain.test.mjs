import { describe, expect, it } from "vitest";
import { brainRoots, listBrainNotes, getBrainNote } from "./brain.mjs";

describe("brain (knowledge note index)", () => {
  it("exports expected symbols", () => {
    expect(Array.isArray(brainRoots)).toBe(true);
    expect(typeof listBrainNotes).toBe("function");
    expect(typeof getBrainNote).toBe("function");
  });

  it("brainRoots contains known root ids", () => {
    const ids = brainRoots.map((r) => r.id);
    expect(ids).toContain("sirinx");
    expect(ids).toContain("kms");
    expect(ids).toContain("docs");
    expect(ids).toContain("skills");
  });

  it("each brain root has id, label, root, kind", () => {
    for (const root of brainRoots) {
      expect(root).toHaveProperty("id");
      expect(root).toHaveProperty("label");
      expect(root).toHaveProperty("root");
      expect(root).toHaveProperty("kind");
    }
  });

  it("listBrainNotes returns structured result with roots and notes", async () => {
    const result = await listBrainNotes();
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("rootCount");
    expect(result).toHaveProperty("roots");
    expect(result).toHaveProperty("noteCount");
    expect(result).toHaveProperty("totals");
    expect(Array.isArray(result.roots)).toBe(true);
    expect(Array.isArray(result.notes)).toBe(true);
    // Every root reports ok boolean
    for (const root of result.roots) {
      expect(typeof root.ok).toBe("boolean");
    }
  });

  it("listBrainNotes totals include openTasks, doneTasks, links", async () => {
    const result = await listBrainNotes();
    expect(result.totals).toHaveProperty("openTasks");
    expect(result.totals).toHaveProperty("doneTasks");
    expect(result.totals).toHaveProperty("links");
  });

  it("getBrainNote returns null for nonexistent slug", async () => {
    const note = await getBrainNote("nonexistent-slug-xyz-12345");
    expect(note).toBeNull();
  });
});

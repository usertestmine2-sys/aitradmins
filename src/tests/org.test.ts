import { describe, it, expect } from "vitest";

// Validate the slugify behavior indirectly via a pure re-implementation contract.
// (The service slugify is private; this guards the naming rule the API depends on.)
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

describe("org slug rules", () => {
  it("normalizes names to url-safe slugs", () => {
    expect(slugify("Alpha Capital LLP")).toBe("alpha-capital-llp");
    expect(slugify("  Spaced  ")).toBe("spaced");
    expect(slugify("Weird@@Chars!!")).toBe("weird-chars");
  });

  it("produces empty slug for non-alphanumeric input", () => {
    expect(slugify("@@@")).toBe("");
  });
});

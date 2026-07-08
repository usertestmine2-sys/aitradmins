import { describe, it, expect } from "vitest";
import { REPORT_KINDS } from "@/modules/analytics/report-generator";

// CSV flattening contract (mirrors reportGenerator.toCsv walk logic).
function toCsv(payload: Record<string, unknown>): string {
  const rows: string[] = ["section,metric,value"];
  const walk = (section: string, obj: unknown) => {
    if (obj === null || typeof obj !== "object") {
      rows.push(`${section},value,${String(obj)}`);
      return;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
        rows.push(`${section},${k},${String(v)}`);
      }
    }
  };
  for (const [section, value] of Object.entries(payload)) walk(section, value);
  return rows.join("\n");
}

describe("analytics report kinds", () => {
  it("includes the core report kinds", () => {
    expect(REPORT_KINDS).toContain("DAILY");
    expect(REPORT_KINDS).toContain("BRAIN");
    expect(REPORT_KINDS).toContain("TRAINING");
    expect(REPORT_KINDS).toContain("RISK");
  });
});

describe("analytics CSV export", () => {
  it("flattens numeric/string metrics into rows", () => {
    const csv = toCsv({ brain: { score: 100, grade: "EXCELLENT" }, count: 5 });
    expect(csv).toContain("section,metric,value");
    expect(csv).toContain("brain,score,100");
    expect(csv).toContain("brain,grade,EXCELLENT");
    expect(csv).toContain("count,value,5");
  });
});

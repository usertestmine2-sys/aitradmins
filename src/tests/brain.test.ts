import { describe, it, expect } from "vitest";
import { confidenceBucket } from "@/modules/brain/calibration";

describe("brain/calibration bucketing", () => {
  it("maps confidence to deciles 0..9", () => {
    expect(confidenceBucket(0)).toBe(0);
    expect(confidenceBucket(0.05)).toBe(0);
    expect(confidenceBucket(0.55)).toBe(5);
    expect(confidenceBucket(0.99)).toBe(9);
    expect(confidenceBucket(1)).toBe(9);
  });

  it("clamps out-of-range values", () => {
    expect(confidenceBucket(-1)).toBe(0);
    expect(confidenceBucket(2)).toBe(9);
  });
});

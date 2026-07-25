import { describe, expect, it } from "vitest";
import { computeBackoffDelay } from "./socketManager";

describe("computeBackoffDelay", () => {
  it("starts at 1s and doubles each attempt", () => {
    expect(computeBackoffDelay(0)).toBe(1000);
    expect(computeBackoffDelay(1)).toBe(2000);
    expect(computeBackoffDelay(2)).toBe(4000);
    expect(computeBackoffDelay(3)).toBe(8000);
  });

  it("caps at 30s", () => {
    expect(computeBackoffDelay(10)).toBe(30_000);
    expect(computeBackoffDelay(20)).toBe(30_000);
  });
});

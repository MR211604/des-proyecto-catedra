import { describe, expect, it } from "vitest";
import { formatDashboardMoney } from "./formatters.ts";

describe("formatDashboardMoney", () => {
  it("preserves cents instead of rounding whole dollars", () => {
    expect(formatDashboardMoney("49.70")).toBe("$49.70");
  });
});

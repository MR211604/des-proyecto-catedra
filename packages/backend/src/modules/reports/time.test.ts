import { describe, expect, it } from "vitest";
import { dateGroupKey, resolveReportPeriod } from "./time.js";

describe("report periods", () => {
  it("resolves an inclusive Salvador calendar day to UTC boundaries", () => {
    const period = resolveReportPeriod({
      from: "2026-09-24",
      to: "2026-09-24",
    });

    expect(period.timezone).toBe("America/El_Salvador");
    expect(period.from.toISOString()).toBe("2026-09-24T06:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-09-25T06:00:00.000Z");
  });

  it("groups dates according to the selected calendar grain", () => {
    const date = new Date("2026-09-24T12:00:00.000Z");

    expect(dateGroupKey(date, "day")).toBe("2026-09-24");
    expect(dateGroupKey(date, "month")).toBe("2026-09");
    expect(dateGroupKey(date, "week")).toBe("2026-09-21");
  });
});

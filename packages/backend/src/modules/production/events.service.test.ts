import { beforeEach, describe, expect, it, vi } from "vitest";

const publish = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
vi.mock("./events.js", () => ({ productionEvents: { publish } }));
vi.mock("../../db/prisma.js", () => ({
  prisma: { $transaction: transaction },
}));
vi.mock("../../lib/audit.js", () => ({ createAuditLog: vi.fn() }));

const { createStage } = await import("./service.js");

describe("production mutation notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes only after the stage transaction resolves", async () => {
    const stage = { id: "stage_1", name: "Corte", position: 1 };
    transaction.mockImplementation(async (callback) =>
      callback({
        productionStage: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(stage),
        },
      }),
    );

    await expect(createStage({ name: "Corte" }, "user_1")).resolves.toEqual(
      stage,
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "production.changed",
        operation: "production.stage.created",
        actorId: "user_1",
        context: { stage: { id: "stage_1" } },
      }),
    );
    expect(transaction.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
      publish.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not publish when the stage transaction fails", async () => {
    transaction.mockRejectedValue(new Error("rollback"));

    await expect(createStage({ name: "Corte" }, "user_1")).rejects.toThrow(
      "rollback",
    );
    expect(publish).not.toHaveBeenCalled();
  });
});

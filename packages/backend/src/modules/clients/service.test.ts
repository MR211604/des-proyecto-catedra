import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../middleware/errors.js";

const { transaction, clientFindUnique, clientUpdate } = vi.hoisted(() => ({
  transaction: vi.fn(),
  clientFindUnique: vi.fn(),
  clientUpdate: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: { $transaction: transaction },
}));

const { updateClient } = await import("./service.js");

const tx = {
  client: {
    findUnique: clientFindUnique,
    update: clientUpdate,
  },
};

describe("client service persistence boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
  });

  it("does not edit an inactive customer", async () => {
    clientFindUnique.mockResolvedValue({
      id: "client_1",
      deletedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    await expect(
      updateClient("client_1", { phone: "+56 9 1234 5678" }),
    ).rejects.toEqual(
      new AppError(409, "Inactive clients can only be restored"),
    );
    expect(clientUpdate).not.toHaveBeenCalled();
  });
});

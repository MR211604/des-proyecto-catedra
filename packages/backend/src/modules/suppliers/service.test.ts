import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../middleware/errors.js";

const { transaction, supplierFindUnique, supplierUpdate } = vi.hoisted(() => ({
  transaction: vi.fn(),
  supplierFindUnique: vi.fn(),
  supplierUpdate: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    supplier: { findUnique: supplierFindUnique },
  },
}));

const { getSupplierById, updateSupplier } = await import("./service.js");

const tx = {
  supplier: {
    findUnique: supplierFindUnique,
    update: supplierUpdate,
  },
};

describe("supplier service persistence boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
      async (callback: (supplier: typeof tx) => unknown) => callback(tx),
    );
  });

  it("does not edit an inactive supplier", async () => {
    supplierFindUnique.mockResolvedValue({
      id: "supplier_1",
      deletedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    await expect(
      updateSupplier("supplier_1", { phone: "+56 9 1234 5678" }),
    ).rejects.toEqual(
      new AppError(409, "Inactive suppliers can only be restored"),
    );
    expect(supplierUpdate).not.toHaveBeenCalled();
  });

  it("loads projected supplier materials ordered by name", async () => {
    supplierFindUnique.mockResolvedValue({
      id: "supplier_1",
      name: "Telas del Sur",
      items: [],
    });

    await expect(getSupplierById("supplier_1")).resolves.toEqual({
      id: "supplier_1",
      name: "Telas del Sur",
      items: [],
    });
    expect(supplierFindUnique).toHaveBeenCalledWith({
      where: { id: "supplier_1" },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            quantity: true,
            reorderPoint: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });
  });
});

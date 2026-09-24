import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../middleware/errors.js";

const {
  transaction,
  supplierFindUnique,
  supplierUpdate,
  inventoryItemCount,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  supplierFindUnique: vi.fn(),
  supplierUpdate: vi.fn(),
  inventoryItemCount: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    supplier: { findUnique: supplierFindUnique },
    inventoryItem: { count: inventoryItemCount },
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
    inventoryItemCount.mockResolvedValue(0);
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
      _count: { items: 0 },
    });

    await expect(getSupplierById("supplier_1")).resolves.toEqual({
      id: "supplier_1",
      name: "Telas del Sur",
      items: [],
      itemsCount: 0,
      itemsMeta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    expect(supplierFindUnique).toHaveBeenCalledWith({
      where: { id: "supplier_1" },
      include: {
        items: {
          where: {},
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
          skip: 0,
          take: 20,
        },
        _count: { select: { items: true } },
      },
    });
    expect(inventoryItemCount).toHaveBeenCalledWith({
      where: { supplierId: "supplier_1" },
    });
  });
});

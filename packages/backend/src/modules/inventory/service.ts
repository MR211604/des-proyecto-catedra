import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";
import { serialize, toPrismaDecimal } from "../utils.js";
import type {
  CreateInventoryItemInput,
  CreateStockMovementInput,
  ListInventoryItemsQuery,
  ListStockMovementsQuery,
  UpdateInventoryItemInput,
} from "./schema.js";

async function validateSupplier(
  tx: typeof prisma,
  supplierId: string | null | undefined,
) {
  if (!supplierId) return;

  const supplier = await tx.supplier.findFirst({
    where: { id: supplierId, deletedAt: null },
  });

  if (!supplier) {
    throw new AppError(400, "Supplier not found or deactivated");
  }
}

function mapSkuConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError(409, "Item with this SKU already exists");
  }
  throw error;
}

// ------------ OPERACIONES CRUD ------------
export async function listInventoryItems(params: ListInventoryItemsQuery) {
  const {
    page,
    limit,
    search,
    supplierId,
    unit,
    status,
    sortBy,
    order,
    includeDeleted,
  } = params;
  const skip = (page - 1) * limit;

  const availabilityFilter =
    status === "sufficient"
      ? {
          deletedAt: null,
          quantity: { gt: prisma.inventoryItem.fields.reorderPoint },
        }
      : status === "low"
        ? {
            deletedAt: null,
            quantity: {
              gt: 0,
              lte: prisma.inventoryItem.fields.reorderPoint,
            },
          }
        : status === "out"
          ? { deletedAt: null, quantity: { lte: 0 } }
          : null;

  const statusFilter =
    status === "all" || (status === undefined && includeDeleted)
      ? {}
      : status === "inactive"
        ? { deletedAt: { not: null } }
        : (availabilityFilter ?? { deletedAt: null });

  const where = {
    ...statusFilter,
    ...(supplierId ? { supplierId } : {}),
    ...(unit ? { unit } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return {
    data: serialize(data),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getInventoryItemById(id: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!item) {
    throw new AppError(404, "Item not found");
  }

  return serialize(item);
}

export async function createInventoryItem(data: CreateInventoryItemInput) {
  return prisma
    .$transaction(async (tx) => {
      await validateSupplier(tx as typeof prisma, data.supplierId);

      const item = await tx.inventoryItem.create({
        data: {
          name: data.name,
          sku: data.sku ?? null,
          unit: data.unit,
          quantity: toPrismaDecimal(data.quantity),
          reorderPoint: toPrismaDecimal(data.reorderPoint),
          supplierId: data.supplierId ?? null,
        },
      });

      return serialize(item);
    })
    .catch(mapSkuConflict);
}

export async function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemInput,
) {
  return prisma
    .$transaction(async (tx) => {
      const before = await tx.inventoryItem.findUnique({ where: { id } });

      if (!before) {
        throw new AppError(404, "Item not found");
      }

      if (before.deletedAt !== null) {
        throw new AppError(409, "Item is deactivated");
      }

      if (
        data.supplierId !== undefined &&
        data.supplierId !== before.supplierId
      ) {
        await validateSupplier(tx as typeof prisma, data.supplierId);
      }

      const after = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.sku !== undefined ? { sku: data.sku ?? null } : {}),
          ...(data.reorderPoint !== undefined
            ? { reorderPoint: toPrismaDecimal(data.reorderPoint) }
            : {}),
          ...(data.supplierId !== undefined
            ? { supplierId: data.supplierId ?? null }
            : {}),
        },
      });

      return serialize(after);
    })
    .catch(mapSkuConflict);
}

export async function deleteInventoryItem(id: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id } });

    if (!item) {
      throw new AppError(404, "Item not found");
    }

    if (item.deletedAt !== null) {
      throw new AppError(409, "Item is already deleted");
    }

    const deleted = await tx.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return serialize(deleted);
  });
}

export async function restoreInventoryItem(id: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id } });

    if (!item) {
      throw new AppError(404, "Item not found");
    }

    if (item.deletedAt === null) {
      throw new AppError(409, "Item is not deleted");
    }

    const restored = await tx.inventoryItem.update({
      where: { id },
      data: { deletedAt: null },
    });

    return serialize(restored);
  });
}

// ------------ MOVIMIENTOS DE STOCK ------------
export async function createStockMovement(
  itemId: string,
  data: CreateStockMovementInput,
  actorId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: itemId, deletedAt: null },
      });

      if (!item) {
        throw new AppError(404, "Item not found");
      }

      if (data.unit !== item.unit) {
        throw new AppError(400, "Movement unit does not match the item unit");
      }

      const quantity = toPrismaDecimal(data.quantity);
      const delta =
        data.type === "ISSUE" || data.type === "SALE"
          ? quantity.negated()
          : quantity;

      const updatedQuantity = item.quantity.add(delta);

      if (
        (data.type === "ISSUE" || data.type === "SALE") &&
        updatedQuantity.isNegative()
      ) {
        throw new AppError(409, "Stock cannot go below zero");
      }

      const movement = await tx.stockMovement.create({
        data: {
          itemId,
          type: data.type,
          quantity,
          unit: data.unit,
          reference: data.reference ?? null,
          reason: data.reason ?? null,
          actorId,
        },
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: updatedQuantity },
      });

      return serialize(movement);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function listStockMovements(
  itemId: string,
  params: ListStockMovementsQuery,
) {
  const { page, limit, type, order } = params;

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });

  if (!item) {
    throw new AppError(404, "Item not found");
  }

  const where = { itemId, ...(type ? { type } : {}) };

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: { orderItem: true },
      orderBy: { createdAt: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: serialize(data),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

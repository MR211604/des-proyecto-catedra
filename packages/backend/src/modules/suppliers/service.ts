import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errors.js";
import { serialize } from "../utils.js";
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from "./schema.js";

// ------------ OPERACIONES CRUD ------------
export async function listSuppliers(params: ListSuppliersQuery) {
  const { page, limit, search, status, sortBy, order, includeDeleted } = params;
  const skip = (page - 1) * limit;

  const deletedFilter =
    status === "active"
      ? { deletedAt: null }
      : status === "inactive"
        ? { deletedAt: { not: null } }
        : status === "all" || includeDeleted
          ? {}
          : { deletedAt: null };

  const where = {
    ...deletedFilter,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
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

  if (!supplier) {
    throw new AppError(404, "Supplier not found");
  }

  return serialize(supplier);
}

export async function createSupplier(data: CreateSupplierInput) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data });

    return supplier;
  });
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.supplier.findUnique({ where: { id } });

    if (!before) {
      throw new AppError(404, "Supplier not found");
    }
    if (before.deletedAt !== null) {
      throw new AppError(409, "Inactive suppliers can only be restored");
    }

    const after = await tx.supplier.update({ where: { id }, data });
    return after;
  });
}

export async function deleteSupplier(id: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new AppError(404, "Supplier not found");
    }

    if (supplier.deletedAt !== null) {
      throw new AppError(409, "Supplier is already deleted");
    }

    const deleted = await tx.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return deleted;
  });
}

export async function restoreSupplier(id: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new AppError(404, "Supplier not found");
    }

    if (supplier.deletedAt === null) {
      throw new AppError(409, "Supplier is not deleted");
    }

    const restored = await tx.supplier.update({
      where: { id },
      data: { deletedAt: null },
    });
    return restored;
  });
}

import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errors.js";
import { createAuditLog } from "../../lib/audit.js";
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "./schema.js";

const ENTITY_TYPE = "Client";

export async function listClients(params: ListClientsQuery) {
  const { page, limit, search, sortBy, order, includeDeleted } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
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
    prisma.client.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
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

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    throw new AppError(404, "Client not found");
  }

  return client;
}

export async function createClient(data: CreateClientInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({ data });

    await createAuditLog(tx as typeof prisma, {
      actorId,
      action: "client.created",
      entityType: ENTITY_TYPE,
      entityId: client.id,
      after: client,
    });

    return client;
  });
}

export async function updateClient(
  id: string,
  data: UpdateClientInput,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.client.findUnique({ where: { id } });

    if (!before) {
      throw new AppError(404, "Client not found");
    }

    const after = await tx.client.update({ where: { id }, data });

    await createAuditLog(tx as typeof prisma, {
      actorId,
      action: "client.updated",
      entityType: ENTITY_TYPE,
      entityId: id,
      before,
      after,
    });

    return after;
  });
}

export async function deleteClient(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id } });

    if (!client) {
      throw new AppError(404, "Client not found");
    }

    if (client.deletedAt !== null) {
      throw new AppError(409, "Client is already deleted");
    }

    const deleted = await tx.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog(tx as typeof prisma, {
      actorId,
      action: "client.deleted",
      entityType: ENTITY_TYPE,
      entityId: id,
      before: client,
      after: deleted,
    });

    return deleted;
  });
}

export async function restoreClient(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id } });

    if (!client) {
      throw new AppError(404, "Client not found");
    }

    if (client.deletedAt === null) {
      throw new AppError(409, "Client is not deleted");
    }

    const restored = await tx.client.update({
      where: { id },
      data: { deletedAt: null },
    });

    await createAuditLog(tx as typeof prisma, {
      actorId,
      action: "client.restored",
      entityType: ENTITY_TYPE,
      entityId: id,
      before: client,
      after: restored,
    });

    return restored;
  });
}

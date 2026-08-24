import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

interface AuditLogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function createAuditLog(
  tx: PrismaClient | TransactionClient,
  params: AuditLogParams,
): Promise<void> {
  await (tx as PrismaClient).auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before !== undefined ? (params.before as Prisma.InputJsonValue) : undefined,
      after: params.after !== undefined ? (params.after as Prisma.InputJsonValue) : undefined,
    },
  });
}

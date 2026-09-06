import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAuditLog } from "../../lib/audit.js";
import { AppError } from "../../middleware/errors.js";
import { type ActiveStage, deriveJobStatus } from "../production/service.js";
import { serialize, stateConflict, toPrismaDecimal } from "../utils.js";
import type { CreateOrderInput, ListOrdersQuery } from "./schema.js";

const ENTITY_TYPE = "CustomerOrder";
const orderInclude = {
  client: true,
  quote: true,
  items: true,
  jobs: { include: { stage: true, events: true } },
} as const;

function orderData(input: CreateOrderInput) {
  const items = input.items.map((item) => ({
    description: item.description,
    quantity: toPrismaDecimal(item.quantity),
    unitPrice: toPrismaDecimal(item.unitPrice),
    total: toPrismaDecimal(item.quantity)
      .mul(toPrismaDecimal(item.unitPrice))
      .toDecimalPlaces(2),
    specifications: item.specifications as Prisma.InputJsonValue | undefined,
  }));

  return { items };
}

async function validateJobs(tx: typeof prisma, input: CreateOrderInput) {
  for (const job of input.jobs) {
    if (
      job.orderItemIndex !== undefined &&
      job.orderItemIndex >= input.items.length
    ) {
      throw new AppError(400, "Production job orderItemIndex is out of range");
    }
  }

  const stageIds = [...new Set(input.jobs.map((job) => job.stageId))];
  const activeStages = await tx.productionStage.findMany({
    where: { isActive: true },
    select: { id: true, position: true },
  });
  const activeStageIds = new Set(activeStages.map((stage) => stage.id));
  if (stageIds.some((stageId) => !activeStageIds.has(stageId))) {
    throw new AppError(404, "Active production stage not found");
  }
  return activeStages;
}

function jobData(
  input: CreateOrderInput,
  items: Array<{ id: string }>,
  activeStages: ActiveStage[],
) {
  return input.jobs.map((job) => ({
    stageId: job.stageId,
    orderItemId:
      job.orderItemIndex === undefined
        ? undefined
        : items[job.orderItemIndex]?.id,
    description: job.description,
    status: deriveJobStatus(
      activeStages.find((stage) => stage.id === job.stageId)?.position ?? -1,
      activeStages,
    ),
    assignedTo: job.assignedTo,
    dueDate: job.dueDate,
  }));
}

async function createJobs(
  tx: typeof prisma,
  orderId: string,
  input: CreateOrderInput,
  items: Array<{ id: string }>,
  activeStages: ActiveStage[],
) {
  await tx.productionJob.createMany({
    data: jobData(input, items, activeStages).map((job) => ({
      ...job,
      orderId,
    })),
  });
}

export async function createOrder(input: CreateOrderInput, actorId: string) {
  const data = orderData(input);
  return prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: input.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const activeStages = await validateJobs(tx as typeof prisma, input);

      const order = await tx.customerOrder.create({
        data: {
          clientId: input.clientId,
          dueDate: input.dueDate,
          notes: input.notes,
          items: { create: data.items },
        },
        include: { items: true },
      });
      await createJobs(
        tx as typeof prisma,
        order.id,
        input,
        order.items,
        activeStages,
      );
      const completeOrder = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });

      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "order.created",
        entityType: ENTITY_TYPE,
        entityId: order.id,
        after: serialize(completeOrder),
      });
      return serialize(completeOrder);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getOrderById(id: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found");
  return serialize(order);
}

export async function listOrders(params: ListOrdersQuery) {
  const { page, limit, status, clientId, search, sortBy, order } = params;
  const searchConditions = search
    ? [
        ...(/^\d+$/.test(search) ? [{ number: Number(search) }] : []),
        { notes: { contains: search, mode: "insensitive" as const } },
        {
          client: { name: { contains: search, mode: "insensitive" as const } },
        },
        {
          items: {
            some: {
              description: { contains: search, mode: "insensitive" as const },
            },
          },
        },
      ]
    : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(searchConditions ? { OR: searchConditions } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.customerOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customerOrder.count({ where }),
  ]);
  return {
    data: serialize(orders),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateOrder(
  id: string,
  input: CreateOrderInput,
  actorId: string,
) {
  const data = orderData(input);
  return prisma.$transaction(
    async (tx) => {
      const before = await tx.customerOrder.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!before) throw new AppError(404, "Order not found");
      if (before.status !== "CONFIRMED") {
        throw new AppError(409, "Only confirmed orders can be updated");
      }
      if (
        before.jobs.some(
          (job) => job.status !== "TODO" || job.events.length > 0,
        )
      ) {
        throw new AppError(
          409,
          "Orders with production activity cannot be updated",
        );
      }
      const client = await tx.client.findFirst({
        where: { id: input.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const activeStages = await validateJobs(tx as typeof prisma, input);

      await tx.productionJob.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      const updated = await tx.customerOrder.update({
        where: { id },
        data: {
          clientId: input.clientId,
          dueDate: input.dueDate,
          notes: input.notes,
          items: { create: data.items },
        },
        include: { items: true },
      });
      await createJobs(
        tx as typeof prisma,
        id,
        input,
        updated.items,
        activeStages,
      );
      const completeOrder = await tx.customerOrder.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "order.updated",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(before),
        after: serialize(completeOrder),
      });
      return serialize(completeOrder);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deleteOrder(id: string, actorId: string) {
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!order) throw new AppError(404, "Order not found");
      if (order.status !== "CONFIRMED") {
        throw new AppError(409, "Only confirmed orders can be deleted");
      }
      await tx.customerOrder.delete({ where: { id } });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "order.deleted",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(order),
      });
      return { id, deleted: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function transitionOrder(
  id: string,
  actorId: string,
  operation: "start" | "ready" | "deliver" | "cancel",
) {
  return prisma
    .$transaction(
      async (tx) => {
        const before = await tx.customerOrder.findUnique({
          where: { id },
          include: orderInclude,
        });
        if (!before) throw new AppError(404, "Order not found");

        let toStatus: "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";
        if (operation === "start") {
          if (before.status !== "CONFIRMED") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to IN_PRODUCTION`,
            );
          }
          toStatus = "IN_PRODUCTION";
        } else if (operation === "ready") {
          if (before.status !== "IN_PRODUCTION") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to READY`,
            );
          }
          if (before.jobs.some((job) => job.status !== "COMPLETED")) {
            throw new AppError(
              409,
              "All production jobs must be completed before the order is ready",
            );
          }
          toStatus = "READY";
        } else if (operation === "deliver") {
          if (before.status !== "READY") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to DELIVERED`,
            );
          }
          toStatus = "DELIVERED";
        } else {
          if (
            !["CONFIRMED", "IN_PRODUCTION", "READY"].includes(before.status)
          ) {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to CANCELLED`,
            );
          }
          toStatus = "CANCELLED";
        }

        const after = await tx.customerOrder.update({
          where: { id, status: before.status },
          data: {
            status: toStatus,
            ...(operation === "start" ? { lockedAt: new Date() } : {}),
            ...(operation === "deliver" ? { deliveredAt: new Date() } : {}),
          },
          include: orderInclude,
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: `order.${operation === "start" ? "started" : operation === "deliver" ? "delivered" : operation}`,
          entityType: ENTITY_TYPE,
          entityId: id,
          before: serialize(before),
          after: serialize(after),
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(stateConflict);
}

export function startOrderProduction(id: string, actorId: string) {
  return transitionOrder(id, actorId, "start");
}

export function markOrderReady(id: string, actorId: string) {
  return transitionOrder(id, actorId, "ready");
}

export function deliverOrder(id: string, actorId: string) {
  return transitionOrder(id, actorId, "deliver");
}

export function cancelOrder(id: string, actorId: string) {
  return transitionOrder(id, actorId, "cancel");
}

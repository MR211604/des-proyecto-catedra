import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAuditLog } from "../../lib/audit.js";
import { AppError } from "../../middleware/errors.js";
import { serialize, stateConflict } from "../utils.js";
import { productionEvents } from "./events.js";
import type {
  CreateStageInput,
  MoveJobInput,
  UpdateJobInput,
  UpdateStageInput,
} from "./schema.js";
import type { ProductionBoardQuery } from "./schema.js";

const ENTITY_TYPE = "ProductionStage";
const JOB_ENTITY_TYPE = "ProductionJob";
export const DEFAULT_STAGES = ["Preparación", "Corte", "Confección", "Acabado"];

function publishChange(
  operation: string,
  actorId: string,
  context: Parameters<typeof productionEvents.publish>[0]["context"],
) {
  productionEvents.publish({
    type: "production.changed",
    operation,
    actorId,
    occurredAt: new Date().toISOString(),
    context,
  });
}

export type ActiveStage = { id: string; position: number };

export function deriveJobStatus(
  position: number,
  activeStages: ActiveStage[],
): "TODO" | "IN_PROGRESS" | "COMPLETED" {
  const ordered = [...activeStages].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((stage) => stage.position === position);
  if (index < 0) throw new AppError(404, "Active production stage not found");
  if (index === 0) return "TODO";
  if (index === ordered.length - 1 && ordered.length >= 2) return "COMPLETED";
  return "IN_PROGRESS";
}

export async function listStages() {
  return prisma.productionStage.findMany({ orderBy: { position: "asc" } });
}

export async function createStage(input: CreateStageInput, actorId: string) {
  const stage = (await prisma
    .$transaction(
      async (tx) => {
        const last = await tx.productionStage.findFirst({
          orderBy: { position: "desc" },
          select: { position: true },
        });
        const position = input.position ?? (last?.position ?? 0) + 1;
        if (position > (last?.position ?? 0) + 1) {
          throw new AppError(
            400,
            "Stage position must be within the configured flow",
          );
        }
        if (
          await tx.productionStage.findFirst({
            where: { OR: [{ name: input.name }, { position }] },
          })
        ) {
          throw new AppError(
            409,
            "Production stage name or position already exists",
          );
        }
        const stage = await tx.productionStage.create({
          data: {
            name: input.name,
            position,
            isActive: input.isActive ?? true,
          },
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: "production.stage.created",
          entityType: ENTITY_TYPE,
          entityId: stage.id,
          after: serialize(stage),
        });
        return serialize(stage);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(mapStageConflict)) as { id: string };
  publishChange("production.stage.created", actorId, {
    stage: { id: stage.id },
  });
  return stage;
}

export async function updateStage(
  id: string,
  input: UpdateStageInput,
  actorId: string,
) {
  const stage = (await prisma
    .$transaction(
      async (tx) => {
        const before = await tx.productionStage.findUnique({
          where: { id },
          include: { jobs: true },
        });
        if (!before) throw new AppError(404, "Production stage not found");

        const activeCount = await tx.productionStage.count({
          where: { isActive: true },
        });
        if (input.isActive === false && before.isActive) {
          if (activeCount === 1) {
            throw new AppError(
              409,
              "The only active production stage cannot be deactivated",
            );
          }
          if (before.jobs.some((job) => job.status !== "COMPLETED")) {
            throw new AppError(
              409,
              "A stage with incomplete production jobs cannot be deactivated",
            );
          }
        }

        const stages = await tx.productionStage.findMany({
          orderBy: { position: "asc" },
        });
        const targetPosition = input.position ?? before.position;
        if (targetPosition > stages.length) {
          throw new AppError(
            400,
            "Stage position must be within the configured flow",
          );
        }
        const reorderedStages = stages.filter((stage) => stage.id !== id);
        reorderedStages.splice(Math.max(0, targetPosition - 1), 0, before);
        const reordered = reorderedStages.map((stage, index) => ({
          id: stage.id,
          position: index + 1,
        }));

        // Temporary negative positions avoid unique-position collisions during reorder.
        await Promise.all(
          reordered.map((stage) =>
            tx.productionStage.update({
              where: { id: stage.id },
              data: { position: -stage.position },
            }),
          ),
        );
        await Promise.all(
          reordered.map((stage) =>
            tx.productionStage.update({
              where: { id: stage.id },
              data: {
                position: stage.position,
                ...(stage.id === id
                  ? {
                      name: input.name ?? before.name,
                      isActive: input.isActive ?? before.isActive,
                    }
                  : {}),
              },
            }),
          ),
        );
        const after = await tx.productionStage.findUniqueOrThrow({
          where: { id },
        });
        const afterFlow = await tx.productionStage.findMany({
          orderBy: { position: "asc" },
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: "production.stage.updated",
          entityType: ENTITY_TYPE,
          entityId: id,
          before: serialize({ stage: before, flow: stages }),
          after: serialize({ stage: after, flow: afterFlow }),
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(mapStageConflict)) as { id: string };
  publishChange("production.stage.updated", actorId, {
    stage: { id: stage.id },
  });
  return stage;
}

export async function seedDefaultStages(actorId = "system:production-seed") {
  return prisma
    .$transaction(
      async (tx) => {
        const existing = await tx.productionStage.count();
        if (existing > 0)
          return tx.productionStage.findMany({ orderBy: { position: "asc" } });
        const stages = await Promise.all(
          DEFAULT_STAGES.map((name, index) =>
            tx.productionStage.create({ data: { name, position: index + 1 } }),
          ),
        );
        for (const stage of stages) {
          await createAuditLog(tx as typeof prisma, {
            actorId,
            action: "production.stage.seeded",
            entityType: ENTITY_TYPE,
            entityId: stage.id,
            after: serialize(stage),
          });
        }
        return stages;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(mapStageConflict);
}

const jobInclude = {
  stage: true,
  order: { select: { id: true, status: true } },
} as const;

const readJobInclude = {
  stage: true,
  orderItem: true,
  order: {
    select: {
      id: true,
      number: true,
      status: true,
      dueDate: true,
      client: {
        select: { id: true, name: true, phone: true, email: true },
      },
    },
  },
} as const;

const eventInclude = {
  fromStage: { select: { id: true, name: true, position: true } },
  toStage: { select: { id: true, name: true, position: true } },
} as const;

export async function getProductionBoard(filters: ProductionBoardQuery) {
  const stages = await prisma.productionStage.findMany({
    where: {
      OR: [
        { isActive: true },
        { isActive: false, jobs: { some: { status: "COMPLETED" } } },
      ],
    },
    orderBy: { position: "asc" },
    include: {
      jobs: {
        where: {
          ...(filters.orderId ? { orderId: filters.orderId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        include: readJobInclude,
      },
    },
  });

  return serialize(
    stages.map(({ jobs, ...stage }) => ({
      ...stage,
      isHistorical: !stage.isActive,
      jobs,
    })),
  );
}

export async function getProductionJob(id: string) {
  const job = await prisma.productionJob.findUnique({
    where: { id },
    include: readJobInclude,
  });
  if (!job) throw new AppError(404, "Production job not found");
  return serialize(job);
}

export async function listProductionEvents(id: string) {
  const job = await prisma.productionJob.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!job) throw new AppError(404, "Production job not found");

  const events = await prisma.productionEvent.findMany({
    where: { jobId: id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: eventInclude,
  });
  return serialize(events);
}

async function findJob(tx: typeof prisma, id: string) {
  const job = await tx.productionJob.findUnique({
    where: { id },
    include: jobInclude,
  });
  if (!job) throw new AppError(404, "Production job not found");
  return job;
}

async function activeStages(tx: typeof prisma) {
  return tx.productionStage.findMany({
    where: { isActive: true },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });
}

function requireProductionOrder(job: { order: { status: string } }) {
  if (job.order.status !== "IN_PRODUCTION") {
    throw new AppError(409, "Production jobs require an order in production");
  }
}

export async function moveJob(
  id: string,
  input: MoveJobInput,
  actorId: string,
) {
  const job = (await prisma
    .$transaction(
      async (tx) => {
        const before = await findJob(tx as typeof prisma, id);
        requireProductionOrder(before);
        if (before.status === "BLOCKED") {
          throw new AppError(409, "Blocked production jobs cannot be moved");
        }

        const stages = await activeStages(tx as typeof prisma);
        const destination = stages.find((stage) => stage.id === input.stageId);
        if (!destination)
          throw new AppError(404, "Active production stage not found");
        if (destination.id === before.stageId) {
          throw new AppError(409, "Production job is already in this stage");
        }

        const after = await tx.productionJob.update({
          where: {
            id: before.id,
            stageId: before.stageId,
            status: before.status,
          },
          data: {
            stageId: destination.id,
            status: deriveJobStatus(destination.position, stages),
          },
          include: jobInclude,
        });
        await tx.productionEvent.create({
          data: {
            jobId: id,
            fromStageId: before.stageId,
            toStageId: destination.id,
            actorId,
            notes: input.notes ?? null,
          },
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: "production.job.moved",
          entityType: JOB_ENTITY_TYPE,
          entityId: id,
          before: serialize(before),
          after: serialize(after),
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) =>
      stateConflict(error, "Production job state changed; retry the operation"),
    )) as {
    id: string;
    order?: { id: string } | null;
    stage?: { id: string } | null;
  };
  publishChange("production.job.moved", actorId, {
    job: { id: job.id },
    order: job.order ? { id: job.order.id } : undefined,
    stage: job.stage ? { id: job.stage.id } : undefined,
  });
  return job;
}

async function setJobBlocked(id: string, actorId: string, blocked: boolean) {
  const job = (await prisma
    .$transaction(
      async (tx) => {
        const before = await findJob(tx as typeof prisma, id);
        requireProductionOrder(before);
        if (blocked && before.status === "BLOCKED") {
          throw new AppError(409, "Production job is already blocked");
        }
        if (!blocked && before.status !== "BLOCKED") {
          throw new AppError(409, "Production job is not blocked");
        }
        const stages = await activeStages(tx as typeof prisma);
        const stage = stages.find(
          (candidate) => candidate.id === before.stageId,
        );
        if (!stage) throw new AppError(409, "Job stage is no longer active");
        const after = await tx.productionJob.update({
          where: { id: before.id, status: before.status },
          data: {
            status: blocked
              ? "BLOCKED"
              : deriveJobStatus(stage.position, stages),
          },
          include: jobInclude,
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: blocked
            ? "production.job.blocked"
            : "production.job.unblocked",
          entityType: JOB_ENTITY_TYPE,
          entityId: id,
          before: serialize(before),
          after: serialize(after),
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) =>
      stateConflict(error, "Production job state changed; retry the operation"),
    )) as {
    id: string;
    order?: { id: string } | null;
    stage?: { id: string } | null;
  };
  publishChange(
    blocked ? "production.job.blocked" : "production.job.unblocked",
    actorId,
    {
      job: { id: job.id },
      order: job.order ? { id: job.order.id } : undefined,
      stage: job.stage ? { id: job.stage.id } : undefined,
    },
  );
  return job;
}

export function blockJob(id: string, actorId: string) {
  return setJobBlocked(id, actorId, true);
}

export function unblockJob(id: string, actorId: string) {
  return setJobBlocked(id, actorId, false);
}

export async function updateJob(
  id: string,
  input: UpdateJobInput,
  actorId: string,
) {
  const job = (await prisma
    .$transaction(
      async (tx) => {
        const before = await findJob(tx as typeof prisma, id);
        requireProductionOrder(before);
        const after = await tx.productionJob.update({
          where: { id: before.id, updatedAt: before.updatedAt },
          data: input,
          include: jobInclude,
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: "production.job.updated",
          entityType: JOB_ENTITY_TYPE,
          entityId: id,
          before: serialize(before),
          after: serialize(after),
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) =>
      stateConflict(error, "Production job state changed; retry the operation"),
    )) as {
    id: string;
    order?: { id: string } | null;
    stage?: { id: string } | null;
  };
  publishChange("production.job.updated", actorId, {
    job: { id: job.id },
    order: job.order ? { id: job.order.id } : undefined,
    stage: job.stage ? { id: job.stage.id } : undefined,
  });
  return job;
}

function mapStageConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError(409, "Production stage name or position already exists");
  }
  return stateConflict(error);
}

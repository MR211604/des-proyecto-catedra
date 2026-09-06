import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAuditLog } from "../../lib/audit.js";
import { AppError } from "../../middleware/errors.js";
import { serialize, stateConflict } from "../utils.js";
import type { CreateStageInput, UpdateStageInput } from "./schema.js";

const ENTITY_TYPE = "ProductionStage";
export const DEFAULT_STAGES = ["Preparación", "Corte", "Confección", "Acabado"];

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
  return prisma
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
    .catch(mapStageConflict);
}

export async function updateStage(
  id: string,
  input: UpdateStageInput,
  actorId: string,
) {
  return prisma
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
    .catch(mapStageConflict);
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

function mapStageConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError(409, "Production stage name or position already exists");
  }
  return stateConflict(error);
}

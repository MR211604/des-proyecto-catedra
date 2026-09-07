import { z } from "zod";

export const createStageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  position: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateStageSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    position: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one stage field is required",
  });

export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;

export const moveJobSchema = z.object({
  stageId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateJobSchema = z
  .object({
    description: z.string().trim().min(1).max(500).optional(),
    assignedTo: z.string().trim().min(1).max(150).nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one job field is required",
  });

export type MoveJobInput = z.infer<typeof moveJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const productionBoardQuerySchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]).optional(),
  assignedTo: z.string().trim().min(1).optional(),
});

export type ProductionBoardQuery = z.infer<typeof productionBoardQuerySchema>;

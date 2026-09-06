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

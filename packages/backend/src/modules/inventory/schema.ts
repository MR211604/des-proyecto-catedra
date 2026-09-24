import { z } from "zod";

const decimalString = (scale: number, label: string, signed = false) => {
  const prefix = signed ? "^-?" : "^";
  const schema = z
    .string()
    .regex(new RegExp(`${prefix}\\d+(?:\\.\\d{1,${scale}})?$`), {
      message: `${label} must be a decimal string with at most ${scale} decimal places`,
    });

  return schema;
};

export const unitOfMeasureSchema = z.enum([
  "METER",
  "UNIT",
  "ROLL",
  "KILOGRAM",
]);

export const stockMovementTypeSchema = z.enum([
  "RECEIPT",
  "ISSUE",
  "SALE",
  "ADJUSTMENT",
  "RETURN",
]);

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(150),
  sku: z.string().trim().max(100).optional(),
  unit: unitOfMeasureSchema,
  quantity: decimalString(3, "Quantity"),
  reorderPoint: decimalString(3, "Reorder point"),
  supplierId: z.string().trim().min(1).optional(),
});

export const updateInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    sku: z.string().trim().max(100).nullable().optional(),
    reorderPoint: decimalString(3, "Reorder point").optional(),
    supplierId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable field is required",
  });

export const listInventoryItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  supplierId: z.string().trim().min(1).optional(),
  unit: unitOfMeasureSchema.optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
  sortBy: z
    .enum(["name", "sku", "quantity", "createdAt", "updatedAt"])
    .default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  includeDeleted: z.preprocess((v) => v === "true", z.boolean().default(false)),
});

export const createStockMovementSchema = z
  .object({
    type: stockMovementTypeSchema,
    quantity: decimalString(3, "Quantity", true).refine(
      (value) => value !== "0" && !/^-?0+(?:\.0+)?$/.test(value),
      { message: "Quantity must be different from zero" },
    ),
    unit: unitOfMeasureSchema,
    reference: z.string().trim().max(200).optional(),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, context) => {
    if (data.type !== "ADJUSTMENT" && data.quantity.startsWith("-")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantity must be positive for this movement type",
      });
    }
  });

export const listStockMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: stockMovementTypeSchema.optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;
export type ListInventoryItemsQuery = z.infer<
  typeof listInventoryItemsQuerySchema
>;
export type CreateStockMovementInput = z.infer<
  typeof createStockMovementSchema
>;
export type ListStockMovementsQuery = z.infer<
  typeof listStockMovementsQuerySchema
>;

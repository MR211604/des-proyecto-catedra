import { z } from "zod";

const decimalString = (scale: number, label: string) =>
  z.string().regex(new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`), {
    message: `${label} must be a decimal string with at most ${scale} decimal places`,
  });

export const orderItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: decimalString(3, "Quantity").refine(
    (value) => value !== "0" && !/^0+(?:\.0+)?$/.test(value),
    { message: "Quantity must be greater than zero" },
  ),
  unitPrice: decimalString(2, "Unit price"),
  specifications: z.unknown().optional(),
});

export const productionJobSchema = z.object({
  stageId: z.string().trim().min(1),
  description: z.string().trim().min(1).max(500),
  orderItemIndex: z.number().int().min(0).optional(),
  assignedTo: z.string().trim().min(1).max(150).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const createOrderSchema = z.object({
  clientId: z.string().trim().min(1),
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(orderItemSchema).min(1),
  jobs: z.array(productionJobSchema).min(1),
});

export const updateOrderSchema = createOrderSchema;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"])
    .optional(),
  clientId: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["number", "createdAt", "updatedAt", "dueDate"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const convertQuoteSchema = z.object({
  stageId: z.string().trim().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;

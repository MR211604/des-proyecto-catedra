import { z } from "zod";

const decimalString = (scale: number, label: string) =>
  z.string().regex(new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`), {
    message: `${label} must be a decimal string with at most ${scale} decimal places`,
  });

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: decimalString(3, "Quantity").refine(
    (value) => value !== "0" && !/^0+(?:\.0+)?$/.test(value),
    {
      message: "Quantity must be greater than zero",
    },
  ),
  unitPrice: decimalString(2, "Unit price"),
  specifications: z.unknown().optional(),
});

export const createQuoteSchema = z.object({
  clientId: z.string().trim().min(1),
  validUntil: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(quoteItemSchema).min(1),
});

export const updateQuoteSchema = createQuoteSchema;

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"])
    .optional(),
  clientId: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["number", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;

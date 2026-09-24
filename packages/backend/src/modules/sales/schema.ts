import { z } from "zod";

const decimalString = (scale: number, label: string) =>
  z.string().regex(new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`), {
    message: `${label} must be a decimal string with at most ${scale} decimal places`,
  });

const positiveDecimal = (scale: number, label: string) =>
  decimalString(scale, label).refine(
    (value) => value !== "0" && !/^0+(?:\.0+)?$/.test(value),
    { message: `${label} must be greater than zero` },
  );

export const paymentMethodSchema = z.enum(["CASH", "TRANSFER"]);

export const createSaleSchema = z.object({
  orderId: z.string().trim().min(1),
});

export const createPaymentSchema = z.object({
  amount: positiveDecimal(2, "Payment amount"),
  method: paymentMethodSchema,
  reference: z.string().trim().max(200).nullable().optional(),
});

export const updatePaymentSchema = z
  .object({
    amount: positiveDecimal(2, "Payment amount").optional(),
    method: paymentMethodSchema.optional(),
    reference: z.string().trim().max(200).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable field is required",
  });

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["OPEN", "PAID", "VOIDED"]).optional(),
  orderId: z.string().trim().min(1).optional(),
  sortBy: z.enum(["number", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

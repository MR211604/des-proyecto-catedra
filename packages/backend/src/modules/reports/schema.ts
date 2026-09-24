import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const base = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  period: z.enum(["today", "week", "month", "quarter", "year"]).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

const dateRules = (
  value: { from?: string; to?: string; period?: string },
  context: z.RefinementCtx,
) => {
  if ((value.from && !value.to) || (!value.from && value.to)) {
    context.addIssue({
      code: "custom",
      message: "from and to must be used together",
      path: ["from"],
    });
  }
  if (value.period && (value.from || value.to)) {
    context.addIssue({
      code: "custom",
      message: "period cannot be combined with from/to",
      path: ["period"],
    });
  }
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: "custom",
      message: "from must be before or equal to to",
      path: ["from"],
    });
  }
};

const withDateRules = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
  schema.superRefine(dateRules);

export const summaryReportQuerySchema = withDateRules(base);

export const ordersReportQuerySchema = withDateRules(
  base.extend({
    status: z
      .enum(["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"])
      .optional(),
    clientId: z.string().trim().min(1).optional(),
    overdue: booleanQuery.optional(),
  }),
);

export const productionReportQuerySchema = withDateRules(
  base.extend({
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]).optional(),
    stageId: z.string().trim().min(1).optional(),
    assignedTo: z.string().trim().min(1).optional(),
    blocked: booleanQuery.optional(),
  }),
);

export const salesReportQuerySchema = withDateRules(
  base.extend({
    status: z.enum(["OPEN", "PAID", "VOIDED"]).optional(),
  }),
);

export const paymentsReportQuerySchema = withDateRules(
  base.extend({
    method: z.enum(["CASH", "TRANSFER"]).optional(),
    saleId: z.string().trim().min(1).optional(),
  }),
);

export const inventoryReportQuerySchema = withDateRules(
  base.extend({
    availability: z.enum(["sufficient", "low", "out"]).optional(),
    unit: z.enum(["METER", "UNIT", "ROLL", "KILOGRAM"]).optional(),
    itemId: z.string().trim().min(1).optional(),
    supplierId: z.string().trim().min(1).optional(),
    movementType: z
      .enum(["RECEIPT", "ISSUE", "SALE", "ADJUSTMENT", "RETURN"])
      .optional(),
  }),
);

export const clientsReportQuerySchema = withDateRules(
  base.extend({
    active: booleanQuery.optional(),
    withActivity: booleanQuery.optional(),
  }),
);

export const quotesReportQuerySchema = withDateRules(
  base.extend({
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"])
      .optional(),
    converted: booleanQuery.optional(),
  }),
);

export type OrdersReportQuery = z.infer<typeof ordersReportQuerySchema>;
export type SummaryReportQuery = z.infer<typeof summaryReportQuerySchema>;
export type ProductionReportQuery = z.infer<typeof productionReportQuerySchema>;
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type PaymentsReportQuery = z.infer<typeof paymentsReportQuerySchema>;
export type InventoryReportQuery = z.infer<typeof inventoryReportQuerySchema>;
export type ClientsReportQuery = z.infer<typeof clientsReportQuerySchema>;
export type QuotesReportQuery = z.infer<typeof quotesReportQuerySchema>;

export type AnyReportQuery =
  | OrdersReportQuery
  | ProductionReportQuery
  | SalesReportQuery
  | PaymentsReportQuery
  | InventoryReportQuery
  | ClientsReportQuery
  | QuotesReportQuery;

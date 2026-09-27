import { z } from "zod";
import {
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const baseQuery = z.object({
  period: z
    .enum(["today", "week", "month", "quarter", "year"])
    .optional()
    .describe(
      "Preset period in the workshop timezone; mutually exclusive with from/to.",
    ),
  from: dateOnly
    .optional()
    .describe(
      "Inclusive workshop calendar date in YYYY-MM-DD format. Required with to; must be on or before to.",
    ),
  to: dateOnly
    .optional()
    .describe(
      "Inclusive workshop calendar date in YYYY-MM-DD format. Required with from.",
    ),
  groupBy: z
    .enum(["day", "week", "month"])
    .optional()
    .describe(
      "Date grouping; production groups by stage/status and inventory by unit instead.",
    ),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .describe("One-based data page; defaults to 1."),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Rows per page, from 1 to 100; defaults to 20."),
});

const booleanFilter = z.enum(["true", "false"]).optional();
const idFilter = z.string().min(1).optional();

const queries = {
  summary: baseQuery,
  orders: baseQuery.extend({
    status: z
      .enum(["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"])
      .optional(),
    clientId: idFilter,
    overdue: booleanFilter,
  }),
  production: baseQuery.extend({
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]).optional(),
    stageId: idFilter,
    assignedTo: z.string().min(1).optional(),
    blocked: booleanFilter,
  }),
  sales: baseQuery.extend({
    status: z.enum(["OPEN", "PAID", "VOIDED"]).optional(),
  }),
  payments: baseQuery.extend({
    method: z.enum(["CASH", "TRANSFER"]).optional(),
    saleId: idFilter,
  }),
  inventory: baseQuery.extend({
    availability: z.enum(["sufficient", "low", "out"]).optional(),
    unit: z.enum(["METER", "UNIT", "ROLL", "KILOGRAM"]).optional(),
    itemId: idFilter,
    supplierId: idFilter,
    movementType: z
      .enum(["RECEIPT", "ISSUE", "SALE", "ADJUSTMENT", "RETURN"])
      .optional(),
  }),
  clients: baseQuery.extend({
    active: booleanFilter,
    withActivity: booleanFilter,
  }),
  quotes: baseQuery.extend({
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"])
      .optional(),
    converted: booleanFilter,
  }),
} as const;

const errors = {
  400: {
    description: "Validation failed",
    content: { "application/json": { schema: validationErrorResponseSchema } },
  },
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  403: {
    description: "org:admin role required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

for (const [name, query] of Object.entries(queries)) {
  registry.registerPath({
    method: "get",
    path: `/api/v1/reports/${name}`,
    summary: `${name} report`,
    tags: ["reports"],
    security: [{ bearerAuth: [] }],
    request: { query },
    responses: {
      200: {
        description: "Report generated",
        content: {
          "application/json": { schema: z.record(z.string(), z.unknown()) },
        },
      },
      ...errors,
    },
  });
  registry.registerPath({
    method: "get",
    path: `/api/v1/reports/${name}.pdf`,
    summary: `${name} PDF report`,
    tags: ["reports"],
    security: [{ bearerAuth: [] }],
    request: { query },
    responses: {
      200: {
        description: "PDF report generated",
        content: {
          "application/pdf": { schema: { type: "string", format: "binary" } },
        },
      },
      ...errors,
    },
  });
}

import { z } from "zod";
import {
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";

const reportNames = [
  "summary",
  "orders",
  "production",
  "sales",
  "payments",
  "inventory",
  "clients",
  "quotes",
] as const;

const query = z.object({
  period: z.enum(["today", "week", "month", "quarter", "year"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
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
    description: "Owner role required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

for (const name of reportNames) {
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

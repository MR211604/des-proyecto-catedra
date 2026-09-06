import { z } from "zod";
import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";
import { createOrderSchema, listOrdersQuerySchema } from "../schema.js";

const security = [{ [bearerAuth.name]: [] }];
const validationResponse = {
  400: {
    description: "Validation failed",
    content: { "application/json": { schema: validationErrorResponseSchema } },
  },
};
const jobResponse = z.object({
  id: z.string(),
  orderId: z.string(),
  orderItemId: z.string().nullable(),
  stageId: z.string(),
  description: z.string(),
  status: z.string(),
  assignedTo: z.string().nullable(),
  dueDate: z.string().nullable(),
});
const itemResponse = z.object({
  id: z.string(),
  orderId: z.string(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
  specifications: z.unknown().nullable(),
});
const orderResponse = z.object({
  id: z.string(),
  number: z.number(),
  clientId: z.string(),
  quoteId: z.string().nullable(),
  status: z.string(),
  dueDate: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  notes: z.string().nullable(),
  items: z.array(itemResponse),
  jobs: z.array(jobResponse),
});
const listResponse = z.object({
  data: z.array(orderResponse),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
const responses = {
  401: { description: "Authentication required", content: { "application/json": { schema: errorResponseSchema } } },
  403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  404: { description: "Order, client, or production stage not found", content: { "application/json": { schema: errorResponseSchema } } },
  409: { description: "Order state conflict", content: { "application/json": { schema: errorResponseSchema } } },
};

registry.registerPath({
  method: "post",
  path: "/api/v1/orders",
  summary: "Create order",
  tags: ["orders"],
  security,
  request: { body: { required: true, content: { "application/json": { schema: createOrderSchema } } } },
  responses: { 201: { description: "Order created", content: { "application/json": { schema: orderResponse } } }, ...validationResponse, ...responses },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/orders",
  summary: "List orders",
  tags: ["orders"],
  security,
  request: { query: listOrdersQuerySchema },
  responses: { 200: { description: "Orders retrieved", content: { "application/json": { schema: listResponse } } }, ...responses },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/orders/{id}",
  summary: "Get order",
  tags: ["orders"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Order retrieved", content: { "application/json": { schema: orderResponse } } }, ...responses },
});
registry.registerPath({
  method: "put",
  path: "/api/v1/orders/{id}",
  summary: "Update confirmed order",
  tags: ["orders"],
  security,
  request: { params: z.object({ id: z.string() }), body: { required: true, content: { "application/json": { schema: createOrderSchema } } } },
  responses: { 200: { description: "Order updated", content: { "application/json": { schema: orderResponse } } }, ...validationResponse, ...responses },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/orders/{id}",
  summary: "Delete confirmed order",
  tags: ["orders"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Order deleted" }, ...responses },
});

for (const [action, summary] of [
  ["start", "Start order production"],
  ["ready", "Mark order ready"],
  ["deliver", "Deliver order"],
  ["cancel", "Cancel order"],
] as const) {
  registry.registerPath({
    method: "post",
    path: `/api/v1/orders/{id}/${action}`,
    summary,
    tags: ["orders"],
    security,
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: summary, content: { "application/json": { schema: orderResponse } } }, ...responses },
  });
}

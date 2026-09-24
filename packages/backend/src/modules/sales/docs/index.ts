import { z } from "zod";
import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";
import {
  createPaymentSchema,
  createSaleSchema,
  listPaymentsQuerySchema,
  listSalesQuerySchema,
  paymentMethodSchema,
  updatePaymentSchema,
} from "../schema.js";

const security = [{ [bearerAuth.name]: [] }];
const validationResponse = {
  400: {
    description: "Validation failed",
    content: { "application/json": { schema: validationErrorResponseSchema } },
  },
};
const commonResponses = {
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  403: {
    description: "Insufficient permissions",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  404: {
    description: "Sale, order, or payment not found",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  409: {
    description: "Sale state or outstanding balance conflict",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

const paymentResponse = z.object({
  id: z.string(),
  saleId: z.string(),
  method: paymentMethodSchema,
  amount: z.string(),
  paidAt: z.string(),
  reference: z.string().nullable(),
  actorId: z.string(),
});
const saleItemResponse = z.object({
  id: z.string(),
  saleId: z.string(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
});
const saleResponse = z.object({
  id: z.string(),
  number: z.number(),
  orderId: z.string(),
  status: z.enum(["OPEN", "PAID", "VOIDED"]),
  subtotal: z.string(),
  total: z.string(),
  paidAmount: z.string(),
  outstandingBalance: z.string(),
  items: z.array(saleItemResponse),
  payments: z.array(paymentResponse),
  order: z.object({
    id: z.string(),
    client: z.object({ id: z.string(), name: z.string() }),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const listResponse = z.object({
  data: z.array(saleResponse),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
const paymentListResponse = z.object({
  data: z.array(paymentResponse),
  meta: listResponse.shape.meta,
});
const paymentMutationResponse = z.object({
  payment: paymentResponse,
  sale: saleResponse,
});

registry.registerPath({
  method: "get",
  path: "/api/v1/sales",
  summary: "List sales",
  tags: ["sales"],
  security,
  request: { query: listSalesQuerySchema },
  responses: {
    200: {
      description: "Sales retrieved",
      content: { "application/json": { schema: listResponse } },
    },
    ...commonResponses,
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/sales",
  summary: "Create a sale from an order",
  tags: ["sales"],
  security,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createSaleSchema } },
    },
  },
  responses: {
    201: {
      description: "Sale created",
      content: { "application/json": { schema: saleResponse } },
    },
    ...validationResponse,
    ...commonResponses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/sales/{id}",
  summary: "Get a sale",
  tags: ["sales"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Sale retrieved",
      content: { "application/json": { schema: saleResponse } },
    },
    ...commonResponses,
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/sales/{id}/void",
  summary: "Void a sale",
  tags: ["sales"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Sale voided",
      content: { "application/json": { schema: saleResponse } },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/sales/{saleId}/payments",
  summary: "List sale payments",
  tags: ["sales"],
  security,
  request: {
    params: z.object({ saleId: z.string() }),
    query: listPaymentsQuerySchema,
  },
  responses: {
    200: {
      description: "Payments retrieved",
      content: { "application/json": { schema: paymentListResponse } },
    },
    ...commonResponses,
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/sales/{saleId}/payments",
  summary: "Record a payment",
  tags: ["sales"],
  security,
  request: {
    params: z.object({ saleId: z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: createPaymentSchema } },
    },
  },
  responses: {
    201: {
      description: "Payment recorded",
      content: { "application/json": { schema: paymentMutationResponse } },
    },
    ...validationResponse,
    ...commonResponses,
  },
});

for (const method of ["put", "delete"] as const) {
  registry.registerPath({
    method,
    path: "/api/v1/sales/{saleId}/payments/{paymentId}",
    summary: method === "put" ? "Update a payment" : "Delete a payment",
    tags: ["sales"],
    security,
    request: {
      params: z.object({ saleId: z.string(), paymentId: z.string() }),
      ...(method === "put"
        ? {
            body: {
              required: true,
              content: { "application/json": { schema: updatePaymentSchema } },
            },
          }
        : {}),
    },
    responses: {
      200: {
        description: "Payment changed",
        content: { "application/json": { schema: paymentMutationResponse } },
      },
      ...(method === "put" ? validationResponse : {}),
      ...commonResponses,
    },
  });
}

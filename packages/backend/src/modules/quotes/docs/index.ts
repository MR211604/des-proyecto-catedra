import { z } from "zod";
import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";
import { createQuoteSchema, listQuotesQuerySchema } from "../schema.js";

const security = [{ [bearerAuth.name]: [] }];
const validationResponse = {
  400: {
    description: "Validation failed",
    content: { "application/json": { schema: validationErrorResponseSchema } },
  },
};

const quoteItemResponse = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  total: z.string(),
  specifications: z.unknown().nullable(),
});
const quoteResponse = z.object({
  id: z.string(),
  number: z.number(),
  clientId: z.string(),
  status: z.string(),
  validUntil: z.string().nullable(),
  notes: z.string().nullable(),
  subtotal: z.string(),
  total: z.string(),
  client: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  items: z.array(quoteItemResponse),
  order: z
    .object({
      id: z.string(),
      number: z.number(),
      clientId: z.string(),
      status: z.string(),
      dueDate: z.string().nullable(),
      notes: z.string().nullable(),
      items: z.array(quoteItemResponse),
    })
    .nullable(),
});
const listQuotesResponse = z.object({
  data: z.array(quoteResponse),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
const responses = {
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  403: {
    description: "Insufficient permissions",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  404: {
    description: "Quote or client not found",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  409: {
    description: "Quote state conflict",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

registry.registerPath({
  method: "post",
  path: "/api/v1/quotes",
  summary: "Create quote",
  tags: ["quotes"],
  security,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createQuoteSchema } },
    },
  },
  responses: {
    201: {
      description: "Quote created",
      content: { "application/json": { schema: quoteResponse } },
    },
    ...validationResponse,
    ...responses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/quotes",
  summary: "List quotes",
  tags: ["quotes"],
  security,
  request: { query: listQuotesQuerySchema },
  responses: {
    200: {
      description: "Quotes retrieved",
      content: { "application/json": { schema: listQuotesResponse } },
    },
    ...responses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/quotes/{id}",
  summary: "Get quote",
  tags: ["quotes"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Quote retrieved",
      content: { "application/json": { schema: quoteResponse } },
    },
    ...responses,
  },
});
registry.registerPath({
  method: "put",
  path: "/api/v1/quotes/{id}",
  summary: "Update draft quote",
  tags: ["quotes"],
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: createQuoteSchema } },
    },
  },
  responses: {
    200: {
      description: "Quote updated",
      content: { "application/json": { schema: quoteResponse } },
    },
    ...validationResponse,
    ...responses,
  },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/quotes/{id}",
  summary: "Delete draft quote",
  tags: ["quotes"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Quote deleted" }, ...responses },
});

for (const [action, summary] of [
  ["send", "Send quote"],
  ["accept", "Accept quote"],
  ["reject", "Reject quote"],
  ["convert", "Convert accepted quote to order"],
] as const) {
  registry.registerPath({
    method: "post",
    path: `/api/v1/quotes/{id}/${action}`,
    summary,
    tags: ["quotes"],
    security,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: summary },
      ...responses,
    },
  });
}

import { z } from "zod";
import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";
import {
  createStageSchema,
  moveJobSchema,
  productionBoardQuerySchema,
  updateJobSchema,
  updateStageSchema,
} from "../schema.js";

const security = [{ [bearerAuth.name]: [] }];
const stage = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const job = z.object({
  id: z.string(),
  orderId: z.string(),
  stageId: z.string(),
  description: z.string(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]),
  assignedTo: z.string().nullable(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stage: stage,
  order: z.object({ id: z.string(), status: z.string() }),
});
const boardJob = z.object({
  id: z.string(),
  orderId: z.string(),
  orderItemId: z.string().nullable(),
  stageId: z.string(),
  description: z.string(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]),
  assignedTo: z.string().nullable(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stage,
  orderItem: z
    .object({
      id: z.string(),
      orderId: z.string(),
      description: z.string(),
      quantity: z.string(),
      unitPrice: z.string(),
      total: z.string(),
      specifications: z.unknown().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
  order: z.object({
    id: z.string(),
    number: z.number(),
    status: z.string(),
    dueDate: z.string().nullable(),
    client: z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
  }),
});
const event = z.object({
  id: z.string(),
  jobId: z.string(),
  fromStageId: z.string().nullable(),
  toStageId: z.string(),
  actorId: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  fromStage: z
    .object({ id: z.string(), name: z.string(), position: z.number() })
    .nullable(),
  toStage: z.object({ id: z.string(), name: z.string(), position: z.number() }),
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
    description: "Production job or stage not found",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  409: {
    description: "Production stage conflict",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};
const readResponses = {
  401: responses[401],
  403: responses[403],
  404: responses[404],
};
registry.registerPath({
  method: "get",
  path: "/api/v1/production/board",
  summary: "Read the production board",
  tags: ["production"],
  security,
  request: { query: productionBoardQuerySchema },
  responses: {
    200: {
      description: "Production board retrieved",
      content: {
        "application/json": {
          schema: z.array(
            stage.extend({
              isHistorical: z.boolean(),
              jobs: z.array(boardJob),
            }),
          ),
        },
      },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: validationErrorResponseSchema } },
    },
    ...readResponses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/production/jobs/{id}",
  summary: "Get a production job",
  tags: ["production"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Production job retrieved",
      content: { "application/json": { schema: boardJob } },
    },
    ...readResponses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/production/jobs/{id}/events",
  summary: "List production job events",
  tags: ["production"],
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Production job events retrieved",
      content: { "application/json": { schema: z.array(event) } },
    },
    ...readResponses,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/production/stages",
  summary: "List production stages",
  tags: ["production"],
  security,
  responses: {
    200: {
      description: "Stages retrieved",
      content: { "application/json": { schema: z.array(stage) } },
    },
    ...responses,
  },
});

for (const operation of [
  {
    method: "post" as const,
    path: "/api/v1/production/jobs/{id}/move",
    summary: "Move a production job",
    schema: moveJobSchema,
    action: "move",
    responseDescription: "Production job moved",
  },
  {
    method: "post" as const,
    path: "/api/v1/production/jobs/{id}/block",
    summary: "Block a production job",
    schema: undefined,
    action: "block",
    responseDescription: "Production job blocked",
  },
  {
    method: "post" as const,
    path: "/api/v1/production/jobs/{id}/unblock",
    summary: "Unblock a production job",
    schema: undefined,
    action: "unblock",
    responseDescription: "Production job unblocked",
  },
] as const) {
  registry.registerPath({
    method: operation.method,
    path: operation.path,
    summary: operation.summary,
    tags: ["production"],
    security,
    request: {
      params: z.object({ id: z.string() }),
      ...(operation.schema
        ? {
            body: {
              required: true,
              content: { "application/json": { schema: operation.schema } },
            },
          }
        : {}),
    },
    responses: {
      200: {
        description: operation.responseDescription,
        content: { "application/json": { schema: job } },
      },
      400: {
        description: "Validation failed",
        content: {
          "application/json": { schema: validationErrorResponseSchema },
        },
      },
      ...responses,
    },
  });
}

registry.registerPath({
  method: "put",
  path: "/api/v1/production/jobs/{id}",
  summary: "Edit production job operations",
  tags: ["production"],
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: updateJobSchema } },
    },
  },
  responses: {
    200: {
      description: "Production job updated",
      content: { "application/json": { schema: job } },
    },
    400: {
      description: "Validation failed",
      content: {
        "application/json": { schema: validationErrorResponseSchema },
      },
    },
    ...responses,
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/production/stages",
  summary: "Create production stage",
  tags: ["production"],
  security,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createStageSchema } },
    },
  },
  responses: {
    201: {
      description: "Stage created",
      content: { "application/json": { schema: stage } },
    },
    400: {
      description: "Validation failed",
      content: {
        "application/json": { schema: validationErrorResponseSchema },
      },
    },
    ...responses,
  },
});
registry.registerPath({
  method: "put",
  path: "/api/v1/production/stages/{id}",
  summary: "Update production stage",
  tags: ["production"],
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: updateStageSchema } },
    },
  },
  responses: {
    200: {
      description: "Stage updated",
      content: { "application/json": { schema: stage } },
    },
    400: {
      description: "Validation failed",
      content: {
        "application/json": { schema: validationErrorResponseSchema },
      },
    },
    ...responses,
  },
});

import { z } from "zod";
import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";
import { createStageSchema, updateStageSchema } from "../schema.js";

const security = [{ [bearerAuth.name]: [] }];
const stage = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  409: {
    description: "Production stage conflict",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};
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
    404: {
      description: "Stage not found",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    ...responses,
  },
});

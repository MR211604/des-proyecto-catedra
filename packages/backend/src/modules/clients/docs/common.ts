import {
  bearerAuth,
  errorResponseSchema,
  registry,
  validationErrorResponseSchema,
} from "../../../lib/openapi.js";

export const security = [{ [bearerAuth.name]: [] }];

export { errorResponseSchema, registry, validationErrorResponseSchema };

export const clientResponses = {
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  403: {
    description: "Insufficient permissions",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

export const clientErrorResponses = {
  ...clientResponses,
  404: {
    description: "Client not found",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

export const validationResponse = {
  400: {
    description: "Validation failed",
    content: { "application/json": { schema: validationErrorResponseSchema } },
  },
};

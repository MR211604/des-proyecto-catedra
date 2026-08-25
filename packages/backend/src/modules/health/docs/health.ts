import { registry } from "../../../lib/openapi.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/health",
  summary: "Check API health",
  tags: ["health"],
  responses: {
    200: {
      description: "API is healthy",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { status: { type: "string", example: "ok" } },
            required: ["status"],
          },
        },
      },
    },
  },
});

import { bearerAuth, errorResponseSchema, registry } from "../../../lib/openapi.js";
import { userInfoSchema } from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/health/userInfo",
  summary: "Get current Clerk user info",
  tags: ["health"],
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: "User info obtained",
      content: { "application/json": { schema: userInfoSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

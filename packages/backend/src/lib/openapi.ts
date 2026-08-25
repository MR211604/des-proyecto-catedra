import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { env } from "../config/env.js";

// Enables the .openapi() metadata helper for schemas documented by the registry.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Clerk session token",
  },
);

export const errorResponseSchema = z.object({
  error: z.string().meta({ example: "Client not found" }),
});

export const validationErrorResponseSchema = z.object({
  error: z.string().meta({ example: "Validation failed" }),
  issues: z.array(z.record(z.string(), z.unknown())),
});

export function generateOpenAPIDocument(): ReturnType<
  OpenApiGeneratorV31["generateDocument"]
> {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Sewing ERP API",
      version: "1.0.0",
      description:
        "REST API for managing the sewing workshop ERP. Authenticated endpoints use Clerk bearer tokens.",
    },
    tags: [
      {
        name: "health",
        description: "Service health checks",
      },
      {
        name: "clients",
        description: "Customer management operations",
      },
    ],
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local server",
      },
    ],
  });
}

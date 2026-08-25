import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { apiReference } from "@scalar/express-api-reference";
import { clerk, requireUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { generateOpenAPIDocument, registry } from "./lib/openapi.js";
import { apiRouter } from "./modules/index.js";

export const app: Express = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        scriptSrc: ["'self'", "https:", "'unsafe-inline'"],
      },
    },
  }),
);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(
  pinoHttp({
    serializers: {
      req: (request) => ({
        id: request.id,
        method: request.method,
        url: request.originalUrl ?? request.url,
        userAgent: request.headers["user-agent"],
      }),
      res: (response) => ({ statusCode: response.statusCode }),
    },
  }),
);
app.use(express.json());
app.use(clerk);

registry.registerPath({
  method: "get",
  path: "/api/health",
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

const openApiDocument = generateOpenAPIDocument();

app.use(
  "/docs",
  apiReference({
    content: openApiDocument,
    pageTitle: "Sewing ERP API Documentation",
    title: "Sewing ERP API",
  }),
);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/v1", requireUser, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

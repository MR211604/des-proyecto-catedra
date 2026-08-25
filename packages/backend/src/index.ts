import { apiReference } from "@scalar/express-api-reference";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { generateOpenAPIDocument } from "./lib/openapi.js";
import { clerk } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { apiRouter } from "./modules/index.js";

export const app: Express = express();
const openApiDocument = generateOpenAPIDocument();

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
app.use(
  "/docs",
  apiReference({
    content: openApiDocument,
    pageTitle: "Sewing ERP API Documentation",
    title: "Sewing ERP API",
  }),
);

// The module router controls authentication per route group.
app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

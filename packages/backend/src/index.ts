import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { clerk, requireUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { apiRouter } from "./modules/index.js";

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(pinoHttp());
app.use(express.json());
app.use(clerk);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/v1", requireUser, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

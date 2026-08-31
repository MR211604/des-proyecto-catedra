import { Router, type Router as RouterType } from "express";
import { requireUser } from "../middleware/auth.js";
import { clientRouter } from "./clients/router.js";
import { healthCheckRouter } from "./health/router.js";
import { quoteRouter } from "./quotes/router.js";

export const apiRouter: RouterType = Router();

apiRouter.use("/health", healthCheckRouter);
apiRouter.use("/clients", requireUser, clientRouter);
apiRouter.use("/quotes", requireUser, quoteRouter);

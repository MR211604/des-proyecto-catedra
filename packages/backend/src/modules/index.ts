import { Router, type Router as RouterType } from "express";
import { requireUser } from "../middleware/auth.js";
import { clientRouter } from "./clients/router.js";
import { healthCheckRouter } from "./health/router.js";
import { inventoryRouter } from "./inventory/router.js";
import { orderRouter } from "./orders/router.js";
import { productionRouter } from "./production/router.js";
import { reportsRouter } from "./reports/router.js";
import { quoteRouter } from "./quotes/router.js";
import { saleRouter } from "./sales/router.js";
import { supplierRouter } from "./suppliers/router.js";

export const apiRouter: RouterType = Router();

apiRouter.use("/health", healthCheckRouter);
apiRouter.use("/clients", requireUser, clientRouter);
apiRouter.use("/inventory", requireUser, inventoryRouter);
apiRouter.use("/orders", requireUser, orderRouter);
apiRouter.use("/quotes", requireUser, quoteRouter);
apiRouter.use("/sales", requireUser, saleRouter);
apiRouter.use("/production", requireUser, productionRouter);
apiRouter.use("/reports", requireUser, reportsRouter);
apiRouter.use("/suppliers", requireUser, supplierRouter);

import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  clientsReportQuerySchema,
  inventoryReportQuerySchema,
  ordersReportQuerySchema,
  paymentsReportQuerySchema,
  productionReportQuerySchema,
  quotesReportQuerySchema,
  salesReportQuerySchema,
  summaryReportQuerySchema,
} from "./schema.js";
import "./docs/index.js";

export const reportsRouter: RouterType = Router();

reportsRouter.use(requireRole("org:admin"));
reportsRouter.get(
  "/summary",
  validateQuery(summaryReportQuerySchema),
  controller.summary,
);
reportsRouter.get(
  "/summary.pdf",
  validateQuery(summaryReportQuerySchema),
  controller.summaryPdf,
);
reportsRouter.get(
  "/orders",
  validateQuery(ordersReportQuerySchema),
  controller.orders,
);
reportsRouter.get(
  "/orders.pdf",
  validateQuery(ordersReportQuerySchema),
  controller.orders,
);
reportsRouter.get(
  "/production",
  validateQuery(productionReportQuerySchema),
  controller.production,
);
reportsRouter.get(
  "/production.pdf",
  validateQuery(productionReportQuerySchema),
  controller.production,
);
reportsRouter.get(
  "/sales",
  validateQuery(salesReportQuerySchema),
  controller.sales,
);
reportsRouter.get(
  "/sales.pdf",
  validateQuery(salesReportQuerySchema),
  controller.sales,
);
reportsRouter.get(
  "/payments",
  validateQuery(paymentsReportQuerySchema),
  controller.payments,
);
reportsRouter.get(
  "/payments.pdf",
  validateQuery(paymentsReportQuerySchema),
  controller.payments,
);
reportsRouter.get(
  "/inventory",
  validateQuery(inventoryReportQuerySchema),
  controller.inventory,
);
reportsRouter.get(
  "/inventory.pdf",
  validateQuery(inventoryReportQuerySchema),
  controller.inventory,
);
reportsRouter.get(
  "/clients",
  validateQuery(clientsReportQuerySchema),
  controller.clients,
);
reportsRouter.get(
  "/clients.pdf",
  validateQuery(clientsReportQuerySchema),
  controller.clients,
);
reportsRouter.get(
  "/quotes",
  validateQuery(quotesReportQuerySchema),
  controller.quotes,
);
reportsRouter.get(
  "/quotes.pdf",
  validateQuery(quotesReportQuerySchema),
  controller.quotes,
);

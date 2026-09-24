import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createPaymentSchema,
  createSaleSchema,
  listPaymentsQuerySchema,
  listSalesQuerySchema,
  updatePaymentSchema,
} from "./schema.js";
import "./docs/index.js";

export const saleRouter: RouterType = Router();

saleRouter.use(requireRole("org:member"));
saleRouter.get("/", validateQuery(listSalesQuerySchema), controller.list);
saleRouter.get("/:id", controller.getById);
saleRouter.post("/", validateBody(createSaleSchema), controller.create);
saleRouter.post("/:id/void", controller.voidSale);
saleRouter.get(
  "/:saleId/payments",
  validateQuery(listPaymentsQuerySchema),
  controller.listPayments,
);
saleRouter.post(
  "/:saleId/payments",
  validateBody(createPaymentSchema),
  controller.createPayment,
);
saleRouter.put(
  "/:saleId/payments/:paymentId",
  validateBody(updatePaymentSchema),
  controller.updatePayment,
);
saleRouter.delete("/:saleId/payments/:paymentId", controller.deletePayment);

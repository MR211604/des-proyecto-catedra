import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierItemsQuerySchema,
  updateSupplierSchema,
} from "./schema.js";
import "./docs/index.js";

export const supplierRouter: RouterType = Router();

supplierRouter.use(requireRole("org:member"));

supplierRouter.get("/", validateQuery(listSuppliersQuerySchema), controller.list);
supplierRouter.get(
  "/:id",
  validateQuery(supplierItemsQuerySchema),
  controller.getById,
);
supplierRouter.post("/", validateBody(createSupplierSchema), controller.create);
supplierRouter.put("/:id", validateBody(updateSupplierSchema), controller.update);
supplierRouter.delete("/:id", controller.remove);
supplierRouter.patch("/:id/restore", controller.restore);

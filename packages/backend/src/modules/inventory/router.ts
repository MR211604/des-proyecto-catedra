import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createInventoryItemSchema,
  createStockMovementSchema,
  listInventoryItemsQuerySchema,
  listStockMovementsQuerySchema,
  updateInventoryItemSchema,
} from "./schema.js";
import "./docs/index.js";

export const inventoryRouter: RouterType = Router();

inventoryRouter.use(requireRole("org:member"));

inventoryRouter.get(
  "/items",
  validateQuery(listInventoryItemsQuerySchema),
  controller.list,
);
inventoryRouter.get("/items/:id", controller.getById);
inventoryRouter.post(
  "/items",
  validateBody(createInventoryItemSchema),
  controller.create,
);
inventoryRouter.put(
  "/items/:id",
  validateBody(updateInventoryItemSchema),
  controller.update,
);
inventoryRouter.delete("/items/:id", controller.remove);
inventoryRouter.patch("/items/:id/restore", controller.restore);
inventoryRouter.post(
  "/items/:itemId/movements",
  validateBody(createStockMovementSchema),
  controller.createMovement,
);
inventoryRouter.get(
  "/items/:itemId/movements",
  validateQuery(listStockMovementsQuerySchema),
  controller.listMovements,
);

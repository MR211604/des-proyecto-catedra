import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
} from "./schema.js";

export const clientRouter: RouterType = Router();

clientRouter.use(requireRole("staff"));

clientRouter.get("/", validateQuery(listClientsQuerySchema), controller.list);
clientRouter.get("/:id", controller.getById);
clientRouter.post("/", validateBody(createClientSchema), controller.create);
clientRouter.put(
  "/:id",
  validateBody(updateClientSchema),
  controller.update,
);
clientRouter.delete("/:id", controller.remove);
clientRouter.patch("/:id/restore", controller.restore);

import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import { createOrderSchema, listOrdersQuerySchema, updateOrderSchema } from "./schema.js";
import "./docs/index.js";

export const orderRouter: RouterType = Router();

orderRouter.use(requireRole("org:member"));
orderRouter.get("/", validateQuery(listOrdersQuerySchema), controller.list);
orderRouter.get("/:id", controller.getById);
orderRouter.post("/", validateBody(createOrderSchema), controller.create);
orderRouter.put("/:id", validateBody(updateOrderSchema), controller.update);
orderRouter.delete("/:id", controller.remove);
orderRouter.post("/:id/start", controller.start);
orderRouter.post("/:id/ready", controller.ready);
orderRouter.post("/:id/deliver", controller.deliver);
orderRouter.post("/:id/cancel", controller.cancel);

import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createStageSchema,
  moveJobSchema,
  updateJobSchema,
  updateStageSchema,
} from "./schema.js";
import "./docs/index.js";

export const productionRouter: RouterType = Router();
productionRouter.use(requireRole("org:member"));
productionRouter.get("/stages", controller.list);
productionRouter.post(
  "/stages",
  validateBody(createStageSchema),
  controller.create,
);
productionRouter.put(
  "/stages/:id",
  validateBody(updateStageSchema),
  controller.update,
);
productionRouter.put(
  "/jobs/:id",
  validateBody(updateJobSchema),
  controller.updateJob,
);
productionRouter.post(
  "/jobs/:id/move",
  validateBody(moveJobSchema),
  controller.move,
);
productionRouter.post("/jobs/:id/block", controller.block);
productionRouter.post("/jobs/:id/unblock", controller.unblock);

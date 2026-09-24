import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createStageSchema,
  jobTransitionSchema,
  moveJobSchema,
  productionBoardQuerySchema,
  updateJobSchema,
  updateStageSchema,
} from "./schema.js";
import "./docs/index.js";

export const productionRouter: RouterType = Router();

productionRouter.use(requireRole("org:member"));

productionRouter.get(
  "/board",
  validateQuery(productionBoardQuerySchema),
  controller.board,
);

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

// Jobs - se crean automaticamente cuando una orden es creada. Son los trabajos por cada orden.
productionRouter.get("/jobs/:id/events", controller.events);
productionRouter.get("/jobs/:id", controller.getJob);
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
productionRouter.post(
  "/jobs/:id/block",
  validateBody(jobTransitionSchema),
  controller.block,
);
productionRouter.post(
  "/jobs/:id/unblock",
  validateBody(jobTransitionSchema),
  controller.unblock,
);

import { Router, type Router as RouterType } from "express";
import { requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  updateQuoteSchema,
} from "./schema.js";
import "./docs/index.js";

export const quoteRouter: RouterType = Router();

quoteRouter.use(requireRole("org:member"));
quoteRouter.get("/", validateQuery(listQuotesQuerySchema), controller.list);
quoteRouter.get("/:id", controller.getById);
quoteRouter.post("/", validateBody(createQuoteSchema), controller.create);
quoteRouter.put("/:id", validateBody(updateQuoteSchema), controller.update);
quoteRouter.delete("/:id", controller.remove);

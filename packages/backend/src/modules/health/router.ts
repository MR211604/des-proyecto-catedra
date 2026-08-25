import { getAuth } from "@clerk/express";
import { Router, type Router as RouterType } from "express";
import { requireUser } from "../../middleware/auth.js";
import "./docs/index.js";

export const healthCheckRouter: RouterType = Router();

healthCheckRouter.get("/", (_request, response) => {
  response.json({ status: "ok" });
});

healthCheckRouter.get("/userInfo", requireUser, (request, response) => {
  const { userId } = getAuth(request);
  response.json({
    name: "sewing-erp-api",
    version: "v1",
    user: userId,
    modules: [
      "dashboard",
      "clients",
      "production",
      "sales",
      "inventory",
      "orders",
    ],
  });
});

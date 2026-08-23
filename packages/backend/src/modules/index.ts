import { getAuth } from "@clerk/express";
import { Router, type Router as RouterType } from "express";

export const apiRouter: RouterType = Router();

apiRouter.get("/", (request, response) => {
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

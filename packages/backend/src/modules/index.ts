import { Router, type Router as RouterType } from "express";

export const apiRouter: RouterType = Router();

apiRouter.get("/", (_request, response) => {
  response.json({
    name: "sewing-erp-api",
    version: "v1",
    modules: ["dashboard", "clients", "production", "sales", "inventory", "orders"],
  });
});

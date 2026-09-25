import type { NextFunction, Request, Response } from "express";
import { renderReportPdf } from "./pdf.js";
import type { SummaryReportQuery } from "./schema.js";
import * as service from "./service.js";

type QueryRequest = Request;

async function sendPdf(
  response: Response,
  title: string,
  payload: Record<string, unknown>,
  filename: string,
) {
  const pdf = await renderReportPdf(title, payload);
  response
    .type("application/pdf")
    .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    .send(pdf);
}

export async function summary(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.summary(
        response.locals.validatedQuery as SummaryReportQuery,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function summaryPdf(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    await sendPdf(
      response,
      "Resumen del taller",
      await service.summary(
        response.locals.validatedQuery as SummaryReportQuery,
      ),
      "summary.pdf",
    );
  } catch (error) {
    next(error);
  }
}

async function report<T>(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
  execute: (query: T) => Promise<Record<string, unknown>>,
  title: string,
  filename: string,
) {
  try {
    const payload = await execute(response.locals.validatedQuery as T);
    if (request.path.endsWith(".pdf"))
      await sendPdf(response, title, payload, filename);
    else response.json(payload);
  } catch (error) {
    next(error);
  }
}

export function orders(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.ordersReport,
    "Reporte de pedidos",
    "orders.pdf",
  );
}
export function production(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.productionReport,
    "Reporte de producción",
    "production.pdf",
  );
}
export function sales(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.salesReport,
    "Reporte de ventas",
    "sales.pdf",
  );
}
export function payments(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.paymentsReport,
    "Reporte de pagos",
    "payments.pdf",
  );
}
export function inventory(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.inventoryReport,
    "Reporte de inventario",
    "inventory.pdf",
  );
}
export function clients(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.clientsReport,
    "Reporte de clientes",
    "clients.pdf",
  );
}
export function quotes(
  request: QueryRequest,
  response: Response,
  next: NextFunction,
) {
  return report(
    request,
    response,
    next,
    service.quotesReport,
    "Reporte de cotizaciones",
    "quotes.pdf",
  );
}

import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../lib/api.ts";
import type {
  PaginatedReport,
  ReportRequest,
  ReportResult,
  ReportType,
  SummaryReport,
} from "./types.ts";

type PaginatedOptions<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type ClientOption = { id: string; name: string; deletedAt?: string | null };
type StageOption = { id: string; name: string; position: number };
type SaleOption = {
  id: string;
  number: number;
  order: { client: { name: string } };
};
type ItemOption = { id: string; name: string; sku: string | null };
type SupplierOption = { id: string; name: string; deletedAt?: string | null };

const reportPaths: Record<ReportType, string> = {
  summary: "summary",
  orders: "orders",
  production: "production",
  sales: "sales",
  payments: "payments",
  inventory: "inventory",
  clients: "clients",
  quotes: "quotes",
};

function queryFor(request: ReportRequest, page = 1, limit = 20) {
  const query = new URLSearchParams();
  if (request.dateMode === "period") {
    query.set("period", request.period);
  } else if (request.from && request.to) {
    query.set("from", request.from);
    query.set("to", request.to);
  }
  query.set("groupBy", request.groupBy);

  if (request.type !== "summary") {
    query.set("page", String(page));
    query.set("limit", String(limit));
  }

  const add = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== "") query.set(key, value);
  };
  const addBoolean = (key: string, value: "" | "true" | "false") => {
    if (value) query.set(key, value);
  };

  switch (request.type) {
    case "orders":
      add("status", request.specific.orders.status);
      add("clientId", request.specific.orders.clientId);
      addBoolean("overdue", request.specific.orders.overdue);
      break;
    case "production":
      add("status", request.specific.production.status);
      add("stageId", request.specific.production.stageId);
      add("assignedTo", request.specific.production.assignedTo.trim());
      addBoolean("blocked", request.specific.production.blocked);
      break;
    case "sales":
      add("status", request.specific.sales.status);
      break;
    case "payments":
      add("method", request.specific.payments.method);
      add("saleId", request.specific.payments.saleId);
      break;
    case "inventory":
      add("availability", request.specific.inventory.availability);
      add("unit", request.specific.inventory.unit);
      add("itemId", request.specific.inventory.itemId);
      add("supplierId", request.specific.inventory.supplierId);
      add("movementType", request.specific.inventory.movementType);
      break;
    case "clients":
      addBoolean("active", request.specific.clients.active);
      addBoolean("withActivity", request.specific.clients.withActivity);
      break;
    case "quotes":
      add("status", request.specific.quotes.status);
      addBoolean("converted", request.specific.quotes.converted);
      break;
    case "summary":
      break;
  }

  return query;
}

async function getAllPages<T>(
  getToken: () => Promise<string | null>,
  path: string,
) {
  const client = createApiClient(getToken);
  const firstQuery = new URLSearchParams(path.split("?")[1]);
  firstQuery.set("page", "1");
  firstQuery.set("limit", "100");
  const basePath = path.split("?")[0];
  const first = await client.get<PaginatedOptions<T>>(
    `${basePath}?${firstQuery}`,
  );
  if (first.meta.totalPages <= 1) return first.data;

  const remainingPages = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) => {
      const query = new URLSearchParams(firstQuery);
      query.set("page", String(index + 2));
      return client.get<PaginatedOptions<T>>(`${basePath}?${query}`);
    }),
  );
  return [...first.data, ...remainingPages.flatMap((page) => page.data)];
}

async function getReportResult(
  getToken: () => Promise<string | null>,
  request: ReportRequest,
  page: number,
): Promise<ReportResult> {
  const client = createApiClient(getToken);
  const query = queryFor(request, page);
  if (request.type === "summary") {
    const salesQuery = queryFor({ ...request, type: "sales" }, 1, 1);
    const [summary, sales] = await Promise.all([
      client.get<SummaryReport>(`/api/v1/reports/summary?${query}`),
      client.get<PaginatedReport>(`/api/v1/reports/sales?${salesQuery}`),
    ]);
    return {
      type: request.type,
      period: summary.period,
      generatedAt: summary.generatedAt,
      currency: summary.currency,
      summary: summary.data,
      groups: sales.groups,
      data: [],
    };
  }

  const report = await client.get<PaginatedReport>(
    `/api/v1/reports/${reportPaths[request.type]}?${query}`,
  );
  return {
    type: request.type,
    period: report.period,
    generatedAt: report.generatedAt,
    currency: report.currency,
    summary: report.summary,
    groups: report.groups,
    data: report.data,
    meta: report.meta,
  };
}

export function useReportData(request: ReportRequest | null, page: number) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["reports", request, page],
    enabled: Boolean(request),
    placeholderData: (previousData) => previousData,
    queryFn: () => getReportResult(getToken, request as ReportRequest, page),
  });
}

export function useReportFilterOptions(type: ReportType) {
  const { getToken } = useAuth();

  return {
    clients: useQuery({
      queryKey: ["report-filter-options", "clients"],
      enabled: type === "orders",
      queryFn: () =>
        getAllPages<ClientOption>(
          getToken,
          "/api/v1/clients?sortBy=name&order=asc&includeDeleted=true",
        ),
    }),
    stages: useQuery({
      queryKey: ["report-filter-options", "stages"],
      enabled: type === "production",
      queryFn: () =>
        createApiClient(getToken).get<StageOption[]>(
          "/api/v1/production/stages",
        ),
    }),
    sales: useQuery({
      queryKey: ["report-filter-options", "sales"],
      enabled: type === "payments",
      queryFn: () =>
        getAllPages<SaleOption>(
          getToken,
          "/api/v1/sales?sortBy=createdAt&order=desc",
        ),
    }),
    items: useQuery({
      queryKey: ["report-filter-options", "items"],
      enabled: type === "inventory",
      queryFn: () =>
        getAllPages<ItemOption>(
          getToken,
          "/api/v1/inventory/items?sortBy=name&order=asc",
        ),
    }),
    suppliers: useQuery({
      queryKey: ["report-filter-options", "suppliers"],
      enabled: type === "inventory",
      queryFn: () =>
        getAllPages<SupplierOption>(
          getToken,
          "/api/v1/suppliers?sortBy=name&order=asc&includeDeleted=true",
        ),
    }),
  };
}

export async function downloadReportPdf(
  getToken: () => Promise<string | null>,
  request: ReportRequest,
) {
  const token = await getToken();
  const query = queryFor(request, 1, 100);
  const response = await fetch(
    `/api/v1/reports/${reportPaths[request.type]}.pdf?${query}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );

  if (!response.ok) {
    let message = "No se pudo descargar el reporte PDF.";
    try {
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = body.error ?? body.message ?? message;
    } catch {
      // Keep the user-facing fallback when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const filename =
    response.headers
      .get("content-disposition")
      ?.match(/filename="?([^";]+)"?/i)?.[1] ?? `${request.type}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

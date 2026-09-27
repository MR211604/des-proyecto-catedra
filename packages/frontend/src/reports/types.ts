import type { InventoryUnit, StockMovementType } from "../inventory/types.ts";
import type { OrderStatus } from "../orders/types.ts";
import type { ProductionJobStatus } from "../production/types.ts";
import type { QuoteStatus } from "../quotes/types.ts";
import type { PaymentMethod, SaleStatus } from "../sales/types.ts";

export type ReportType =
  | "summary"
  | "orders"
  | "production"
  | "sales"
  | "payments"
  | "inventory"
  | "clients"
  | "quotes";

export type ReportPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year";

export type ReportGroupBy = "day" | "week" | "month";

export type ReportPeriod = {
  from: string;
  to: string;
  timezone: string;
};

export type ReportGroup = Record<string, unknown>;
export type ReportRow = Record<string, unknown>;

export type PaginatedReport = {
  period: ReportPeriod;
  generatedAt: string;
  currency: "USD";
  filters: Record<string, unknown>;
  summary: Record<string, unknown>;
  groups: ReportGroup[];
  data: ReportRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type SummaryReport = {
  period: ReportPeriod;
  generatedAt: string;
  currency: "USD";
  data: {
    orders: {
      totalActive: number;
      byStatus: Record<string, number>;
      overdue: number;
      readyForDelivery: number;
    };
    production: {
      currentJobs: number;
      blockedJobs: number;
      byStage: Array<{
        stage: { id: string; name: string };
        count: number;
      }>;
    };
    sales: {
      totalSold: string;
      totalCollected: string;
      outstandingBalance: string;
      byPaymentMethod: Record<string, string>;
    };
    inventory: { low: number; depleted: number };
    clients: { withActivity: number };
    quotes: {
      total: number;
      accepted: number;
      rejected: number;
      converted: number;
    };
  };
  filters: Record<string, unknown>;
};

export type ReportResult = {
  type: ReportType;
  period: ReportPeriod;
  generatedAt: string;
  currency: "USD";
  summary: Record<string, unknown>;
  groups: ReportGroup[];
  data: ReportRow[];
  meta?: PaginatedReport["meta"];
};

type OptionalFilter<T extends string> = "" | T;
type BooleanFilter = "" | "true" | "false";

export type ReportSpecificFilters = {
  orders: {
    status: OptionalFilter<OrderStatus>;
    clientId: string;
    overdue: BooleanFilter;
  };
  production: {
    status: OptionalFilter<ProductionJobStatus>;
    stageId: string;
    assignedTo: string;
    blocked: BooleanFilter;
  };
  sales: { status: OptionalFilter<SaleStatus> };
  payments: { method: OptionalFilter<PaymentMethod>; saleId: string };
  inventory: {
    availability: OptionalFilter<"sufficient" | "low" | "out">;
    unit: OptionalFilter<InventoryUnit>;
    itemId: string;
    supplierId: string;
    movementType: OptionalFilter<StockMovementType>;
  };
  clients: {
    active: BooleanFilter;
    withActivity: BooleanFilter;
  };
  quotes: { status: OptionalFilter<QuoteStatus>; converted: BooleanFilter };
  summary: Record<string, never>;
};

export type ReportRequest = {
  type: ReportType;
  dateMode: "period" | "range";
  period: ReportPeriodPreset;
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  specific: ReportSpecificFilters;
};

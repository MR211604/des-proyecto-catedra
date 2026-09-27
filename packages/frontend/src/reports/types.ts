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

export type ReportSpecificFilters = {
  orders: {
    status: string;
    clientId: string;
    overdue: "" | "true" | "false";
  };
  production: {
    status: string;
    stageId: string;
    assignedTo: string;
    blocked: "" | "true" | "false";
  };
  sales: { status: string };
  payments: { method: string; saleId: string };
  inventory: {
    availability: string;
    unit: string;
    itemId: string;
    supplierId: string;
    movementType: string;
  };
  clients: {
    active: "" | "true" | "false";
    withActivity: "" | "true" | "false";
  };
  quotes: { status: string; converted: "" | "true" | "false" };
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

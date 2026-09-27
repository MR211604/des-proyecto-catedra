import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";

export type DashboardSummary = {
  period: { from: string; to: string; timezone: string };
  generatedAt: string;
  currency: string;
  data: {
    orders: {
      totalActive: number;
      byStatus: {
        CONFIRMED: number;
        IN_PRODUCTION: number;
        READY: number;
        DELIVERED: number;
        CANCELLED: number;
      };
      overdue: number;
      readyForDelivery: number;
    };
    production: {
      currentJobs: number;
      blockedJobs: number;
      byStage: Array<{ stage: { id: string; name: string }; count: number }>;
    };
    sales: {
      totalSold: string;
      totalCollected: string;
      outstandingBalance: string;
      byPaymentMethod: { CASH: string; TRANSFER: string };
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
  filters: unknown;
};

export function useDashboardSummary() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () =>
      createApiClient(getToken).get<DashboardSummary>(
        "/api/v1/reports/summary?period=month",
      ),
  });
}

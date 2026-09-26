import type { SaleStatus } from "./types.ts";

export const tabs: Array<{ label: string; value?: SaleStatus }> = [
  { label: "Todas" },
  { label: "Pendientes", value: "OPEN" },
  { label: "Pagadas", value: "PAID" },
  { label: "Anuladas", value: "VOIDED" },
];

export const saleStatusLabels: Record<SaleStatus, string> = {
  OPEN: "Abierta",
  PAID: "Pagada",
  VOIDED: "Anulada",
};

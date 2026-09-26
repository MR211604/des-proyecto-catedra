import type { PaymentMethod, SaleStatus } from "./types.ts";

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

export const paymentStatusClasses: Record<string, string> = {
  Pagado: "bg-[#e8f3ea] text-[#477052]",
  "Pagado parcial": "bg-[#fff2da] text-[#936d2c]",
  Pendiente: "bg-[#f2e6f1] text-[#805276]",
};

export const paymentMethodOptions: Array<{
  label: string;
  value: PaymentMethod;
}> = [
  { label: "Efectivo", value: "CASH" },
  { label: "Transferencia", value: "TRANSFER" },
];

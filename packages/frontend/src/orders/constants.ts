import type { OrderStatus } from "./types";

export const tabs: { label: string; value: OrderStatus | undefined }[] = [
  { label: "Todos", value: undefined },
  { label: "Confirmados", value: "CONFIRMED" },
  { label: "En producción", value: "IN_PRODUCTION" },
  { label: "Listos", value: "READY" },
  { label: "Entregados", value: "DELIVERED" },
  { label: "Cancelados", value: "CANCELLED" },
];

export const statusLabels: Record<OrderStatus, string> = {
  CONFIRMED: "Confirmado",
  IN_PRODUCTION: "En producción",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const statusClasses: Record<OrderStatus, string> = {
  CONFIRMED: "bg-[#f2e6f1] text-[#805276]",
  IN_PRODUCTION: "bg-[#fff0d9] text-[#9a641b]",
  READY: "bg-[#e7f4ec] text-[#3c7655]",
  DELIVERED: "bg-[#e8eef8] text-[#4d6388]",
  CANCELLED: "bg-[#eee8ed] text-[#625660]",
};

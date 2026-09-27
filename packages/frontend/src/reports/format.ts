import type { ReportType } from "./types.ts";

const salvadorTimeZone = "America/El_Salvador";

export function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getPath(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, key) => getRecord(current)[key], value);
}

export function numericValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatReportNumber(value: unknown): string {
  return new Intl.NumberFormat("es-SV", { maximumFractionDigits: 2 }).format(
    numericValue(value),
  );
}

export function formatReportMoney(value: unknown): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numericValue(value));
}

export function formatReportDate(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "—";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Date.UTC(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
          12,
        ),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: salvadorTimeZone,
  }).format(date);
}

export function formatGroupLabel(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "—");
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-SV", {
      month: "short",
      year: "2-digit",
      timeZone: salvadorTimeZone,
    }).format(new Date(Date.UTC(year, month - 1, 15)));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-SV", {
      day: "numeric",
      month: "short",
      timeZone: salvadorTimeZone,
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
  return value;
}

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PRODUCTION: "En producción",
  READY: "Listo para entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  TODO: "Por iniciar",
  IN_PROGRESS: "En progreso",
  BLOCKED: "Bloqueado",
  COMPLETED: "Completado",
  OPEN: "Abierta",
  PAID: "Pagada",
  VOIDED: "Anulada",
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  RECEIPT: "Entrada",
  ISSUE: "Salida",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
  sufficient: "Suficiente",
  low: "Bajo",
  out: "Agotado",
  METER: "Metro",
  UNIT: "Unidad",
  ROLL: "Rollo",
  KILOGRAM: "Kilogramo",
};

export function formatReportLabel(value: unknown): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") return statusLabels[value] ?? value;
  if (value === null || value === undefined) return "—";
  return String(value);
}

export const reportTitles: Record<ReportType, string> = {
  summary: "Resumen general",
  orders: "Pedidos",
  production: "Producción",
  sales: "Ventas",
  payments: "Pagos",
  inventory: "Inventario",
  clients: "Clientes",
  quotes: "Cotizaciones",
};

export function reportStatusTone(value: unknown) {
  switch (value) {
    case "DELIVERED":
    case "PAID":
    case "COMPLETED":
    case "ACCEPTED":
      return "bg-[#e5f4ed] text-[#266b4a]";
    case "BLOCKED":
    case "CANCELLED":
    case "VOIDED":
    case "REJECTED":
    case "out":
      return "bg-[#fff0ef] text-[#aa4e4e]";
    case "READY":
    case "IN_PROGRESS":
    case "IN_PRODUCTION":
      return "bg-[#f4eaf3] text-[#70466a]";
    default:
      return "bg-[#f2edf1] text-[#655963]";
  }
}

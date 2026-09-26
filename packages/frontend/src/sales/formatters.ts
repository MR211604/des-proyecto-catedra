import type { PaymentMethod, Sale } from "./types.ts";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatSaleDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatSaleDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatSaleMoney(value: string) {
  return currency.format(Number(value));
}

export function paymentStatus(sale: Sale) {
  const paid = Number(sale.paidAmount);
  const balance = Number(sale.outstandingBalance);
  if (balance <= 0) return "Pagado";
  if (paid > 0) return "Pagado parcial";
  return "Pendiente";
}

export function paymentMethod(sale: Sale) {
  const methods = new Set<PaymentMethod>(
    sale.payments.map((payment) => payment.method),
  );
  if (methods.size === 0) return "--";
  if (methods.size > 1) return "Mixto";
  return methods.has("CASH") ? "Efectivo" : "Transferencia";
}

export function paymentMethodLabel(method: PaymentMethod) {
  return method === "CASH" ? "Efectivo" : "Transferencia";
}

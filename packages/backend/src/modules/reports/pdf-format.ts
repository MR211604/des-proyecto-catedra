import { formatReportDate } from "./time.js";

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  number: "Número",
  client: "Cliente",
  supplier: "Proveedor",
  sale: "Cliente",
  order: "Orden",
  status: "Estado",
  dueDate: "Fecha de entrega estimada",
  deliveredAt: "Fecha de entrega",
  total: "Total",
  overdue: "Vencido",
  date: "Fecha",
  orderNumber: "Número de orden",
  subtotal: "Subtotal",
  paidAmount: "Monto pagado",
  outstandingBalance: "Saldo pendiente",
  generatedAt: "Fecha de generación",
  currency: "Moneda",
  createdAt: "Fecha de creación",
  paidAt: "Fecha de pago",
  description: "Descripción",
  assignedTo: "Asignado a",
  stage: "Etapa",
  quantity: "Cantidad",
  name: "Nombre",
  sku: "SKU",
  unit: "Unidad",
  reorderPoint: "Punto de reorden",
  availability: "Disponibilidad",
  item: "Material",
  type: "Tipo",
  reference: "Referencia",
  reason: "Motivo",
  actorId: "ID del actor",
  saleId: "ID de venta",
  method: "Método",
  key: "Clave",
  count: "Cantidad",
  amount: "Monto",
  totalValue: "Valor total",
  totalSales: "Ventas totales",
  totalSold: "Total vendido",
  totalCollected: "Total cobrado",
  voidedSales: "Ventas anuladas",
  totalPayments: "Pagos totales",
  currentJobs: "Trabajos actuales",
  blockedJobs: "Trabajos bloqueados",
  eventsInPeriod: "Eventos del periodo",
  completedJobsWithTiming: "Trabajos completados con tiempo",
  averageTotalMinutes: "Promedio de minutos totales",
  averageActiveMinutes: "Promedio de minutos activos",
  averageBlockedMinutes: "Promedio de minutos bloqueados",
  totalMaterials: "Materiales totales",
  lowMaterials: "Materiales con existencia baja",
  depletedMaterials: "Materiales agotados",
  movementCount: "Cantidad de movimientos",
  eligible: "Elegibles",
  converted: "Convertidas",
  conversionRate: "Tasa de conversión",
  byStatus: "Por estado",
  byPaymentMethod: "Por método de pago",
  byMethod: "Por método",
  eventTypes: "Tipos de evento",
  timezone: "Zona horaria",
  from: "Desde",
  to: "Hasta",
  page: "Página",
  limit: "Límite",
  totalPages: "Páginas totales",
  groupBy: "Agrupar por",
  clientId: "ID del cliente",
  stageId: "ID de etapa",
  itemId: "ID del material",
  supplierId: "ID del proveedor",
  movementType: "Tipo de movimiento",
  blocked: "Bloqueado",
  orders: "Pedidos",
  production: "Producción",
  sales: "Ventas",
  payments: "Pagos",
  inventory: "Inventario",
  clients: "Clientes",
  quotes: "Cotizaciones",
  position: "Posición",
  value: "Valor",
  active: "Activo",
  orderCount: "Cantidad de órdenes",
  orderIds: "IDs de órdenes",
  newClients: "Clientes nuevos",
  activeWithActivity: "Clientes activos con actividad",
  totalActive: "Órdenes activas",
  readyForDelivery: "Listas para entrega",
  byStage: "Por etapa",
  low: "Materiales con existencia baja",
  depleted: "Materiales agotados",
  withActivity: "Con actividad",
  accepted: "Aceptadas",
  rejected: "Rechazadas",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CONFIRMED: "Confirmada",
  IN_PRODUCTION: "En producción",
  READY: "Lista",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  BLOCKED: "Bloqueada",
  COMPLETED: "Completada",
  OPEN: "Abierta",
  PAID: "Pagada",
  VOIDED: "Anulada",
};

const STATUS_COUNT_LABELS: Record<string, string> = {
  DRAFT: "Borradores",
  SENT: "Enviadas",
  ACCEPTED: "Aceptadas",
  REJECTED: "Rechazadas",
  EXPIRED: "Vencidas",
  CONFIRMED: "Confirmadas",
  IN_PRODUCTION: "En producción",
  READY: "Listas",
  DELIVERED: "Entregadas",
  CANCELLED: "Canceladas",
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  BLOCKED: "Bloqueadas",
  COMPLETED: "Completadas",
  OPEN: "Abiertas",
  PAID: "Pagadas",
  VOIDED: "Anuladas",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  sufficient: "Suficiente",
  low: "Baja",
  out: "Agotada",
};

const UNIT_LABELS: Record<string, string> = {
  METER: "Metro",
  UNIT: "Unidad",
  ROLL: "Rollo",
  KILOGRAM: "Kilogramo",
};

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIPT: "Entrada",
  ISSUE: "Salida",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
};

const EVENT_LABELS: Record<string, string> = {
  STAGE_MOVED: "Etapa cambiada",
  BLOCKED: "Bloqueado",
  UNBLOCKED: "Desbloqueado",
};

const GROUP_BY_LABELS: Record<string, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
};

const DATE_FIELD_NAMES = new Set([
  "date",
  "from",
  "to",
  "dueDate",
  "deliveredAt",
  "generatedAt",
  "createdAt",
  "paidAt",
]);

export type PdfRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PdfRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function relationValue(key: string, value: unknown): unknown {
  if (!isRecord(value)) return value;

  if (key === "client" || key === "supplier") return value.name ?? null;
  if (key === "order") return value.id ?? null;

  if (key === "sale") {
    const order = value.order;
    if (isRecord(order) && isRecord(order.client)) return order.client.name;
    return null;
  }

  return value;
}

function labelForKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  return key
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function enumLabel(value: string, path: string): string | undefined {
  const parts = path.split(".");
  const key = parts.at(-1);
  const parent = parts.at(-2);

  if (parent === "byStatus") return STATUS_COUNT_LABELS[value];
  if (parent === "byPaymentMethod" || parent === "byMethod")
    return PAYMENT_METHOD_LABELS[value];
  if (parent === "eventTypes") return EVENT_LABELS[value];

  if (key === "status") return STATUS_LABELS[value];
  if (key === "method") return PAYMENT_METHOD_LABELS[value];
  if (key === "availability") return AVAILABILITY_LABELS[value];
  if (key === "unit") return UNIT_LABELS[value];
  if (key === "movementType") return MOVEMENT_LABELS[value];
  if (key === "groupBy") return GROUP_BY_LABELS[value];
  if (key === "type") return MOVEMENT_LABELS[value] ?? EVENT_LABELS[value];

  return undefined;
}

function formatFieldLabel(path: string): string {
  const parts = path.split(".");
  const translated = parts.map((part, index) => {
    const parent = parts[index - 1];
    if (parent === "byStatus")
      return STATUS_COUNT_LABELS[part] ?? labelForKey(part);
    if (parent === "byPaymentMethod" || parent === "byMethod")
      return PAYMENT_METHOD_LABELS[part] ?? labelForKey(part);
    if (parent === "eventTypes") return EVENT_LABELS[part] ?? labelForKey(part);
    return labelForKey(part);
  });

  if (parts.at(-2) === "stage" && parts.at(-1) === "id") return "ID de etapa";
  if (parts.at(-2) === "stage" && parts.at(-1) === "name")
    return "Nombre de etapa";
  if (parts.at(-2) === "item" && parts.at(-1) === "id") return "ID de material";
  if (parts.at(-2) === "item" && parts.at(-1) === "name")
    return "Nombre del material";
  if (parts.at(-2) === "item" && parts.at(-1) === "unit")
    return "Unidad del material";

  return translated.join(" / ");
}

function isDateLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value);
}

function dateInReportTimezone(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return formatReportDate(date);
}

export function formatPdfValue(value: unknown, field = ""): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value instanceof Date) return dateInReportTimezone(value);
  if (typeof value === "string") {
    if (
      isDateLike(value) &&
      (DATE_FIELD_NAMES.has(field.split(".").at(-1) ?? "") ||
        value.includes("T"))
    )
      return dateInReportTimezone(value);
    return enumLabel(value, field) ?? value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((entry) =>
        isRecord(entry)
          ? formatFields(flattenPdfRecord(entry))
          : formatPdfValue(entry, field),
      )
      .join(", ");
  }
  if (isRecord(value)) return formatFields(flattenPdfRecord(value));
  return String(value);
}

function formatFields(fields: Record<string, string>): string {
  const entries = Object.entries(fields);
  return entries.length
    ? entries.map(([key, value]) => `${key}: ${value}`).join(", ")
    : "—";
}

export function flattenPdfRecord(
  value: PdfRecord,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, entry] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;
    const normalized = relationValue(key, entry);
    if (isRecord(normalized)) {
      Object.assign(result, flattenPdfRecord(normalized, field));
    } else {
      result[formatFieldLabel(field)] = formatPdfValue(normalized, field);
    }
  }

  return result;
}

export function rowsForPdfTable(values: unknown[]) {
  const rows = values.map((value) =>
    isRecord(value)
      ? flattenPdfRecord(value)
      : { Valor: formatPdfValue(value) },
  );
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return {
    headers,
    rows: rows.map((row) => headers.map((header) => row[header] ?? "—")),
  };
}

export function formatGeneratedDate(date = new Date()) {
  return dateInReportTimezone(date);
}

export function formatGeneratedTime(date = new Date()) {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

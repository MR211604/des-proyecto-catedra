import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatGroupLabel,
  formatReportDate,
  formatReportLabel,
  formatReportMoney,
  formatReportNumber,
  getPath,
  getRecord,
  numericValue,
  reportStatusTone,
} from "./format.ts";
import type {
  PaginatedReport,
  ReportGroup,
  ReportRequest,
  ReportResult,
  ReportType,
} from "./types.ts";

type Metric = {
  label: string;
  value: string;
  detail: string;
  scope: "current" | "period";
  accent?: "alert";
};

type ChartDatum = { label: string; value: number };

function recordAt(source: unknown, key: string) {
  return getRecord(getRecord(source)[key]);
}

function metric(
  label: string,
  value: string,
  detail: string,
  scope: Metric["scope"],
  accent?: Metric["accent"],
): Metric {
  return { label, value, detail, scope, accent };
}

function reportMetrics(type: ReportType, summary: Record<string, unknown>) {
  const orders = recordAt(summary, "orders");
  const sales = recordAt(summary, "sales");
  const inventory = recordAt(summary, "inventory");
  const currentStockAlerts =
    numericValue(inventory.low) + numericValue(inventory.depleted);

  switch (type) {
    case "summary":
      return [
        metric(
          "Ventas del período",
          formatReportMoney(sales.totalSold),
          `${formatReportMoney(sales.totalCollected)} cobrados`,
          "period",
        ),
        metric(
          "Pedidos entregados",
          formatReportNumber(getRecord(orders.byStatus).DELIVERED),
          "Estado actual de los pedidos",
          "current",
        ),
        metric(
          "Clientes con actividad",
          formatReportNumber(recordAt(summary, "clients").withActivity),
          "Con pedidos durante el período seleccionado",
          "period",
        ),
        metric(
          "Alertas de inventario",
          formatReportNumber(currentStockAlerts),
          `${formatReportNumber(inventory.low)} bajos · ${formatReportNumber(inventory.depleted)} agotados`,
          "current",
          currentStockAlerts > 0 ? "alert" : undefined,
        ),
      ];
    case "orders": {
      const byStatus = getRecord(summary.byStatus);
      return [
        metric(
          "Pedidos en el período",
          formatReportNumber(summary.total),
          `${formatReportMoney(summary.totalValue)} en valor`,
          "period",
        ),
        metric(
          "Pedidos atrasados",
          formatReportNumber(summary.overdue),
          "Con fecha estimada vencida",
          "current",
          numericValue(summary.overdue) > 0 ? "alert" : undefined,
        ),
        metric(
          "En producción",
          formatReportNumber(byStatus.IN_PRODUCTION),
          "Pedidos en su ciclo de trabajo",
          "current",
        ),
      ];
    }
    case "production":
      return [
        metric(
          "Trabajos activos",
          formatReportNumber(summary.currentJobs),
          "Pedidos en producción o listos",
          "current",
        ),
        metric(
          "Trabajos bloqueados",
          formatReportNumber(summary.blockedJobs),
          "Requieren atención del taller",
          "current",
          numericValue(summary.blockedJobs) > 0 ? "alert" : undefined,
        ),
        metric(
          "Eventos registrados",
          formatReportNumber(summary.eventsInPeriod),
          "Durante el período seleccionado",
          "period",
        ),
      ];
    case "sales":
      return [
        metric(
          "Ventas registradas",
          formatReportNumber(summary.totalSales),
          `${formatReportNumber(summary.voidedSales)} anuladas`,
          "period",
        ),
        metric(
          "Total vendido",
          formatReportMoney(summary.totalSold),
          "Ventas válidas del período",
          "period",
        ),
        metric(
          "Total cobrado",
          formatReportMoney(summary.totalCollected),
          "Pagos recibidos en el período",
          "period",
        ),
        metric(
          "Saldo actual",
          formatReportMoney(summary.outstandingBalance),
          "Pendiente en las ventas no anuladas",
          "current",
        ),
      ];
    case "payments":
      return [
        metric(
          "Pagos registrados",
          formatReportNumber(summary.totalPayments),
          "Durante el período seleccionado",
          "period",
        ),
        metric(
          "Total recibido",
          formatReportMoney(summary.totalCollected),
          "En pagos confirmados",
          "period",
        ),
      ];
    case "inventory":
      return [
        metric(
          "Materiales registrados",
          formatReportNumber(summary.totalMaterials),
          "Inventario disponible actualmente",
          "current",
        ),
        metric(
          "Disponibilidad baja",
          formatReportNumber(summary.lowMaterials),
          "En o bajo el punto de reposición",
          "current",
          numericValue(summary.lowMaterials) > 0 ? "alert" : undefined,
        ),
        metric(
          "Materiales agotados",
          formatReportNumber(summary.depletedMaterials),
          "Cantidad actual igual o menor a cero",
          "current",
          numericValue(summary.depletedMaterials) > 0 ? "alert" : undefined,
        ),
        metric(
          "Movimientos",
          formatReportNumber(summary.movementCount),
          "Durante el período seleccionado",
          "period",
        ),
      ];
    case "clients":
      return [
        metric(
          "Clientes nuevos",
          formatReportNumber(summary.newClients),
          "Registrados en el período",
          "period",
        ),
        metric(
          "Con actividad",
          formatReportNumber(summary.activeWithActivity),
          "Clientes activos con pedidos en el período",
          "period",
        ),
      ];
    case "quotes":
      return [
        metric(
          "Cotizaciones",
          formatReportNumber(summary.total),
          "Registradas en el período",
          "period",
        ),
        metric(
          "Elegibles",
          formatReportNumber(summary.eligible),
          "Enviadas, aceptadas, rechazadas o vencidas",
          "period",
        ),
        metric(
          "Convertidas",
          formatReportNumber(summary.converted),
          "Vinculadas a un pedido",
          "period",
        ),
      ];
  }
}

function primaryChart(type: ReportType, groups: ReportGroup[]): ChartDatum[] {
  if (type === "production") {
    const stages = new Map<string, number>();
    for (const group of groups) {
      const stage = getRecord(group.stage);
      const name = String(stage.name ?? "Sin etapa");
      stages.set(name, (stages.get(name) ?? 0) + numericValue(group.count));
    }
    return [...stages].map(([label, value]) => ({ label, value }));
  }

  if (type === "inventory") {
    return groups.map((group) => ({
      label: formatReportLabel(group.unit),
      value: numericValue(group.quantity),
    }));
  }

  return groups.map((group) => ({
    label: formatGroupLabel(group.key),
    value: numericValue(
      type === "orders" || type === "clients" || type === "quotes"
        ? group.count
        : group.amount,
    ),
  }));
}

function distribution(
  type: ReportType,
  summary: Record<string, unknown>,
  groups: ReportGroup[],
): ChartDatum[] {
  if (type === "summary" || type === "orders") {
    const orders = type === "summary" ? recordAt(summary, "orders") : summary;
    return Object.entries(getRecord(orders.byStatus)).map(
      ([status, value]) => ({
        label: formatReportLabel(status),
        value: numericValue(value),
      }),
    );
  }

  if (type === "production") {
    const values = new Map<string, number>();
    for (const group of groups) {
      const status = formatReportLabel(group.status);
      values.set(status, (values.get(status) ?? 0) + numericValue(group.count));
    }
    return [...values].map(([label, value]) => ({ label, value }));
  }

  if (type === "sales" || type === "payments") {
    const source = type === "sales" ? "byPaymentMethod" : "byMethod";
    const values = getRecord(summary[source]);
    return Object.entries(values).map(([method, value]) => ({
      label: formatReportLabel(method),
      value: numericValue(value),
    }));
  }

  if (type === "inventory") {
    const low = numericValue(summary.lowMaterials);
    const depleted = numericValue(summary.depletedMaterials);
    const sufficient = Math.max(
      0,
      numericValue(summary.totalMaterials) - low - depleted,
    );
    return [
      { label: "Suficiente", value: sufficient },
      { label: "Bajo", value: low },
      { label: "Agotado", value: depleted },
    ];
  }

  if (type === "quotes") {
    return Object.entries(getRecord(summary.byStatus)).map(
      ([status, value]) => ({
        label: formatReportLabel(status),
        value: numericValue(value),
      }),
    );
  }

  return [];
}

function ChartPanel({
  title,
  data,
  money = false,
}: {
  title: string;
  data: ChartDatum[];
  money?: boolean;
}) {
  const max = Math.max(1, ...data.map((datum) => Math.max(0, datum.value)));
  const width = 680;
  const height = 250;
  const left = 46;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const slot = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(5, Math.min(28, slot * 0.56));
  const labelStride = Math.max(1, Math.ceil(data.length / 10));
  const ticks = [0, 0.5, 1];

  return (
    <section className="min-w-0 rounded-xl border border-[#e7dce5] bg-white p-6 shadow-[0_8px_28px_rgba(74,46,71,0.045)] max-[620px]:p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7892]">
            Tendencia
          </p>
          <h2 className="mb-0 mt-1 text-xl font-bold tracking-[-0.5px] text-[#302430]">
            {title}
          </h2>
        </div>
        <span className="rounded-full bg-[#f7eff6] px-3 py-1 text-xs text-[#785873]">
          {money ? "USD" : "Registros"}
        </span>
      </div>
      {data.length === 0 ? (
        <div className="grid min-h-60 place-items-center text-sm text-[#897b88]">
          No hay datos agrupados para graficar en este período.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            aria-label={title}
            className="h-[250px] min-w-[560px] w-full"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id="report-bars" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#d8a7cd" />
                <stop offset="100%" stopColor="#8b5e83" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => {
              const y = top + chartHeight * (1 - tick);
              return (
                <g key={tick}>
                  <line
                    stroke="#eee6ed"
                    strokeDasharray={tick === 0 ? undefined : "3 5"}
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#8d7e8b"
                    fontSize="10"
                    textAnchor="end"
                    x={left - 8}
                    y={y + 3}
                  >
                    {formatReportNumber(max * tick)}
                  </text>
                </g>
              );
            })}
            {data.map((datum, index) => {
              const barHeight = (Math.max(0, datum.value) / max) * chartHeight;
              const x = left + slot * index + (slot - barWidth) / 2;
              const y = top + chartHeight - barHeight;
              return (
                <g key={datum.label}>
                  <rect
                    fill="url(#report-bars)"
                    height={Math.max(2, barHeight)}
                    rx="3"
                    width={barWidth}
                    x={x}
                    y={y}
                  >
                    <title>
                      {datum.label}:{" "}
                      {money
                        ? formatReportMoney(datum.value)
                        : formatReportNumber(datum.value)}
                    </title>
                  </rect>
                  {index % labelStride === 0 && (
                    <text
                      fill="#756875"
                      fontSize="10"
                      textAnchor="middle"
                      x={x + barWidth / 2}
                      y={height - 13}
                    >
                      {datum.label.slice(0, 11)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

const chartColors = ["#8b5e83", "#bd8bad", "#d8c0d3", "#72515f", "#c99686"];

function DistributionPanel({
  title,
  data,
  money = false,
}: {
  title: string;
  data: ChartDatum[];
  money?: boolean;
}) {
  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  let cursor = 0;
  const stops = data.map((datum, index) => {
    const start = total > 0 ? (cursor / total) * 360 : 0;
    cursor += Math.max(0, datum.value);
    const end = total > 0 ? (cursor / total) * 360 : 0;
    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });
  const background =
    total > 0
      ? `conic-gradient(${stops.join(", ")})`
      : "conic-gradient(#eee6ed 0deg 360deg)";

  return (
    <section className="rounded-xl border border-[#e7dce5] bg-white p-6 shadow-[0_8px_28px_rgba(74,46,71,0.045)] max-[620px]:p-4">
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7892]">
        Composición
      </p>
      <h2 className="mb-5 mt-1 text-xl font-bold tracking-[-0.5px] text-[#302430]">
        {title}
      </h2>
      {data.length === 0 ? (
        <div className="grid min-h-56 place-items-center text-center text-sm text-[#897b88]">
          Sin categorías para mostrar.
        </div>
      ) : (
        <>
          <div
            className="relative mx-auto mb-6 grid h-44 w-44 place-items-center rounded-[34%]"
            style={{ background }}
          >
            <div className="grid h-28 w-28 place-items-center rounded-[28%] bg-white text-center shadow-[0_4px_20px_rgba(74,46,71,0.08)]">
              <div>
                <strong className="block text-2xl leading-none text-[#241d24]">
                  {money ? formatReportMoney(total) : formatReportNumber(total)}
                </strong>
                <span className="mt-1 block text-xs text-[#796c78]">Total</span>
              </div>
            </div>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0">
            {data.map((datum, index) => (
              <li
                className="flex items-center justify-between gap-3 text-sm"
                key={datum.label}
              >
                <span className="flex min-w-0 items-center gap-2.5 text-[#514651]">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                  <span className="truncate">{datum.label}</span>
                </span>
                <strong className="shrink-0 font-semibold text-[#2d252e]">
                  {money
                    ? formatReportMoney(datum.value)
                    : formatReportNumber(datum.value)}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function ReportOverview({
  type,
  result,
}: {
  type: ReportType;
  result: ReportResult;
}) {
  const metrics = reportMetrics(type, result.summary);
  const bars = primaryChart(type, result.groups);
  const slices = distribution(type, result.summary, result.groups);
  const chartTitle: Record<ReportType, string> = {
    summary: "Ventas del período",
    orders: "Pedidos por período",
    production: "Trabajos por etapa",
    sales: "Ventas por período",
    payments: "Pagos por período",
    inventory: "Movimientos por unidad",
    clients: "Clientes nuevos por período",
    quotes: "Cotizaciones por período",
  };

  return (
    <>
      <section className="mt-6 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1">
        {metrics.map((item) => (
          <article
            className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-[0_8px_24px_rgba(74,46,71,0.045)] before:absolute before:inset-y-0 before:left-0 before:w-1 ${item.accent === "alert" ? "border-[#eedcda] before:bg-[#bd7772]" : "border-[#e7dce5] before:bg-[#a7779f]"}`}
            key={item.label}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#806f7d]">
                {item.label}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.scope === "current" ? "bg-[#f4edf3] text-[#765970]" : "bg-[#f0f5f1] text-[#50735f]"}`}
              >
                {item.scope === "current"
                  ? "Estado actual"
                  : "Período seleccionado"}
              </span>
            </div>
            <strong className="mt-4 block text-[clamp(22px,2vw,30px)] font-bold leading-none tracking-[-0.8px] text-[#211b21]">
              {item.value}
            </strong>
            <p className="mb-0 mt-2 text-xs leading-5 text-[#786c77]">
              {item.detail}
            </p>
          </article>
        ))}
      </section>

      <section
        className={`mt-6 grid gap-5 ${slices.length ? "grid-cols-[minmax(0,1.8fr)_minmax(270px,0.9fr)] max-[900px]:grid-cols-1" : "grid-cols-1"}`}
      >
        <ChartPanel
          data={bars}
          money={type === "summary" || type === "sales" || type === "payments"}
          title={chartTitle[type]}
        />
        {slices.length > 0 && (
          <DistributionPanel
            data={slices}
            money={type === "sales" || type === "payments"}
            title={
              type === "summary" || type === "orders"
                ? "Estado de pedidos"
                : type === "production"
                  ? "Estado de trabajos"
                  : type === "sales" || type === "payments"
                    ? "Método de pago"
                    : type === "inventory"
                      ? "Disponibilidad"
                      : "Estado de cotizaciones"
            }
          />
        )}
      </section>
    </>
  );
}

export function ReportTable({
  type,
  result,
  request,
  page,
  isUpdating,
  onPageChange,
}: {
  type: ReportType;
  result: ReportResult;
  request: ReportRequest;
  page: number;
  isUpdating: boolean;
  onPageChange: (page: number) => void;
}) {
  if (type === "summary") return null;
  const meta = result.meta as PaginatedReport["meta"] | undefined;
  const movementRows =
    type === "inventory" && Boolean(request.specific.inventory.movementType);
  const columns: Array<{
    label: string;
    key: string;
    kind?: "date" | "money" | "status" | "number";
  }> =
    type === "orders"
      ? [
          { label: "Pedido", key: "number", kind: "number" },
          { label: "Fecha", key: "date", kind: "date" },
          { label: "Cliente", key: "client.name" },
          { label: "Estado", key: "status", kind: "status" },
          { label: "Entrega estimada", key: "dueDate", kind: "date" },
          { label: "Monto", key: "total", kind: "money" },
        ]
      : type === "production"
        ? [
            { label: "Trabajo", key: "description" },
            { label: "Pedido", key: "order.number", kind: "number" },
            { label: "Cliente", key: "order.client.name" },
            { label: "Etapa", key: "stage.name" },
            { label: "Estado", key: "status", kind: "status" },
            { label: "Responsable", key: "assignedTo" },
            { label: "Entrega", key: "dueDate", kind: "date" },
          ]
        : type === "sales"
          ? [
              { label: "Venta", key: "number", kind: "number" },
              { label: "Pedido", key: "orderNumber" },
              { label: "Cliente", key: "client.name" },
              { label: "Fecha", key: "date", kind: "date" },
              { label: "Estado", key: "status", kind: "status" },
              { label: "Total", key: "total", kind: "money" },
              { label: "Cobrado a la fecha", key: "paidAmount", kind: "money" },
              {
                label: "Saldo actual",
                key: "outstandingBalance",
                kind: "money",
              },
            ]
          : type === "payments"
            ? [
                { label: "Fecha de pago", key: "paidAt", kind: "date" },
                { label: "Venta", key: "sale.number" },
                { label: "Pedido", key: "sale.order.number" },
                { label: "Cliente", key: "sale.order.client.name" },
                { label: "Método", key: "method", kind: "status" },
                { label: "Monto", key: "amount", kind: "money" },
                { label: "Referencia", key: "reference" },
              ]
            : type === "inventory" && movementRows
              ? [
                  { label: "Fecha", key: "createdAt", kind: "date" },
                  { label: "Material", key: "item.name" },
                  { label: "Movimiento", key: "type", kind: "status" },
                  { label: "Cantidad", key: "quantity" },
                  { label: "Unidad", key: "unit", kind: "status" },
                  { label: "Referencia", key: "reference" },
                  { label: "Motivo", key: "reason" },
                ]
              : type === "inventory"
                ? [
                    { label: "Material", key: "name" },
                    { label: "SKU", key: "sku" },
                    { label: "Unidad", key: "unit", kind: "status" },
                    { label: "Cantidad", key: "quantity" },
                    { label: "Punto de reposición", key: "reorderPoint" },
                    {
                      label: "Disponibilidad",
                      key: "availability",
                      kind: "status",
                    },
                    { label: "Proveedor", key: "supplier.name" },
                  ]
                : type === "clients"
                  ? [
                      { label: "Cliente", key: "name" },
                      {
                        label: "Fecha de registro",
                        key: "createdAt",
                        kind: "date",
                      },
                      { label: "Estado", key: "active" },
                      { label: "Pedidos del período", key: "orderCount" },
                    ]
                  : [
                      { label: "Cotización", key: "number", kind: "number" },
                      { label: "Cliente", key: "client.name" },
                      { label: "Fecha", key: "createdAt", kind: "date" },
                      { label: "Estado", key: "status", kind: "status" },
                      { label: "Monto", key: "total", kind: "money" },
                      { label: "Convertida", key: "converted" },
                      { label: "Pedido", key: "order.number" },
                    ];
  const totalPages = meta?.totalPages ?? 0;
  const pageLimit = meta?.limit ?? 20;
  const total = meta?.total ?? 0;
  const visiblePage = meta?.page ?? page;
  const firstVisible = total > 0 ? (visiblePage - 1) * pageLimit + 1 : 0;
  const lastVisible = Math.min(visiblePage * pageLimit, total);

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-[#e7dce5] bg-white shadow-[0_8px_28px_rgba(74,46,71,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee4ed] px-6 py-5 max-[620px]:items-start max-[620px]:px-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7892]">
            {type === "production" || (type === "inventory" && !movementRows)
              ? "Estado actual"
              : "Detalle del período"}
          </p>
          <h2 className="mb-0 mt-1 text-xl font-bold tracking-[-0.5px] text-[#302430]">
            {type === "inventory" && movementRows
              ? "Movimientos de inventario"
              : "Registros del reporte"}
          </h2>
        </div>
        <span className="rounded-full bg-[#f7eff6] px-3 py-1.5 text-xs font-semibold text-[#765970]">
          {formatReportNumber(total)} registros
        </span>
      </div>
      {result.data.length === 0 ? (
        <div className="grid min-h-44 place-items-center px-6 text-center">
          <div>
            <p className="m-0 font-semibold text-[#443844]">
              Sin resultados para este reporte
            </p>
            <p className="mb-0 mt-1.5 text-sm text-[#847784]">
              Cambia el período o ajusta los filtros para ampliar la búsqueda.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-[#fbf7fa]">
              <tr>
                {columns.map((column) => (
                  <th
                    className="border-b border-[#eee4ed] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#796c78]"
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, rowIndex) => (
                <tr
                  className="border-b border-[#f2eaf1] last:border-0 hover:bg-[#fffafd]"
                  key={String(row.id ?? rowIndex)}
                >
                  {columns.map((column) => {
                    const value = getPath(row, column.key);
                    const isMoney = column.kind === "money";
                    const numberPrefix =
                      type === "orders" || type === "production"
                        ? "PED"
                        : type === "sales"
                          ? "VTA"
                          : "COT";
                    const display =
                      column.kind === "money"
                        ? formatReportMoney(value)
                        : column.kind === "date"
                          ? formatReportDate(value)
                          : column.kind === "status"
                            ? formatReportLabel(value)
                            : column.kind === "number" &&
                                value !== null &&
                                value !== undefined
                              ? `${numberPrefix}-${String(value).padStart(4, "0")}`
                              : column.key === "orderNumber" ||
                                  column.key === "sale.order.number"
                                ? `PED-${String(value ?? "").padStart(4, "0")}`
                                : column.key === "sale.number"
                                  ? `VTA-${String(value ?? "").padStart(4, "0")}`
                                  : formatReportLabel(value);
                    const relationPath = column.key.endsWith(".name")
                      ? column.key.slice(0, -5)
                      : "";
                    const showsDeactivatedRelation =
                      (relationPath === "client" ||
                        relationPath.endsWith(".client") ||
                        relationPath === "supplier") &&
                      Boolean(getPath(row, `${relationPath}.deletedAt`));
                    const cellDisplay = showsDeactivatedRelation
                      ? `${display} · Inactivo`
                      : display;
                    return (
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-sm text-[#3d343d] ${isMoney ? "text-right font-semibold tabular-nums" : ""}`}
                        key={column.key}
                      >
                        {column.kind === "status" ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${reportStatusTone(value)}`}
                          >
                            {cellDisplay}
                          </span>
                        ) : column.key === "active" ||
                          column.key === "converted" ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${value ? "bg-[#e5f4ed] text-[#266b4a]" : "bg-[#f2edf1] text-[#655963]"}`}
                          >
                            {value ? "Sí" : "No"}
                          </span>
                        ) : (
                          cellDisplay
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="flex items-center justify-between gap-4 border-t border-[#eee4ed] px-6 py-4 max-[620px]:flex-col max-[620px]:items-stretch max-[620px]:px-4">
        <p className="m-0 text-sm text-[#746875]">
          Mostrando {firstVisible}–{lastVisible} de {formatReportNumber(total)}{" "}
          registros
        </p>
        <div className="flex items-center justify-end gap-1.5">
          <button
            aria-label="Página anterior"
            className="grid h-9 w-9 place-items-center rounded-md border border-[#e7dce5] bg-white text-[#705e70] hover:bg-[#f8f1f7] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isUpdating || visiblePage <= 1}
            onClick={() => onPageChange(visiblePage - 1)}
            type="button"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="min-w-20 text-center text-sm font-semibold text-[#604d60]">
            Página {visiblePage} de {Math.max(1, totalPages)}
          </span>
          <button
            aria-label="Página siguiente"
            className="grid h-9 w-9 place-items-center rounded-md border border-[#e7dce5] bg-white text-[#705e70] hover:bg-[#f8f1f7] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isUpdating || visiblePage >= totalPages}
            onClick={() => onPageChange(visiblePage + 1)}
            type="button"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </footer>
    </section>
  );
}

import { useAuth } from "@clerk/react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileText,
  Filter,
  RotateCcw,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  downloadReportPdf,
  useReportData,
  useReportFilterOptions,
} from "./api.ts";
import { formatReportDate, reportTitles } from "./format.ts";
import { ReportOverview, ReportTable } from "./ReportVisuals.tsx";
import type {
  ReportPeriodPreset,
  ReportRequest,
  ReportSpecificFilters,
  ReportType,
} from "./types.ts";

const fieldClassName =
  "mt-1.5 h-11 w-full rounded-lg border border-[#ded1dc] bg-[#fff] px-3.5 text-sm text-[#342b35] outline-none transition focus:border-[#9b7193] focus:ring-2 focus:ring-[#eaddea]";

const labelClassName =
  "block text-[10px] font-bold uppercase tracking-[0.14em] text-[#766875]";

const reportTypes: Array<{ value: ReportType; label: string }> = [
  { value: "summary", label: "Resumen general" },
  { value: "orders", label: "Pedidos" },
  { value: "production", label: "Producción" },
  { value: "sales", label: "Ventas" },
  { value: "payments", label: "Pagos" },
  { value: "inventory", label: "Inventario" },
  { value: "clients", label: "Clientes" },
  { value: "quotes", label: "Cotizaciones" },
];

const presetOptions: Array<{ value: ReportPeriodPreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este año" },
];

function workshopDates() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/El_Salvador",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  return {
    from: `${parts.year}-${parts.month}-01`,
    to: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function createSpecificFilters(): ReportSpecificFilters {
  return {
    summary: {},
    orders: { status: "", clientId: "", overdue: "" },
    production: { status: "", stageId: "", assignedTo: "", blocked: "" },
    sales: { status: "" },
    payments: { method: "", saleId: "" },
    inventory: {
      availability: "",
      unit: "",
      itemId: "",
      supplierId: "",
      movementType: "",
    },
    clients: { active: "", withActivity: "" },
    quotes: { status: "", converted: "" },
  };
}

function createInitialRequest(): ReportRequest {
  const dates = workshopDates();
  return {
    type: "summary",
    dateMode: "period",
    period: "month",
    from: dates.from,
    to: dates.to,
    groupBy: "month",
    specific: createSpecificFilters(),
  };
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Children render the native input/select inside this label.
    <label className={`block min-w-0 ${className}`}>
      <span className={labelClassName}>{label}</span>
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  children,
  disabled = false,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  name: string;
}) {
  return (
    <select
      className={`${fieldClassName} disabled:cursor-wait disabled:opacity-60`}
      disabled={disabled}
      name={name}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function AnyBooleanOptions() {
  return (
    <>
      <option value="">Todos</option>
      <option value="true">Sí</option>
      <option value="false">No</option>
    </>
  );
}

function SpecificFilters({
  request,
  onChange,
  options,
}: {
  request: ReportRequest;
  onChange: <K extends keyof ReportSpecificFilters>(
    group: K,
    key: keyof ReportSpecificFilters[K],
    value: string,
  ) => void;
  options: ReturnType<typeof useReportFilterOptions>;
}) {
  switch (request.type) {
    case "orders":
      return (
        <div className="grid grid-cols-3 gap-4 max-[700px]:grid-cols-2 max-[500px]:grid-cols-1">
          <Field label="Estado del pedido">
            <SelectInput
              name="order-status"
              onChange={(value) => onChange("orders", "status", value)}
              value={request.specific.orders.status}
            >
              <option value="">Todos los estados</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="IN_PRODUCTION">En producción</option>
              <option value="READY">Listo para entrega</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </SelectInput>
          </Field>
          <Field label="Cliente">
            <SelectInput
              disabled={options.clients.isLoading}
              name="order-client"
              onChange={(value) => onChange("orders", "clientId", value)}
              value={request.specific.orders.clientId}
            >
              <option value="">Todos los clientes</option>
              {(options.clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.deletedAt ? " · Inactivo" : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Atraso de entrega">
            <SelectInput
              name="order-overdue"
              onChange={(value) => onChange("orders", "overdue", value)}
              value={request.specific.orders.overdue}
            >
              <AnyBooleanOptions />
            </SelectInput>
          </Field>
        </div>
      );
    case "production":
      return (
        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
          <Field label="Estado del trabajo">
            <SelectInput
              name="production-status"
              onChange={(value) => onChange("production", "status", value)}
              value={request.specific.production.status}
            >
              <option value="">Todos los estados</option>
              <option value="TODO">Por iniciar</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="BLOCKED">Bloqueado</option>
              <option value="COMPLETED">Completado</option>
            </SelectInput>
          </Field>
          <Field label="Etapa">
            <SelectInput
              disabled={options.stages.isLoading}
              name="production-stage"
              onChange={(value) => onChange("production", "stageId", value)}
              value={request.specific.production.stageId}
            >
              <option value="">Todas las etapas</option>
              {(options.stages.data ?? []).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.position}. {stage.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Responsable">
            <input
              className={fieldClassName}
              maxLength={150}
              onChange={(event) =>
                onChange("production", "assignedTo", event.target.value)
              }
              placeholder="Nombre del responsable"
              value={request.specific.production.assignedTo}
            />
          </Field>
          <Field label="Trabajos bloqueados">
            <SelectInput
              name="production-blocked"
              onChange={(value) => onChange("production", "blocked", value)}
              value={request.specific.production.blocked}
            >
              <AnyBooleanOptions />
            </SelectInput>
          </Field>
        </div>
      );
    case "sales":
      return (
        <div className="grid max-w-sm grid-cols-1 gap-4">
          <Field label="Estado de la venta">
            <SelectInput
              name="sales-status"
              onChange={(value) => onChange("sales", "status", value)}
              value={request.specific.sales.status}
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abierta</option>
              <option value="PAID">Pagada</option>
              <option value="VOIDED">Anulada</option>
            </SelectInput>
          </Field>
        </div>
      );
    case "payments":
      return (
        <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <Field label="Método de pago">
            <SelectInput
              name="payment-method"
              onChange={(value) => onChange("payments", "method", value)}
              value={request.specific.payments.method}
            >
              <option value="">Todos los métodos</option>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
            </SelectInput>
          </Field>
          <Field label="Venta">
            <SelectInput
              disabled={options.sales.isLoading}
              name="payment-sale"
              onChange={(value) => onChange("payments", "saleId", value)}
              value={request.specific.payments.saleId}
            >
              <option value="">Todas las ventas</option>
              {(options.sales.data ?? []).map((sale) => (
                <option key={sale.id} value={sale.id}>
                  VTA-{String(sale.number).padStart(4, "0")} ·{" "}
                  {sale.order.client.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      );
    case "inventory":
      return (
        <div className="grid grid-cols-3 gap-4 max-[800px]:grid-cols-2 max-[500px]:grid-cols-1">
          <Field label="Disponibilidad">
            <SelectInput
              name="inventory-availability"
              onChange={(value) => onChange("inventory", "availability", value)}
              value={request.specific.inventory.availability}
            >
              <option value="">Todas</option>
              <option value="sufficient">Suficiente</option>
              <option value="low">Baja</option>
              <option value="out">Agotada</option>
            </SelectInput>
          </Field>
          <Field label="Unidad de medida">
            <SelectInput
              name="inventory-unit"
              onChange={(value) => onChange("inventory", "unit", value)}
              value={request.specific.inventory.unit}
            >
              <option value="">Todas las unidades</option>
              <option value="METER">Metro</option>
              <option value="UNIT">Unidad</option>
              <option value="ROLL">Rollo</option>
              <option value="KILOGRAM">Kilogramo</option>
            </SelectInput>
          </Field>
          <Field label="Material">
            <SelectInput
              disabled={options.items.isLoading}
              name="inventory-item"
              onChange={(value) => onChange("inventory", "itemId", value)}
              value={request.specific.inventory.itemId}
            >
              <option value="">Todos los materiales</option>
              {(options.items.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.sku ? ` · ${item.sku}` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Proveedor">
            <SelectInput
              disabled={options.suppliers.isLoading}
              name="inventory-supplier"
              onChange={(value) => onChange("inventory", "supplierId", value)}
              value={request.specific.inventory.supplierId}
            >
              <option value="">Todos los proveedores</option>
              {(options.suppliers.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.deletedAt ? " · Inactivo" : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Tipo de movimiento">
            <SelectInput
              name="inventory-movement-type"
              onChange={(value) => onChange("inventory", "movementType", value)}
              value={request.specific.inventory.movementType}
            >
              <option value="">Existencias actuales</option>
              <option value="RECEIPT">Entrada</option>
              <option value="ISSUE">Salida</option>
              <option value="SALE">Venta</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="RETURN">Devolución</option>
            </SelectInput>
          </Field>
        </div>
      );
    case "clients":
      return (
        <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <Field label="Estado del cliente">
            <SelectInput
              name="client-active"
              onChange={(value) => onChange("clients", "active", value)}
              value={request.specific.clients.active}
            >
              <AnyBooleanOptions />
            </SelectInput>
          </Field>
          <Field label="Actividad en el período">
            <SelectInput
              name="client-activity"
              onChange={(value) => onChange("clients", "withActivity", value)}
              value={request.specific.clients.withActivity}
            >
              <AnyBooleanOptions />
            </SelectInput>
          </Field>
        </div>
      );
    case "quotes":
      return (
        <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <Field label="Estado de la cotización">
            <SelectInput
              name="quote-status"
              onChange={(value) => onChange("quotes", "status", value)}
              value={request.specific.quotes.status}
            >
              <option value="">Todos los estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="SENT">Enviada</option>
              <option value="ACCEPTED">Aceptada</option>
              <option value="REJECTED">Rechazada</option>
              <option value="EXPIRED">Vencida</option>
            </SelectInput>
          </Field>
          <Field label="Conversión a pedido">
            <SelectInput
              name="quote-converted"
              onChange={(value) => onChange("quotes", "converted", value)}
              value={request.specific.quotes.converted}
            >
              <AnyBooleanOptions />
            </SelectInput>
          </Field>
        </div>
      );
    case "summary":
      return (
        <p className="m-0 text-sm leading-6 text-[#756875]">
          El resumen reúne el estado actual de pedidos, producción e inventario,
          junto con los movimientos comerciales del período seleccionado.
        </p>
      );
  }
}

export function ReportsPage() {
  const { getToken } = useAuth();
  const [draft, setDraft] = useState(createInitialRequest);
  const [applied, setApplied] = useState<ReportRequest | null>(
    createInitialRequest,
  );
  const [page, setPage] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const options = useReportFilterOptions(draft.type);
  const report = useReportData(applied, page);
  const filterOptionsFailed =
    (draft.type === "orders" && options.clients.isError) ||
    (draft.type === "production" && options.stages.isError) ||
    (draft.type === "payments" && options.sales.isError) ||
    (draft.type === "inventory" &&
      (options.items.isError || options.suppliers.isError));
  const isDirty =
    applied !== null && JSON.stringify(draft) !== JSON.stringify(applied);
  const datesAreValid =
    draft.dateMode !== "range" ||
    (Boolean(draft.from) && Boolean(draft.to) && draft.from <= draft.to);
  const reportTitle = reportTitles[applied?.type ?? draft.type];
  const currentResult =
    applied && !report.isError && report.data?.type === applied.type
      ? report.data
      : undefined;
  const filterGridColumns =
    draft.dateMode === "range"
      ? "grid-cols-[minmax(150px,0.75fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(190px,1.1fr)_auto]"
      : "grid-cols-[minmax(170px,0.8fr)_minmax(220px,1.1fr)_minmax(230px,1.15fr)_auto]";

  const updateSpecific = <K extends keyof ReportSpecificFilters>(
    group: K,
    key: keyof ReportSpecificFilters[K],
    value: string,
  ) => {
    setDraft(
      (current) =>
        ({
          ...current,
          specific: {
            ...current.specific,
            [group]: { ...current.specific[group], [key]: value },
          },
        }) as ReportRequest,
    );
  };

  const changeType = (type: ReportType) => {
    setDraft((current) => ({
      ...current,
      type,
      specific: createSpecificFilters(),
    }));
  };

  const generateReport = () => {
    if (!datesAreValid) return;
    setPage(1);
    setPdfError(null);
    setApplied({ ...draft, specific: { ...draft.specific } });
  };

  const exportPdf = async () => {
    if (!applied || !currentResult || isDirty || report.isFetching) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadReportPdf(getToken, applied);
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el reporte PDF.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-8 py-8 pb-14 max-[820px]:px-4 max-[820px]:py-6">
      <header className="mb-7 flex items-end justify-between gap-6 max-[700px]:items-start max-[700px]:flex-col">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#98728f]">
            Inteligencia del taller
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold leading-[1.08] tracking-[-1.8px] text-[#211b21]">
            Reportes y estadísticas
          </h1>
          <p className="mb-0 mt-2 max-w-2xl text-[15px] leading-6 text-[#645763]">
            Una lectura clara de pedidos, producción, materiales y actividad
            comercial.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 max-[700px]:w-full max-[700px]:items-start">
          <button
            className="inline-flex h-11 items-center justify-center gap-2.5 rounded-lg border border-[#8b5e83] bg-white px-4 text-sm font-semibold text-[#70466a] shadow-sm transition hover:bg-[#f8eff7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5e83] disabled:cursor-not-allowed disabled:opacity-45 max-[700px]:w-full"
            disabled={
              !applied ||
              !currentResult ||
              isDirty ||
              report.isFetching ||
              pdfBusy ||
              report.isError
            }
            onClick={() => void exportPdf()}
            type="button"
          >
            <Download size={17} strokeWidth={2} />
            {pdfBusy ? "Preparando PDF…" : "Exportar PDF"}
          </button>
          <span className="text-right text-[10px] leading-4 text-[#817381] max-[700px]:text-left">
            Hasta 100 filas de detalle; los indicadores abarcan el total
            filtrado.
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-[#e7dce5] bg-white p-5 shadow-[0_8px_28px_rgba(74,46,71,0.045)] max-[620px]:p-4">
        <div
          className={`grid ${filterGridColumns} items-end gap-4 max-[1150px]:grid-cols-2 max-[620px]:grid-cols-1`}
        >
          <Field label="Período">
            <SelectInput
              name="date-mode"
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  dateMode: value as ReportRequest["dateMode"],
                }))
              }
              value={draft.dateMode}
            >
              <option value="period">Período rápido</option>
              <option value="range">Rango personalizado</option>
            </SelectInput>
          </Field>
          {draft.dateMode === "period" ? (
            <Field label="Seleccionar período">
              <SelectInput
                name="period"
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    period: value as ReportPeriodPreset,
                  }))
                }
                value={draft.period}
              >
                {presetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <>
              <Field label="Fecha inicial">
                <span className="relative block">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8d7a8b]"
                    size={17}
                  />
                  <input
                    className={`${fieldClassName} pl-10`}
                    max={draft.to || undefined}
                    name="from"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    type="date"
                    value={draft.from}
                  />
                </span>
              </Field>
              <Field label="Fecha final">
                <span className="relative block">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8d7a8b]"
                    size={17}
                  />
                  <input
                    className={`${fieldClassName} pl-10`}
                    min={draft.from || undefined}
                    name="to"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    type="date"
                    value={draft.to}
                  />
                </span>
              </Field>
            </>
          )}
          <Field label="Tipo de reporte">
            <SelectInput
              name="report-type"
              onChange={(value) => changeType(value as ReportType)}
              value={draft.type}
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8b5e83] px-5 text-sm font-semibold text-white shadow-[0_5px_13px_rgba(112,70,106,0.16)] transition hover:bg-[#754d6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5e83] disabled:cursor-not-allowed disabled:opacity-50 max-[1150px]:col-span-2 max-[620px]:col-span-1"
            disabled={!datesAreValid || (report.isFetching && !isDirty)}
            onClick={generateReport}
            type="button"
          >
            <BarChart3 size={17} />
            Generar reporte
          </button>
        </div>
        {!datesAreValid && (
          <p className="mb-0 mt-3 text-sm font-medium text-[#a34242]">
            La fecha inicial debe ser anterior o igual a la fecha final.
          </p>
        )}
        <details className="group mt-4 border-t border-[#f0e8ef] pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[#6d596b] outline-none hover:bg-[#fcf7fb] focus-visible:ring-2 focus-visible:ring-[#c9adca] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Filter size={16} />
              Filtros adicionales · {reportTitles[draft.type]}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
              size={17}
            />
          </summary>
          <div className="mt-4 border-t border-[#f0e8ef] pt-4">
            <SpecificFilters
              onChange={updateSpecific}
              options={options}
              request={draft}
            />
            {filterOptionsFailed && (
              <p className="mb-0 mt-3 text-sm text-[#a34242]" role="status">
                No se pudieron cargar las opciones de estos filtros. Revisa la
                conexión e inténtalo de nuevo.
              </p>
            )}
            {!["production", "inventory"].includes(draft.type) && (
              <div className="mt-4 max-w-xs">
                <Field label="Agrupar por">
                  <SelectInput
                    name="group-by"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        groupBy: value as ReportRequest["groupBy"],
                      }))
                    }
                    value={draft.groupBy}
                  >
                    <option value="day">Día</option>
                    <option value="week">Semana</option>
                    <option value="month">Mes</option>
                  </SelectInput>
                </Field>
              </div>
            )}
          </div>
        </details>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#98728f]">
            {applied ? "Vista generada" : "Tipo seleccionado"}
          </p>
          <h2 className="mb-0 mt-1 flex items-center gap-2 text-lg font-bold text-[#342b35]">
            <FileText size={18} className="text-[#8b5e83]" />
            {reportTitle}
          </h2>
        </div>
        {currentResult && (
          <p className="m-0 text-xs text-[#7a6d79]">
            Período: {formatReportDate(currentResult.period.from)} —{" "}
            {formatReportDate(currentResult.period.to)}
          </p>
        )}
      </div>

      {isDirty && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#e9d7b5] bg-[#fffaf0] px-4 py-3.5 text-sm text-[#795f35]">
          <RotateCcw className="mt-0.5 shrink-0" size={17} />
          <p className="m-0 leading-6">
            Hay cambios de filtros por aplicar. El reporte mostrado sigue usando
            los criterios anteriores; genera el reporte para actualizarlos y
            habilitar la descarga PDF.
          </p>
        </div>
      )}

      {pdfError && (
        <div className="mt-4 rounded-lg border border-[#edd1d1] bg-[#fff5f5] px-4 py-3 text-sm text-[#a13f3f]">
          {pdfError}
        </div>
      )}

      {report.isError && (
        <div className="mt-5 rounded-xl border border-[#edd1d1] bg-[#fff7f7] p-5 text-sm text-[#a13f3f]">
          <strong className="block">No se pudo generar el reporte</strong>
          <span className="mt-1 block leading-6">
            Verifica los filtros y vuelve a intentarlo. Si tu sesión cambió,
            confirma que estés usando una cuenta administradora.
          </span>
        </div>
      )}

      {(report.isPending || (report.isFetching && !currentResult)) && (
        <div className="mt-5 grid min-h-64 place-items-center rounded-xl border border-[#e7dce5] bg-white text-sm text-[#796c78]">
          Generando {reportTitle.toLocaleLowerCase("es-SV")}…
        </div>
      )}

      {currentResult && applied && (
        <>
          <ReportOverview type={applied.type} result={currentResult} />
          <ReportTable
            isUpdating={report.isFetching}
            onPageChange={setPage}
            page={page}
            request={applied}
            result={currentResult}
            type={applied.type}
          />
        </>
      )}

      {report.isFetching && !report.isPending && (
        <p
          className="mb-0 mt-3 flex items-center gap-2 text-xs text-[#7c6e7b]"
          aria-live="polite"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b5e83] motion-reduce:animate-none" />
          Actualizando resultados…
        </p>
      )}
      {currentResult && !isDirty && !report.isFetching && (
        <p className="mb-0 mt-4 flex items-center gap-2 text-xs text-[#7c6e7b]">
          <Check size={14} className="text-[#53775f]" />
          Datos generados{" "}
          {new Intl.DateTimeFormat("es-SV", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/El_Salvador",
          }).format(new Date(currentResult.generatedAt))}
        </p>
      )}
    </main>
  );
}

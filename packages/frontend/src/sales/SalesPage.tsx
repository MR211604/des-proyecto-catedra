import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Eye, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Confirmation } from "../components/Confirmation.tsx";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { ApiError } from "../lib/api.ts";
import { useSaleMutations, useSales } from "./api.ts";
import { paymentStatusClasses, tabs } from "./constants.ts";
import {
  formatSaleDate,
  formatSaleMoney,
  paymentMethod,
  paymentStatus,
} from "./formatters.ts";
import { SaleDetailDrawer } from "./SaleDetailDrawer.tsx";
import type { Sale, SaleSort, SortOrder } from "./types.ts";

export function SalesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const rawStatus = searchParams.get("status");
  const activeTab = tabs.find((tab) => tab.value === rawStatus) ?? tabs[0];
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const sortBy: SaleSort =
    searchParams.get("sortBy") === "number" ? "number" : "createdAt";
  const order: SortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const query = useSales({
    page,
    limit: 20,
    status: activeTab.value,
    sortBy,
    order,
  });
  const { voidSale } = useSaleMutations();
  const sales = query.data?.data ?? [];
  const meta = query.data?.meta;

  useEffect(() => {
    if (query.error) toast.error("No se pudieron cargar las ventas.");
  }, [query.error]);

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function runVoid(id: string, number: number) {
    toast.custom(
      (confirmation) => (
        <Confirmation
          title="¿Anular venta?"
          text={`ORD-${number} será anulada. Sus pagos e historial se conservan.`}
          confirm="Anular venta"
          onClose={() => toast.remove(confirmation.id)}
          onConfirm={() => {
            toast.remove(confirmation.id);
            if (voidSale.isPending) return;
            void voidSale
              .mutateAsync(id)
              .then(() => toast.success("Venta anulada."))
              .catch((error: unknown) =>
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : "No se pudo anular la venta.",
                ),
              );
          }}
        />
      ),
      { duration: 8000, position: "top-center" },
    );
  }

  const columns: ColumnDef<typeof appTableFeatures, Sale, unknown>[] = [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ getValue }) => formatSaleDate(getValue<string>()),
    },
    {
      accessorKey: "number",
      header: "Pedido",
      cell: ({ getValue }) => <strong>ORD-{getValue<number>()}</strong>,
    },
    {
      id: "client",
      header: "Cliente",
      cell: ({ row }) => row.original.order.client.name,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ getValue }) => formatSaleMoney(getValue<string>()),
    },
    {
      accessorKey: "paidAmount",
      header: "Pagado",
      cell: ({ getValue }) => formatSaleMoney(getValue<string>()),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Saldo",
      cell: ({ getValue }) => formatSaleMoney(getValue<string>()),
    },
    {
      id: "method",
      header: "Método",
      cell: ({ row }) => paymentMethod(row.original),
    },
    {
      id: "paymentStatus",
      header: "Estado de pago",
      cell: ({ row }) => {
        const status = paymentStatus(row.original);
        return (
          <span
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${paymentStatusClasses[status]}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const sale = row.original;
        const voided = sale.status === "VOIDED";
        return (
          <div className="flex items-center gap-1">
            <button
              aria-label={`Ver venta ORD-${sale.number}`}
              className="cursor-pointer rounded-md p-2 text-[#766774] hover:bg-[#f6edf5]"
              onClick={() => setSelectedSaleId(sale.id)}
              type="button"
            >
              <Eye size={17} />
            </button>
            <button
              aria-label={`Anular venta ORD-${sale.number}`}
              className="cursor-pointer rounded-md p-2 text-[#766774] hover:bg-[#fff1f2] hover:text-[#9c3042] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={voided}
              onClick={() => runVoid(sale.id, sale.number)}
              type="button"
            >
              <Trash2 size={17} />
            </button>
          </div>
        );
      },
    },
  ];

  const showFrom =
    meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const showTo = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
      <div className="mb-7 flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            Relación del taller
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            Ventas
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            Consulta y organiza las ventas registradas del taller.
          </p>
        </div>
        <button
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a]"
          onClick={() => navigate("/ventas/nueva")}
          type="button"
        >
          <Plus size={18} />
          <span>Nueva venta</span>
        </button>
      </div>
      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div
            className="flex flex-wrap gap-2 rounded-xl bg-[#f8f0f7] p-1"
            role="tablist"
            aria-label="Estado de ventas"
          >
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={`rounded-lg border-0 px-4 py-2 text-sm font-bold transition ${activeTab === tab ? "bg-white text-[#70466a] shadow-sm" : "bg-transparent text-[#8a7886]"}`}
                key={tab.label}
                onClick={() => updateParams({ status: tab.value, page: "1" })}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[#eee2eb] px-5 py-3 text-xs text-[#806f7d] max-[620px]:items-start max-[620px]:flex-col">
          <span>
            {meta
              ? `${meta.total} ${meta.total === 1 ? "venta encontrada" : "ventas encontradas"}`
              : "Consultando ventas..."}
          </span>
          <div className="flex gap-2">
            {(["number", "createdAt"] as SaleSort[]).map((field) => (
              <button
                className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
                key={field}
                onClick={() =>
                  updateParams({
                    sortBy: field,
                    order: sortBy === field && order === "asc" ? "desc" : "asc",
                    page: "1",
                  })
                }
                type="button"
              >
                {field === "number" ? "Pedido" : "Fecha"}{" "}
                {sortBy === field ? (order === "asc" ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>
        </div>
        {query.isPending ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando ventas...
          </div>
        ) : query.isError ? (
          <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
            <p className="m-0 text-sm font-semibold text-[#5d4c59]">
              No pudimos cargar las ventas.
            </p>
            <button
              className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : sales.length === 0 ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <p className="m-0 text-base font-bold text-[#302630]">
                No hay ventas para mostrar
              </p>
              <p className="mt-2 mb-0 text-sm text-[#806f7d]">
                Prueba con otro estado seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={sales} />
        )}
        <footer className="flex items-center justify-between border-t border-[#eee2eb] px-5 py-4 text-sm text-[#5f525d]">
          <span>
            {meta ? `Mostrando ${showFrom}-${showTo} de ${meta.total}` : ""}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Página anterior"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Página siguiente"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!meta || page >= meta.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </section>
      {selectedSaleId ? (
        <SaleDetailDrawer
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      ) : null}
    </main>
  );
}

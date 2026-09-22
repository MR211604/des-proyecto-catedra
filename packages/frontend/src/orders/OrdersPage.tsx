import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Confirmation } from "../components/Confirmation.tsx";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { ApiError } from "../lib/api.ts";
import { useOrderMutations, useOrders } from "./api.ts";
import { statusClasses, statusLabels, tabs } from "./constants.ts";
import { formatOrderDate, formatOrderTotal } from "./formatters.ts";
import type { Order, OrderSort, OrderStatus, SortOrder } from "./types.ts";

export function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const rawStatus = searchParams.get("status") as OrderStatus | null;
  const status = tabs.some((tab) => tab.value === rawStatus)
    ? (rawStatus ?? undefined)
    : undefined;
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const sortBy: OrderSort =
    searchParams.get("sortBy") === "dueDate" ||
    searchParams.get("sortBy") === "number"
      ? (searchParams.get("sortBy") as OrderSort)
      : "createdAt";
  const order: SortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const query = useOrders({
    page,
    limit: 20,
    search: debouncedSearch,
    status,
    sortBy,
    order,
  });
  const { start, cancel } = useOrderMutations();
  const orders = query.data?.data ?? [];
  const meta = query.data?.meta;

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("search") ?? "")) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  useEffect(() => {
    if (query.error) toast.error("No se pudieron cargar los pedidos.");
  }, [query.error]);

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function runAction(id: string, action: "start" | "cancel", number: number) {
    const isStart = action === "start";
    const toastId = toast.custom(
      (confirmation) => (
        <Confirmation
          title={isStart ? "¿Empezar producción?" : "¿Cancelar pedido?"}
          text={`Pedido ORD-${number} será ${isStart ? "empezado" : "cancelado"}.`}
          confirm={isStart ? "Empezar" : "Cancelar pedido"}
          onClose={() => toast.remove(confirmation.id)}
          onConfirm={() => {
            toast.remove(confirmation.id);
            if (isStart ? start.isPending : cancel.isPending) return;
            void (isStart ? start.mutateAsync(id) : cancel.mutateAsync(id))
              .then(() =>
                toast.success(
                  isStart ? "Producción iniciada." : "Pedido cancelado.",
                ),
              )
              .catch((error: unknown) =>
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : "No se pudo actualizar el pedido.",
                ),
              );
          }}
        />
      ),
      { duration: 8000, position: "top-center" },
    );
    return toastId;
  }

  const columns: ColumnDef<typeof appTableFeatures, Order, unknown>[] = [
    {
      accessorKey: "number",
      header: "Código",
      cell: ({ getValue }) => <strong>ORD-{getValue<number>()}</strong>,
    },
    {
      id: "client",
      header: "Cliente",
      cell: ({ row }) => row.original.client.name,
    },
    {
      id: "quote",
      header: "ID de cotización",
      cell: ({ row }) =>
        row.original.quote ? `COT-${row.original.quote.number}` : "-",
    },
    {
      accessorKey: "notes",
      header: "Descripción",
      cell: ({ getValue }) => (
        <span
          className="block max-w-55 overflow-hidden text-ellipsis whitespace-nowrap"
          title={getValue<string | null>() ?? "-"}
        >
          {getValue<string | null>() ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const value = getValue<OrderStatus>();
        return (
          <span
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${statusClasses[value]}`}
          >
            {statusLabels[value]}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha creación",
      cell: ({ getValue }) => formatOrderDate(getValue<string>()),
    },
    {
      accessorKey: "dueDate",
      header: "Fecha estimada",
      cell: ({ getValue }) => formatOrderDate(getValue<string | null>()),
    },
    {
      id: "total",
      header: "Total",
      cell: ({ row }) => formatOrderTotal(row.original.items),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              aria-label="Editar pedido"
              className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
              onClick={() => navigate(`/pedidos/${order.id}/editar`)}
              type="button"
            >
              <Pencil size={17} />
            </button>
            {order.status === "CONFIRMED" ? (
              <button
                aria-label="Empezar producción"
                className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() => runAction(order.id, "start", order.number)}
                type="button"
              >
                <CirclePlay size={17} />
              </button>
            ) : null}
            {["CONFIRMED", "IN_PRODUCTION", "READY"].includes(order.status) ? (
              <button
                aria-label="Cancelar pedido"
                className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() => runAction(order.id, "cancel", order.number)}
                type="button"
              >
                <X size={17} />
              </button>
            ) : null}
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
            Pedidos
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            Consulta y organiza los pedidos del taller.
          </p>
        </div>
        <button
          className="flex min-h-12 items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a] cursor-pointer"
          onClick={() => navigate("/pedidos/nuevo")}
          type="button"
        >
          <Plus size={18} />
          <span>Nuevo pedido</span>
        </button>
      </div>
      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div
            className="flex flex-wrap gap-2 rounded-xl bg-[#f8f0f7] p-1"
            role="tablist"
            aria-label="Estado de pedidos"
          >
            {tabs.map((item) => (
              <button
                aria-selected={status === item.value}
                className={`rounded-lg border-0 px-4 py-2 text-sm font-bold transition ${status === item.value ? "bg-white text-[#70466a] shadow-sm" : "bg-transparent text-[#8a7886]"}`}
                key={item.label}
                onClick={() => updateParams({ status: item.value, page: "1" })}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex h-11 min-w-65 items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 text-[#8d7888] focus-within:border-[#8b5e83] max-[620px]:w-full">
            <Search size={18} />
            <span className="sr-only">Buscar pedidos</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#302630] outline-none placeholder:text-[#ab9ca8]"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar pedido o cotización..."
              value={searchInput}
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[#eee2eb] px-5 py-3 text-xs text-[#806f7d]">
          <span>
            {meta
              ? `${meta.total} ${meta.total === 1 ? "pedido encontrado" : "pedidos encontrados"}`
              : "Consultando pedidos..."}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
              onClick={() =>
                updateParams({
                  sortBy: "number",
                  order:
                    sortBy === "number" && order === "asc" ? "desc" : "asc",
                  page: "1",
                })
              }
              type="button"
            >
              Código {sortBy === "number" ? (order === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
              onClick={() =>
                updateParams({
                  sortBy: "createdAt",
                  order:
                    sortBy === "createdAt" && order === "asc" ? "desc" : "asc",
                  page: "1",
                })
              }
              type="button"
            >
              Creación{" "}
              {sortBy === "createdAt" ? (order === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
        </div>
        {query.isPending ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando pedidos...
          </div>
        ) : query.isError ? (
          <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
            <p className="m-0 text-sm font-semibold text-[#5d4c59]">
              No pudimos cargar los pedidos.
            </p>
            <button
              className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <p className="m-0 text-base font-bold text-[#302630]">
                No hay pedidos para mostrar
              </p>
              <p className="mt-2 mb-0 text-sm text-[#806f7d]">
                Prueba con otra búsqueda o cambia el estado seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={orders} />
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
    </main>
  );
}

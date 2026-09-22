import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { ApiError } from "../lib/api.ts";
import { useClientMutations, useClients } from "./api.ts";
import { ClientDetailDrawer } from "./ClientDetailDrawer.tsx";
import { formatClientDate } from "./formatters.ts";
import type { Client, ClientSort, ClientTab, SortOrder } from "./types.ts";

const tabs: { label: string; value: ClientTab }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function DisabledAction({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="cursor-not-allowed rounded-md p-2 text-[#96758f] opacity-55"
      disabled
      type="button"
    >
      {children}
    </button>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const rawTab = searchParams.get("tab");
  const tab: ClientTab =
    rawTab === "all" || rawTab === "inactive" ? rawTab : "active";
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawSort = searchParams.get("sortBy");
  const sortBy: ClientSort = rawSort === "createdAt" ? rawSort : "name";
  const rawOrder = searchParams.get("order");
  const order: SortOrder = rawOrder === "desc" ? rawOrder : "asc";
  const detailId = searchParams.get("detail");

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const query = useClients({
    page,
    limit: 20,
    search: debouncedSearch,
    tab,
    sortBy,
    order,
  });
  const { deactivate, restore } = useClientMutations();
  const clients = query.data?.data ?? [];
  const meta = query.data?.meta;

  useEffect(() => {
    if (query.error) toast.error("No se pudieron cargar los clientes.");
  }, [query.error]);

  const changeClientStatus = useCallback(
    (clientId: string, inactive: boolean, clientName: string) => {
      const runMutation = () => {
        const mutation = inactive ? restore : deactivate;
        void mutation
          .mutateAsync(clientId)
          .then(() =>
            toast.success(
              inactive ? "Cliente activado." : "Cliente desactivado.",
            ),
          )
          .catch((error: unknown) =>
            toast.error(
              error instanceof ApiError
                ? error.message
                : inactive
                  ? "No se pudo activar el cliente."
                  : "No se pudo desactivar el cliente.",
            ),
          );
      };

      if (inactive) {
        runMutation();
        return;
      }

      toast.custom(
        (confirmation) => (
          <div className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[#e5cddd] bg-[#fffafd] p-4 text-[#302630] shadow-[0_18px_40px_-20px_#4d3049]">
            <p className="m-0 text-sm font-bold">¿Desactivar cliente?</p>
            <p className="mt-1 mb-3 text-xs text-[#806f7d]">
              {clientName} dejará de aparecer entre los clientes activos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md px-3 py-1.5 text-xs font-bold text-[#806f7d] hover:bg-[#f6edf5] cursor-pointer"
                onClick={() => toast.remove(confirmation.id)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-[#8b5e83] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#70466a] cursor-pointer"
                onClick={() => {
                  toast.remove(confirmation.id);
                  runMutation();
                }}
                type="button"
              >
                Desactivar
              </button>
            </div>
          </div>
        ),
        { duration: 8000, position: "top-center" },
      );
    },
    [deactivate, restore],
  );

  const columns = useMemo<
    ColumnDef<typeof appTableFeatures, Client, unknown>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Nombre completo",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 font-semibold text-[#211b21]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1e6f0] text-xs font-bold text-[#865c7f]">
              {initials(row.original.name)}
            </span>
            <span>{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ getValue }) => getValue<string | null>() ?? "--",
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ getValue }) => getValue<string | null>() ?? "--",
      },
      {
        accessorKey: "createdAt",
        header: "Registro",
        cell: ({ getValue }) => formatClientDate(getValue<string>()),
      },
      {
        accessorKey: "deletedAt",
        header: "Estado",
        cell: ({ getValue }) => {
          const inactive = Boolean(getValue<string | null>());
          return (
            <span
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${inactive ? "bg-[#eee8ed] text-[#625660]" : "bg-[#f2e6f1] text-[#805276]"}`}
            >
              {inactive ? "Inactivo" : "Activo"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              aria-label="Ver cliente"
              className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("detail", row.original.id);
                setSearchParams(next, { replace: true });
              }}
              type="button"
            >
              <Eye size={17} />
            </button>
            {row.original.deletedAt ? (
              <DisabledAction label="Editar cliente">
                <Pencil size={17} />
              </DisabledAction>
            ) : (
              <button
                aria-label="Editar cliente"
                className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() => navigate(`/clientes/${row.original.id}/editar`)}
                type="button"
              >
                <Pencil size={17} />
              </button>
            )}
            <button
              aria-label={
                row.original.deletedAt
                  ? "Activar cliente"
                  : "Desactivar cliente"
              }
              className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deactivate.isPending || restore.isPending}
              onClick={() =>
                changeClientStatus(
                  row.original.id,
                  Boolean(row.original.deletedAt),
                  row.original.name,
                )
              }
              type="button"
            >
              {row.original.deletedAt ? (
                <RotateCcw size={17} />
              ) : (
                <Trash2 size={17} />
              )}
            </button>
          </div>
        ),
      },
    ],
    [
      deactivate.isPending,
      navigate,
      restore.isPending,
      searchParams,
      setSearchParams,
      changeClientStatus,
    ],
  );

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function changeTab(nextTab: ClientTab) {
    updateParams({ tab: nextTab, page: "1" });
  }

  function changeSort(nextSort: ClientSort) {
    updateParams({
      sortBy: nextSort,
      order: sortBy === nextSort && order === "asc" ? "desc" : "asc",
      page: "1",
    });
  }

  const showFrom =
    meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const showTo = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <>
      <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
        <div className="mb-7 flex items-start justify-between gap-4 max-[620px]:flex-col">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
              Relación del taller
            </p>
            <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
              Clientes
            </h1>
            <p className="mt-2 mb-0 text-sm text-[#786d77]">
              Consulta y organiza las personas que confían sus prendas al
              taller.
            </p>
          </div>
          <button
            className="flex min-h-12 items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a] cursor-pointer"
            onClick={() => navigate("/clientes/nuevo")}
            type="button"
          >
            <UserRoundPlus size={18} />
            <span>Nuevo cliente</span>
          </button>
        </div>
        <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
            <div
              className="flex gap-2 rounded-xl bg-[#f8f0f7] p-1"
              role="tablist"
              aria-label="Estado de clientes"
            >
              {tabs.map((item) => (
                <button
                  aria-selected={tab === item.value}
                  className={`rounded-lg border-0 px-4 py-2 text-sm font-bold transition ${tab === item.value ? "bg-white text-[#70466a] shadow-sm" : "bg-transparent text-[#8a7886]"}`}
                  key={item.value}
                  onClick={() => changeTab(item.value)}
                  role="tab"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="flex h-11 min-w-[260px] items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 text-[#8d7888] focus-within:border-[#8b5e83] max-[620px]:w-full">
              <Search size={18} />
              <span className="sr-only">Buscar clientes</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#302630] outline-none placeholder:text-[#ab9ca8]"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, correo..."
                value={searchInput}
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-[#eee2eb] px-5 py-3 text-xs text-[#806f7d] max-[620px]:items-start max-[620px]:flex-col">
            <span>
              {meta
                ? `${meta.total} ${meta.total === 1 ? "cliente encontrado" : "clientes encontrados"}`
                : "Consultando clientes..."}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
                onClick={() => changeSort("name")}
                type="button"
              >
                Nombre {sortBy === "name" ? (order === "asc" ? "↑" : "↓") : ""}
              </button>
              <button
                className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
                onClick={() => changeSort("createdAt")}
                type="button"
              >
                Alta{" "}
                {sortBy === "createdAt" ? (order === "asc" ? "↑" : "↓") : ""}
              </button>
            </div>
          </div>
          {query.isPending ? (
            <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
              Cargando clientes...
            </div>
          ) : query.isError ? (
            <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
              <p className="m-0 text-sm font-semibold text-[#5d4c59]">
                No pudimos cargar los clientes.
              </p>
              <button
                className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
                onClick={() => void query.refetch()}
                type="button"
              >
                Reintentar
              </button>
            </div>
          ) : clients.length === 0 ? (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div>
                <p className="m-0 text-base font-bold text-[#302630]">
                  No hay clientes para mostrar
                </p>
                <p className="mt-2 mb-0 text-sm text-[#806f7d]">
                  Prueba con otra búsqueda o cambia el estado seleccionado.
                </p>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={clients} />
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
      {detailId ? (
        <ClientDetailDrawer
          clientId={detailId}
          onClose={() => {
            const next = new URLSearchParams(searchParams);
            next.delete("detail");
            setSearchParams(next, { replace: true });
          }}
        />
      ) : null}
    </>
  );
}

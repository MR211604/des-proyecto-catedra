import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Truck,
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
import { Confirmation } from "../components/Confirmation.tsx";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { ApiError } from "../lib/api.ts";
import { useSupplierMutations, useSuppliers } from "./api.ts";
import { formatSupplierDate } from "./formatters.ts";
import type {
  SortOrder,
  Supplier,
  SupplierSort,
  SupplierTab,
} from "./types.ts";

const tabs: { label: string; value: SupplierTab }[] = [
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

export function SuppliersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const rawTab = searchParams.get("tab");
  const tab: SupplierTab =
    rawTab === "all" || rawTab === "inactive" ? rawTab : "active";
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawSort = searchParams.get("sortBy");
  const sortBy: SupplierSort = rawSort === "createdAt" ? rawSort : "name";
  const rawOrder = searchParams.get("order");
  const order: SortOrder = rawOrder === "desc" ? rawOrder : "asc";

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const query = useSuppliers({
    page,
    limit: 20,
    search: debouncedSearch,
    tab,
    sortBy,
    order,
  });
  const { deactivate, restore } = useSupplierMutations();
  const suppliers = query.data?.data ?? [];
  const meta = query.data?.meta;

  useEffect(() => {
    if (query.error) toast.error("No se pudieron cargar los proveedores.");
  }, [query.error]);

  const changeSupplierStatus = useCallback(
    (supplierId: string, inactive: boolean, supplierName: string) => {
      const runMutation = () => {
        const mutation = inactive ? restore : deactivate;
        void mutation
          .mutateAsync(supplierId)
          .then(() =>
            toast.success(
              inactive ? "Proveedor activado." : "Proveedor desactivado.",
            ),
          )
          .catch((error: unknown) =>
            toast.error(
              error instanceof ApiError
                ? error.message
                : inactive
                  ? "No se pudo activar el proveedor."
                  : "No se pudo desactivar el proveedor.",
            ),
          );
      };

      if (inactive) {
        runMutation();
        return;
      }

      toast.custom(
        (confirmation) => (
          <Confirmation
            title="¿Desactivar proveedor?"
            text={`${supplierName} dejará de aparecer entre los proveedores activos.`}
            confirm="Desactivar"
            onClose={() => toast.remove(confirmation.id)}
            onConfirm={() => {
              toast.remove(confirmation.id);
              runMutation();
            }}
          />
        ),
        { duration: 8000, position: "top-center" },
      );
    },
    [deactivate, restore],
  );

  const columns = useMemo<
    ColumnDef<typeof appTableFeatures, Supplier, unknown>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
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
        header: "Fecha de contratación",
        cell: ({ getValue }) => formatSupplierDate(getValue<string>()),
      },
      {
        accessorKey: "deletedAt",
        header: "Fecha de rescisión",
        cell: ({ getValue }) => formatSupplierDate(getValue<string | null>()),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              aria-label="Ver proveedor"
              className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
              onClick={() => navigate(`/proveedores/${row.original.id}`)}
              type="button"
            >
              <Eye size={17} />
            </button>
            {row.original.deletedAt ? (
              <DisabledAction label="Editar proveedor">
                <Pencil size={17} />
              </DisabledAction>
            ) : (
              <button
                aria-label="Editar proveedor"
                className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() =>
                  navigate(`/proveedores/${row.original.id}/editar`)
                }
                type="button"
              >
                <Pencil size={17} />
              </button>
            )}
            <button
              aria-label={
                row.original.deletedAt
                  ? "Activar proveedor"
                  : "Desactivar proveedor"
              }
              className="rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deactivate.isPending || restore.isPending}
              onClick={() =>
                changeSupplierStatus(
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
    [changeSupplierStatus, deactivate.isPending, navigate, restore.isPending],
  );

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function changeTab(nextTab: SupplierTab) {
    updateParams({ tab: nextTab, page: "1" });
  }

  function changeSort(nextSort: SupplierSort) {
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
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
      <div className="mb-7 flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            Abastecimiento del taller
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            Proveedores
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            Consulta y organiza las personas o negocios que abastecen tus
            materiales.
          </p>
        </div>
        <button
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a]"
          onClick={() => navigate("/proveedores/nuevo")}
          type="button"
        >
          <Truck size={18} />
          <span>Nuevo proveedor</span>
        </button>
      </div>
      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div
            aria-label="Estado de proveedores"
            className="flex gap-2 rounded-xl bg-[#f8f0f7] p-1"
            role="tablist"
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
          <label className="flex h-11 min-w-65 items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 text-[#8d7888] focus-within:border-[#8b5e83] max-[620px]:w-full">
            <Search size={18} />
            <span className="sr-only">Buscar proveedores</span>
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
              ? `${meta.total} ${meta.total === 1 ? "proveedor encontrado" : "proveedores encontrados"}`
              : "Consultando proveedores..."}
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
              Alta {sortBy === "createdAt" ? (order === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
        </div>
        {query.isPending ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando proveedores...
          </div>
        ) : query.isError ? (
          <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
            <p className="m-0 text-sm font-semibold text-[#5d4c59]">
              No pudimos cargar los proveedores.
            </p>
            <button
              className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <p className="m-0 text-base font-bold text-[#302630]">
                No hay proveedores para mostrar
              </p>
              <p className="mt-2 mb-0 text-sm text-[#806f7d]">
                Prueba con otra búsqueda o cambia el estado seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={suppliers} />
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

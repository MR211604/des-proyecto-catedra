import {
  CalendarDays,
  CircleAlert,
  Eye,
  Lock,
  Unlock,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../lib/api.ts";
import {
  useProductionJob,
  useProductionJobEvents,
  useProductionMutations,
} from "./api.ts";
import type { ProductionEvent, ProductionJobStatus } from "./types.ts";

const statusLabels: Record<ProductionJobStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  BLOCKED: "Bloqueado",
  COMPLETED: "Completado",
};

const eventLabels: Record<ProductionEvent["type"], string> = {
  STAGE_MOVED: "Trabajo movido de fase",
  BLOCKED: "Trabajo bloqueado",
  UNBLOCKED: "Trabajo desbloqueado",
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function eventDescription(event: ProductionEvent) {
  if (event.type === "STAGE_MOVED") {
    return `${event.fromStage?.name ?? "Fase anterior"} → ${event.toStage.name}`;
  }
  return event.toStage.name;
}

export function ProductionJobDrawer({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const jobQuery = useProductionJob(jobId);
  const eventsQuery = useProductionJobEvents(jobId);
  const mutations = useProductionMutations();
  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const job = jobQuery.data;
  const recentEvents = eventsQuery.data?.slice(-10).reverse();
  const isTransitioning =
    mutations.block.isPending || mutations.unblock.isPending;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = drawer.current.querySelectorAll<HTMLElement>(
        "button, a, input, textarea, select, [tabindex]:not([tabindex='-1'])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  async function toggleBlocked() {
    if (!job) return;
    const mutation =
      job.status === "BLOCKED" ? mutations.unblock : mutations.block;

    try {
      await mutation.mutateAsync({ jobId: job.id });
      toast.success(
        job.status === "BLOCKED"
          ? "Trabajo desbloqueado."
          : "Trabajo bloqueado.",
      );
    } catch (error: unknown) {
      console.log(error);
      toast.error(
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar el trabajo.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#211b21]/35">
      <button
        aria-label="Cerrar detalle del trabajo"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Detalle del trabajo de producción"
        aria-modal="true"
        className="relative flex h-full w-full max-w-140 flex-col overflow-y-auto bg-[#fffafd] shadow-[-12px_0_40px_rgba(74,46,71,0.2)]"
        ref={drawer}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfe8] px-6 py-6">
          <div>
            <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#98728f]">
              <Eye size={15} /> Ficha de producción
            </p>
            <h2 className="mt-2 mb-0 text-2xl font-bold text-[#211b21]">
              Detalle del trabajo
            </h2>
          </div>
          <button
            aria-label="Cerrar detalle del trabajo"
            className="cursor-pointer rounded-md p-2 text-[#6f616d] hover:bg-[#f6edf5]"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <X size={21} />
          </button>
        </header>

        {jobQuery.isPending ? (
          <p className="p-6 text-sm text-[#806f7d]">Cargando el trabajo...</p>
        ) : null}
        {jobQuery.isError ? (
          <p className="m-6 rounded-lg bg-[#fff1f1] p-4 text-sm text-[#a32626]">
            No se pudo cargar el detalle del trabajo.
          </p>
        ) : null}

        {job ? (
          <div className="grid gap-6 p-6">
            <section className="rounded-xl border border-[#e5cddd] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 font-mono text-xs font-bold text-[#98728f]">
                    ORD-{job.order.number}
                  </p>
                  <h3 className="mt-2 mb-0 text-xl font-bold text-[#211b21]">
                    {job.orderItem?.description ?? "Sin concepto"}
                  </h3>
                  <p className="mt-1 mb-0 text-sm text-[#6f616d]">
                    {job.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${job.status === "BLOCKED" ? "bg-[#fce7e7] text-[#a32626]" : "bg-[#f2e6f1] text-[#805276]"}`}
                >
                  {statusLabels[job.status]}
                </span>
              </div>

              <div className="mt-5 grid gap-3 border-t border-[#eadfe8] pt-4 text-sm text-[#514750]">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-[#98728f]" />
                  <span>{job.order.client.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center text-[#98728f]">◆</span>
                  <span>Fase: {job.stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-[#98728f]" />
                  <span>
                    Entrega estimada:{" "}
                    {formatDate(job.dueDate ?? job.order.dueDate)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#eadfe8] bg-[#fffafd] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="m-0 text-base font-bold text-[#302630]">
                    Control del trabajo
                  </h3>
                  <p className="mt-1 mb-0 text-sm text-[#806f7d]">
                    Al bloquearlo, no podrá moverse a otra fase.
                  </p>
                </div>
                {job.status === "BLOCKED" ? (
                  <CircleAlert className="shrink-0 text-[#ad2525]" size={20} />
                ) : null}
              </div>
              <button
                className={`mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${job.status === "BLOCKED" ? "border-[#8b5e83] bg-[#8b5e83] text-white hover:bg-[#70466a]" : "border-[#b34b5d] text-[#9c3042] hover:bg-[#fff1f2]"}`}
                disabled={isTransitioning}
                onClick={() => void toggleBlocked()}
                type="button"
              >
                {job.status === "BLOCKED" ? (
                  <Unlock size={16} />
                ) : (
                  <Lock size={16} />
                )}
                {isTransitioning
                  ? "Actualizando..."
                  : job.status === "BLOCKED"
                    ? "Desbloquear trabajo"
                    : "Bloquear trabajo"}
              </button>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#70466a]">
                  Historial de actividad
                </h3>
                <span className="text-xs text-[#806f7d]">
                  {recentEvents?.length ?? ""}
                </span>
              </div>
              {eventsQuery.isPending ? (
                <p className="m-0 text-sm text-[#806f7d]">
                  Cargando historial...
                </p>
              ) : null}
              {eventsQuery.isError ? (
                <p className="m-0 rounded-lg bg-[#fff1f1] p-3 text-sm text-[#a32626]">
                  No se pudo cargar el historial del trabajo.
                </p>
              ) : null}
              {recentEvents?.length === 0 ? (
                <p className="m-0 rounded-lg bg-[#fbf0fa] p-3 text-sm text-[#806f7d]">
                  Este trabajo aún no tiene actividad registrada.
                </p>
              ) : null}
              <div className="grid gap-3">
                {recentEvents?.map((event) => (
                  <div className="relative pl-6" key={event.id}>
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#93628a]" />
                    <p className="m-0 text-sm font-semibold text-[#3d343d]">
                      {eventLabels[event.type]}
                    </p>
                    <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                      {eventDescription(event)} ·{" "}
                      {formatDateTime(event.createdAt)}
                    </p>
                    {event.notes ? (
                      <p className="mt-1 mb-0 text-xs italic text-[#806f7d]">
                        “{event.notes}”
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

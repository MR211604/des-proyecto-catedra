import { CalendarDays, CircleAlert, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { useProductionBoard, useProductionMutations } from "./api.ts";
import type { ProductionJob, ProductionStage } from "./types.ts";

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function JobCard({
  job,
  isMoving,
  onDragStart,
}: {
  job: ProductionJob;
  isMoving: boolean;
  onDragStart: (jobId: string) => void;
}) {
  const dueDate = job.dueDate ?? job.order.dueDate;
  return (
    <article
      className={`group rounded-lg border bg-white p-5 shadow-[0_4px_14px_rgba(74,46,71,0.06)] transition-[opacity,box-shadow] hover:shadow-[0_6px_18px_rgba(74,46,71,0.12)] ${job.status === "BLOCKED" ? "border-[#bd7878] bg-[#fffafa]" : "border-[#dfd2dc]"} ${isMoving ? "opacity-45" : "opacity-100"}`}
      draggable={job.status !== "BLOCKED"}
      onDragStart={() => onDragStart(job.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-base font-bold text-[#211b21]">
            {job.orderItem?.description ?? "Sin concepto"}
          </h3>
          <p className="mt-1.5 mb-0 text-[15px] text-[#564b55]">
            {job.description}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-[#665a65]">
          ORD-{job.order.number}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-[#564b55]">
        <UserRound size={16} strokeWidth={1.8} />
        <span className="truncate">{job.order.client.name}</span>
      </div>
      <div className="mt-4 border-t border-[#eadfe8] pt-4">
        <div
          className={`flex items-center gap-2 text-sm ${job.status === "BLOCKED" ? "font-semibold text-[#ad2525]" : "text-[#564b55]"}`}
        >
          {job.status === "BLOCKED" ? (
            <CircleAlert size={16} strokeWidth={1.8} />
          ) : (
            <CalendarDays size={16} strokeWidth={1.8} />
          )}
          <span>
            {job.status === "BLOCKED"
              ? "Trabajo bloqueado"
              : formatDate(dueDate)}
          </span>
        </div>
      </div>
    </article>
  );
}

function StageColumn({
  stage,
  search,
  movingJobId,
  onDrop,
  onDragStart,
}: {
  stage: ProductionStage;
  search: string;
  movingJobId: string | undefined;
  onDrop: (stageId: string) => void;
  onDragStart: (jobId: string) => void;
}) {
  const jobs = stage.jobs.filter((job) => {
    const haystack =
      `${job.description} ${job.orderItem?.description ?? ""} ${job.order.client.name} ${job.order.number}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <section
      className="flex min-h-[calc(100vh-180px)] min-w-[290px] flex-1 flex-col rounded-xl border border-[#dfd2dc] bg-[#fffafd]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(stage.id)}
      aria-label={`Trabajos en ${stage.name}`}
    >
      <header className="flex items-center justify-between border-b border-[#e6dae4] px-5 py-5">
        <h2 className="m-0 flex items-center gap-3 text-[22px] tracking-[-0.5px]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#93628a]" />
          {stage.name}
        </h2>
        <span className="rounded bg-[#eee5ed] px-2.5 py-1 text-sm text-[#574950]">
          {jobs.length}
        </span>
      </header>
      <div className="grid content-start gap-4 p-5">
        {jobs.map((job) => (
          <JobCard
            isMoving={movingJobId === job.id}
            key={job.id}
            job={job}
            onDragStart={onDragStart}
          />
        ))}
        {jobs.length === 0 && (
          <p className="py-8 text-center text-sm text-[#927f8e]">
            No hay trabajos en esta fase.
          </p>
        )}
      </div>
    </section>
  );
}

export function ProductionPage() {
  const board = useProductionBoard();
  const mutations = useProductionMutations();
  const [search, setSearch] = useState("");
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  const moveJob = (stageId: string) => {
    if (!draggedJobId) return;
    mutations.move.mutate({ jobId: draggedJobId, stageId });
    setDraggedJobId(null);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-8 py-8 max-[820px]:px-4 max-[820px]:py-6">
      <div className="mb-6 flex items-center justify-between gap-5 max-[620px]:items-stretch max-[620px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            Operación del taller
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            Producción
          </h1>
        </div>
        <label className="flex h-12 w-[320px] items-center gap-3 rounded-lg border border-[#e1d5df] bg-white px-4 text-[#766975] shadow-sm max-[620px]:w-full">
          <Search size={19} />
          <span className="sr-only">Buscar en producción</span>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-[#968895]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar prenda o cliente..."
            value={search}
          />
        </label>
      </div>
      {board.isPending && (
        <p className="text-[#766975]">Cargando producción...</p>
      )}
      {board.isError && (
        <p className="rounded-lg bg-[#fff1f1] p-4 text-[#a32626]">
          No se pudo cargar el tablero de producción.
        </p>
      )}
      {board.data && (
        <div className="flex gap-6 overflow-x-auto pb-3">
          {board.data.map((stage) => (
            <StageColumn
              key={stage.id}
              onDragStart={setDraggedJobId}
              onDrop={moveJob}
              movingJobId={mutations.move.isPending ? mutations.move.variables?.jobId : undefined}
              search={search}
              stage={stage}
            />
          ))}
        </div>
      )}
      {mutations.move.isError && (
        <p className="mt-4 text-sm text-[#a32626]">
          No se pudo mover el trabajo. El tablero se actualizará con el estado
          actual.
        </p>
      )}
    </main>
  );
}

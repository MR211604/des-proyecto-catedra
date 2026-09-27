import { useUser } from "@clerk/react";
import { useDashboardSummary } from "./api";
import { formatDashboardMoney } from "./formatters";
import { RecentOrders } from "./RecentOrders";
import { StatCard } from "./StatCard";

export function Dashboard() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "Azucena";
  const summary = useDashboardSummary();
  const data = summary.data?.data;
  const fallbackDetail = summary.isError ? "No disponible" : "Cargando...";

  return (
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7 max-[820px]:pb-10">
      <section>
        <h1 className="m-0 text-[clamp(30px,3vw,40px)] leading-[1.2] tracking-[-1.2px]">
          Buen día, {firstName}
        </h1>
        <p className="mt-2 mb-0 text-xl text-[#4e444b] max-[480px]:text-base">
          Aquí está el resumen de tu taller para hoy.
        </p>
      </section>
      <section className="mt-10.5 grid grid-cols-4 gap-7.5 max-[1100px]:gap-4 max-[820px]:grid-cols-2 max-[480px]:mt-7 max-[480px]:grid-cols-1">
        <StatCard
          label="Pedidos Activos"
          value={data ? String(data.orders.totalActive) : "—"}
          detail={
            data
              ? `${data.orders.byStatus.CONFIRMED} sin iniciar`
              : fallbackDetail
          }
          icon="clipboard"
        />
        <StatCard
          label="Entregas Hoy"
          value={data ? String(data.orders.readyForDelivery) : "—"}
          detail={
            data
              ? data.orders.overdue > 0
                ? `${data.orders.overdue} retrasados`
                : "Sin retrasos"
              : fallbackDetail
          }
          icon="calendar"
        />
        <StatCard
          label="Trabajos de Producción"
          value={data ? String(data.production.currentJobs) : "—"}
          detail={
            data ? `${data.production.blockedJobs} bloqueados` : fallbackDetail
          }
          icon="scissors"
          tone="danger"
        />
        <StatCard
          label="Ventas del Mes"
          value={data ? formatDashboardMoney(data.sales.totalSold) : "—"}
          detail={
            data
              ? `${formatDashboardMoney(data.sales.totalCollected)} cobrado`
              : fallbackDetail
          }
          icon="cash"
        />
      </section>
      <div className="mt-7.5">
        <RecentOrders />
      </div>
    </main>
  );
}

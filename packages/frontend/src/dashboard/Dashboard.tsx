import { useUser } from "@clerk/react";
import { RecentOrders } from "./RecentOrders";
import { Sidebar } from "./Sidebar";
import { StatCard } from "./StatCard";
import { TodayAppointments } from "./TodayAppointments";
import { TopBar } from "./TopBar";

export function Dashboard() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "Azucena";

  return (
    <div className="flex min-h-screen bg-[#fcf9fb] text-[#1f1a20] max-[820px]:block">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="mx-auto max-w-[1440px] px-10 py-[38px] pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7 max-[820px]:pb-10">
          <section>
            <h1 className="m-0 text-[clamp(30px,3vw,40px)] leading-[1.2] tracking-[-1.2px]">
              Buen día, {firstName}
            </h1>
            <p className="mt-2 mb-0 text-xl text-[#4e444b] max-[480px]:text-base">
              Aquí está el resumen de tu taller para hoy.
            </p>
          </section>
          <section className="mt-[42px] grid grid-cols-4 gap-[30px] max-[1100px]:gap-4 max-[820px]:grid-cols-2 max-[480px]:mt-7 max-[480px]:grid-cols-1">
            <StatCard
              label="Pedidos Activos"
              value="42"
              detail="+3 nuevos hoy"
              icon="clipboard"
            />
            <StatCard
              label="Entregas Hoy"
              value="8"
              detail="3 pendientes"
              icon="calendar"
            />
            <StatCard
              label="Pendiente Producción"
              value="15"
              detail="2 retrasados"
              icon="scissors"
              tone="danger"
            />
            <StatCard
              label="Ventas del Mes"
              value="$4,250"
              detail="+12% vs mes anterior"
              icon="cash"
            />
          </section>
          <div className="mt-[30px] grid grid-cols-[minmax(0,1fr)_378px] gap-[30px] max-[1100px]:grid-cols-[minmax(0,1fr)_330px] max-[1100px]:gap-4 max-[820px]:grid-cols-1">
            <RecentOrders />
            <TodayAppointments />
          </div>
        </main>
      </div>
    </div>
  );
}

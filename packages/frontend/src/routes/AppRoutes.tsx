import { useAuth } from "@clerk/react";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ClientFormPage } from "../clients/ClientFormPage.tsx";
import { ClientsPage } from "../clients/ClientsPage.tsx";
import { Dashboard } from "../dashboard/Dashboard.tsx";
import { Sidebar } from "../dashboard/Sidebar.tsx";
import { TopBar } from "../dashboard/TopBar.tsx";
import { InventoryFormPage } from "../inventory/InventoryFormPage.tsx";
import { InventoryHistoryPage } from "../inventory/InventoryHistoryPage.tsx";
import { InventoryPage } from "../inventory/InventoryPage.tsx";
import { OrderFormPage } from "../orders/OrderFormPage.tsx";
import { OrdersPage } from "../orders/OrdersPage.tsx";
import { ProductionPage } from "../production/ProductionPage.tsx";
import { QuoteFormPage } from "../quotes/QuoteFormPage.tsx";
import { QuotesPage } from "../quotes/QuotesPage.tsx";
import { SaleFormPage } from "../sales/SaleFormPage.tsx";
import { SalesPage } from "../sales/SalesPage.tsx";
import { SupplierDetailPage } from "../suppliers/SupplierDetailPage.tsx";
import { SupplierFormPage } from "../suppliers/SupplierFormPage.tsx";
import { SuppliersPage } from "../suppliers/SuppliersPage.tsx";

const ReportsPage = lazy(() =>
  import("../reports/ReportsPage.tsx").then((module) => ({
    default: module.ReportsPage,
  })),
);

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen bg-[#fcf9fb] text-[#1f1a20] max-[820px]:block">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <Outlet />
      </div>
    </div>
  );
}

function ReportsRoute() {
  const { isLoaded, orgRole } = useAuth();

  if (!isLoaded) {
    return (
      <main className="grid min-h-[55vh] place-items-center text-[#766975]">
        Cargando permisos...
      </main>
    );
  }

  if (orgRole !== "org:admin") {
    return (
      <main className="mx-auto max-w-3xl px-8 py-16 max-[820px]:px-4">
        <section className="rounded-xl border border-[#e1d5df] bg-white p-8 shadow-[0_8px_28px_rgba(74,46,71,0.06)]">
          <h1 className="m-0 text-2xl font-bold text-[#352638]">
            Acceso restringido
          </h1>
          <p className="mb-0 mt-3 leading-7 text-[#665a65]">
            Los reportes del taller están disponibles únicamente para
            administradores de la organización.
          </p>
        </section>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="grid min-h-[55vh] place-items-center text-[#766975]">
          Cargando reportes…
        </main>
      }
    >
      <ReportsPage />
    </Suspense>
  );
}

export function AppRoutes() {
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const defaultRoute = isAdmin ? "/dashboard" : "/clientes";

  return (
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<Navigate replace to={defaultRoute} />} />
        {isAdmin && <Route path="dashboard" element={<Dashboard />} />}
        {isAdmin && <Route path="reportes" element={<ReportsRoute />} />}
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/nuevo" element={<ClientFormPage />} />
        <Route path="clientes/:id/editar" element={<ClientFormPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="proveedores/nuevo" element={<SupplierFormPage />} />
        <Route path="proveedores/:id" element={<SupplierDetailPage />} />
        <Route path="proveedores/:id/editar" element={<SupplierFormPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/nuevo" element={<OrderFormPage />} />
        <Route path="pedidos/:id/editar" element={<OrderFormPage />} />
        <Route path="cotizaciones" element={<QuotesPage />} />
        <Route path="cotizaciones/nueva" element={<QuoteFormPage />} />
        <Route path="cotizaciones/:id/editar" element={<QuoteFormPage />} />
        <Route path="produccion" element={<ProductionPage />} />
        <Route path="ventas" element={<SalesPage />} />
        <Route path="ventas/nueva" element={<SaleFormPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="inventario/nuevo" element={<InventoryFormPage />} />
        <Route path="inventario/:id" element={<InventoryHistoryPage />} />
        <Route path="inventario/:id/editar" element={<InventoryFormPage />} />
        <Route path="*" element={<Navigate replace to={defaultRoute} />} />
      </Route>
    </Routes>
  );
}

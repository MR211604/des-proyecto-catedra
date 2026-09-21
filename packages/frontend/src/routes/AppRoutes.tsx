import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Dashboard } from "../dashboard/Dashboard.tsx";
import { Sidebar } from "../dashboard/Sidebar.tsx";
import { TopBar } from "../dashboard/TopBar.tsx";
import { ClientFormPage } from "../clients/ClientFormPage.tsx";
import { ClientsPage } from "../clients/ClientsPage.tsx";
import { OrdersPage } from "../orders/OrdersPage.tsx";
import { OrderFormPage } from "../orders/OrderFormPage.tsx";

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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/nuevo" element={<ClientFormPage />} />
        <Route path="clientes/:id/editar" element={<ClientFormPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/nuevo" element={<OrderFormPage />} />
        <Route path="pedidos/:id/editar" element={<OrderFormPage />} />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

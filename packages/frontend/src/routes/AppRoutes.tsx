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
        <Route path="produccion" element={<ProductionPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="inventario/nuevo" element={<InventoryFormPage />} />
        <Route path="inventario/:id" element={<InventoryHistoryPage />} />
        <Route path="inventario/:id/editar" element={<InventoryFormPage />} />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

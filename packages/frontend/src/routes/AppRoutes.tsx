import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Dashboard } from "../dashboard/Dashboard.tsx";
import { Sidebar } from "../dashboard/Sidebar.tsx";
import { TopBar } from "../dashboard/TopBar.tsx";
import { ClientsPage } from "../clients/ClientsPage.tsx";

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
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

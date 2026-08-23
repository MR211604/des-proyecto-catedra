import { useAuth } from "@clerk/react";
import { SignInForm } from "./auth/SignInForm.tsx";
import { Dashboard } from "./dashboard/Dashboard.tsx";

function LoadingState() {
  return <main className="grid min-h-screen place-items-center bg-[#fcf9fb] text-[#8c7e89]">Cargando tu espacio de trabajo...</main>;
}

function WorkshopPanel() {
  return <section className="auth-workshop"><div className="auth-mark">CA</div><div><strong>Confecciones</strong><span>Azucena</span></div><p>Gestión sencilla para crear todos los días</p></section>;
}

function SignInHome() {
  return <main className="auth-layout"><WorkshopPanel /><section className="auth-form-area"><SignInForm /></section></main>;
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingState />;
  return isSignedIn ? <Dashboard /> : <SignInHome />;
}

export default App;

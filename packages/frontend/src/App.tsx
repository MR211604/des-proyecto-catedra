import { useAuth } from "@clerk/react";
import { SignInForm } from "./auth/SignInForm.tsx";
import { WorkshopPanel } from "./auth/WorkshopPanel.tsx";
import { Dashboard } from "./dashboard/Dashboard.tsx";

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fcf9fb] text-[#8c7e89]">
      Cargando tu espacio de trabajo...
    </main>
  );
}

function SignInHome() {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#fcf9fb] min-[821px]:grid-cols-[0.92fr_1.08fr]">
      <WorkshopPanel />
      <section className="grid min-h-screen place-items-center px-5 py-10 min-[821px]:p-16">
        <SignInForm />
      </section>
    </main>
  );
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingState />;
  return isSignedIn ? <Dashboard /> : <SignInHome />;
}

export default App;

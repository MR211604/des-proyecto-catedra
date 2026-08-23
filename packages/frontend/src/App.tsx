import { UserButton, useAuth, useUser } from "@clerk/react";
import { SignInForm } from "./auth/SignInForm.tsx";

function PlaceholderIcon() {
  return (
    <svg aria-hidden="true" className="size-14" fill="none" viewBox="0 0 56 56">
      <rect
        height="35"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.5"
        width="40"
        x="8"
        y="11"
      />
      <circle cx="20" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m13 40 10-10 7 6 5-5 8 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BrandMark() {
  return (
    <div
      className="grid size-10 place-items-center rounded-xl bg-white/75 text-sm font-bold tracking-[-0.08em] text-[#855578] shadow-sm ring-1 ring-[#cbaec5]/70"
      aria-hidden="true"
    >
      CA
    </div>
  );
}

function WorkshopPanel() {
  return (
    <section className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#e9dfe8] px-7 py-7 text-[#754d70] sm:px-12 sm:py-10 lg:min-h-screen lg:px-[clamp(2.5rem,6vw,7rem)] lg:py-12">
      <div className="pointer-events-none absolute -left-20 top-1/3 size-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#cdaec8]/20 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <BrandMark />
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[#875c80]">
            Confecciones
          </p>
          <p className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-[#4f3a4d]">
            Azucena
          </p>
        </div>
      </div>

      <div className="relative mx-auto my-10 flex w-full max-w-[380px] flex-col items-center justify-center text-center lg:my-0 lg:min-h-[390px]">
        <div className="grid size-[132px] place-items-center rounded-[30px] border border-dashed border-[#a77a9f] bg-white/25 text-[#95698d] shadow-[0_14px_35px_rgba(108,69,100,0.06)]">
          <PlaceholderIcon />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-[#684b63]">
          Espacio para identidad visual
        </p>
        <p className="mt-2 max-w-[250px] text-sm leading-6 text-[#8a6e84]">
          Placeholder preparado para una imagen futura del taller.
        </p>
      </div>

      <p className="relative text-xs tracking-wide text-[#977c92]">
        Gestión sencilla para crear todos los días
      </p>
    </section>
  );
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fcf7fa] text-sm text-[#8c7e89]">
      Cargando tu espacio de trabajo...
    </main>
  );
}

function SignedInHome() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "tu taller";

  return (
    <main className="min-h-screen bg-[#fcf7fa] px-6 py-6 sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm font-bold text-[#362635]">
              Confecciones Azucena
            </p>
            <p className="text-xs text-[#8b7d88]">Panel de trabajo</p>
          </div>
        </div>
        <UserButton />
      </header>
      <div className="mx-auto mt-16 max-w-6xl rounded-[22px] border border-[#eadfe8] bg-white p-8 shadow-[0_18px_55px_rgba(92,65,85,0.07)] sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#93618b]">
          Sesión activa
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#241d24]">
          Hola, {firstName}
        </h1>
        <p className="mt-3 max-w-xl text-[#746a73]">
          Tu espacio de trabajo está listo. Aquí podrás organizar las
          operaciones de tu taller.
        </p>
      </div>
    </main>
  );
}

function SignInHome() {
  return (
    <main className="grid min-h-screen bg-[#fcf7fa] lg:grid-cols-[minmax(360px,0.92fr)_minmax(560px,1.08fr)]">
      <WorkshopPanel />
      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
        <div className="flex w-full max-w-137 flex-col items-center">
          <SignInForm />
        </div>
      </section>
    </main>
  );
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingState />;

  return isSignedIn ? <SignedInHome /> : <SignInHome />;
}

export default App;

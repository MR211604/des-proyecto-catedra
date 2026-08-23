import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/react";

export function AuthControls() {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.username ?? "bienvenido";

  return (
    <nav className="auth-controls" aria-label="Controles de autenticación">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="auth-button auth-button-quiet">
            Iniciar sesión
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="auth-button auth-button-primary">
            Crear cuenta
          </button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        <span className="auth-welcome" aria-live="polite">
          Hola, {displayName}
        </span>
        <UserButton />
      </Show>
    </nav>
  );
}

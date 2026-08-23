import { useSignIn } from "@clerk/react";
import { useRef, useState } from "react";
import { AuthFeedback, getErrorMessage } from "./AuthFeedback.tsx";
import { AuthHeader } from "./AuthHeader.tsx";
import { CredentialsStep, type CredentialsValues } from "./CredentialsStep.tsx";
import { MfaStep, type MfaValues } from "./MfaStep.tsx";
import { NewPasswordStep, type NewPasswordValues } from "./NewPasswordStep.tsx";
import { ResetCodeStep, type ResetCodeValues } from "./ResetCodeStep.tsx";

type AuthStep = "credentials" | "mfa" | "reset-code" | "new-password";

const rememberMeStorageKey = "azucena.auth.remember-me";
const identifierStorageKey = "azucena.auth.identifier";

type RememberedCredentials = {
  identifier: string;
  rememberMe: boolean;
};

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRememberedCredentials(): RememberedCredentials {
  const storage = getLocalStorage();
  if (!storage) return { identifier: "", rememberMe: false };

  try {
    const rememberMe = storage.getItem(rememberMeStorageKey) === "true";

    return {
      identifier: rememberMe
        ? (storage.getItem(identifierStorageKey) ?? "")
        : "",
      rememberMe,
    };
  } catch {
    return { identifier: "", rememberMe: false };
  }
}

function updateRememberedCredentials(
  rememberMe: boolean,
  identifier: string,
) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    if (rememberMe) {
      storage.setItem(rememberMeStorageKey, "true");
      storage.setItem(identifierStorageKey, identifier);
    } else {
      storage.removeItem(rememberMeStorageKey);
      storage.removeItem(identifierStorageKey);
    }
  } catch {
    return;
  }
}

export function SignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const hasLoadedSignIn = useRef(false);
  const [rememberedCredentials] = useState(readRememberedCredentials);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [identifier, setIdentifier] = useState(
    rememberedCredentials.identifier,
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    rememberedCredentials.rememberMe,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    if (rememberMe) updateRememberedCredentials(true, value);
  }

  function handleRememberMeChange(value: boolean) {
    setRememberMe(value);
    updateRememberedCredentials(value, identifier);
  }

  if (fetchStatus !== "fetching") {
    hasLoadedSignIn.current = true;
  }

  async function handleCredentials({
    identifier,
    password,
  }: CredentialsValues) {
    if (!signIn) return;

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const result = await signIn.create({ identifier, password });

      if (result.error) {
        setError(getErrorMessage(result.error));
      } else if (signIn.status === "complete") {
        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error)
          setError(getErrorMessage(finalizeResult.error));
      } else if (signIn.status === "needs_second_factor") {
        setStep("mfa");
        setNotice("Ingresa el código de verificación para continuar.");
      } else {
        setError("La cuenta necesita un paso adicional de verificación.");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfa({ code }: MfaValues) {
    if (!signIn) return;

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn.mfa.verifyTOTP({ code });

      if (result.error) {
        setError(getErrorMessage(result.error));
      } else if (signIn.status === "complete") {
        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error)
          setError(getErrorMessage(finalizeResult.error));
      } else {
        setError("El código aún no puede verificarse.");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(identifier: string) {
    if (!signIn) return;
    if (!identifier.trim()) {
      setError("Escribe tu correo electrónico para recuperar tu contraseña.");
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const result = await signIn.create({ identifier });
      if (result.error) {
        setError(getErrorMessage(result.error));
      } else {
        const codeResult = await signIn.resetPasswordEmailCode.sendCode();
        if (codeResult.error) {
          setError(getErrorMessage(codeResult.error));
        } else {
          setStep("reset-code");
          setNotice("Enviamos un código de recuperación a tu correo.");
        }
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetCode({ code }: ResetCodeValues) {
    if (!signIn) return;

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (result.error) {
        setError(getErrorMessage(result.error));
      } else {
        setStep("new-password");
        setNotice("Código verificado. Elige una nueva contraseña.");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNewPassword({ newPassword }: NewPasswordValues) {
    if (!signIn) return;

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (result.error) {
        setError(getErrorMessage(result.error));
      } else if (signIn.status === "complete") {
        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error)
          setError(getErrorMessage(finalizeResult.error));
      } else {
        setError("No se pudo actualizar la contraseña.");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBackToCredentials() {
    setStep("credentials");
    setError("");
    setNotice("");
    setCode("");
  }

  if (
    !hasLoadedSignIn.current &&
    fetchStatus === "fetching" &&
    step === "credentials" &&
    !identifier &&
    !password
  ) {
    return (
      <div
        className="h-80 animate-pulse rounded-2xl bg-[#f5edf3]"
        aria-label="Cargando formulario"
        role="status"
      />
    );
  }

  const isCredentials = step === "credentials";
  const title = isCredentials
    ? "Iniciar sesión"
    : step === "mfa"
      ? "Verifica tu acceso"
      : "Recupera tu contraseña";
  const description = isCredentials
    ? "Ingresa tus datos para continuar"
    : step === "mfa"
      ? "Usa el código de tu aplicación de autenticación"
      : step === "reset-code"
        ? "Revisa tu correo e ingresa el código recibido"
        : "Crea una contraseña segura para tu cuenta";

  return (
    <div className="w-full max-w-137 rounded-[22px] border border-[#e8dfe5] bg-white px-6 py-8 shadow-[0_18px_55px_rgba(92,65,85,0.08)] sm:px-12 sm:py-11">
      <AuthHeader title={title} description={description} />
      <AuthFeedback error={error} notice={notice} />

      {isCredentials && (
        <CredentialsStep
          identifier={identifier}
          isSubmitting={isSubmitting}
          onForgotPassword={handleForgotPassword}
          onIdentifierChange={handleIdentifierChange}
          onPasswordChange={setPassword}
          onRememberMeChange={handleRememberMeChange}
          onShowPasswordChange={setShowPassword}
          onSubmit={handleCredentials}
          password={password}
          rememberMe={rememberMe}
          showPassword={showPassword}
        />
      )}

      {step === "mfa" && (
        <MfaStep
          code={code}
          isSubmitting={isSubmitting}
          onCodeChange={setCode}
          onSubmit={handleMfa}
        />
      )}

      {step === "reset-code" && (
        <ResetCodeStep
          code={code}
          isSubmitting={isSubmitting}
          onCodeChange={setCode}
          onSubmit={handleResetCode}
        />
      )}

      {step === "new-password" && (
        <NewPasswordStep
          isSubmitting={isSubmitting}
          newPassword={newPassword}
          onNewPasswordChange={setNewPassword}
          onSubmit={handleNewPassword}
        />
      )}

      {!isCredentials && (
        <button
          className="mx-auto mt-5 flex items-center gap-2 text-sm font-semibold text-[#87587f] hover:text-[#684061]"
          onClick={goBackToCredentials}
          type="button"
        >
          Volver al inicio de sesión
        </button>
      )}
    </div>
  );
}

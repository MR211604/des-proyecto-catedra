import { useSignIn } from "@clerk/react";
import { useState } from "react";
import { AuthFeedback, getErrorMessage } from "./AuthFeedback.tsx";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.6c2.63 0 4.83-.87 6.44-2.35l-3.14-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.73 9.73 0 0 0 12 21.6Z"
        fill="#34A853"
      />
      <path
        d="M6.53 13.7a5.85 5.85 0 0 1 0-3.4V7.77H3.29a9.72 9.72 0 0 0 0 8.46l3.24-2.53Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.27c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.82 3.37 14.62 2.4 12 2.4a9.73 9.73 0 0 0-8.71 5.37l3.24 2.53C7.3 7.99 9.46 6.27 12 6.27Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { signIn } = useSignIn();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    if (isSubmitting) return;
    if (!signIn) {
      setError("El servicio de autenticación aún no está listo.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/",
      });

      if (result.error) {
        setError(getErrorMessage(result.error));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="relative mb-5 flex items-center justify-center">
        <div className="absolute inset-x-0 border-t border-[#eee6ec]" />
        <span className="relative bg-white px-3 text-xs font-medium uppercase tracking-[0.16em] text-[#a0929d]">
          o continúa con
        </span>
      </div>
      <button
        aria-busy={isSubmitting}
        className="flex h-13 w-full items-center justify-center gap-3 rounded-[9px] border border-[#ddd3db] bg-white px-5 font-semibold text-[#40363f] transition hover:border-[#c7b9c5] hover:bg-[#fcf9fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93618b] disabled:cursor-wait disabled:opacity-65"
        disabled={isSubmitting}
        onClick={handleGoogleSignIn}
        type="button"
      >
        <GoogleIcon />
        {isSubmitting ? "Conectando..." : "Iniciar sesión con Google"}
      </button>
      <AuthFeedback error={error} notice="" />
    </div>
  );
}

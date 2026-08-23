type AuthFeedbackProps = {
  error: string;
  notice: string;
};

export function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (
      error as { errors?: Array<{ longMessage?: string; message?: string }> }
    ).errors;
    const firstError = errors?.[0];

    if (firstError) {
      return (
        firstError.longMessage ??
        firstError.message ??
        "No pudimos completar la solicitud."
      );
    }
  }

  if (error && typeof error === "object" && "longMessage" in error) {
    const clerkError = error as { longMessage?: string; message?: string };
    return (
      clerkError.longMessage ??
      clerkError.message ??
      "No pudimos completar la solicitud."
    );
  }

  return "No pudimos completar la solicitud. Revisa tus datos e inténtalo de nuevo.";
}

export function AuthFeedback({ error, notice }: AuthFeedbackProps) {
  return (
    <>
      {notice && (
        <p
          className="mb-5 rounded-xl bg-[#f5edf6] px-4 py-3 text-sm text-[#754d70]"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="mb-5 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a63e4d]"
          role="alert"
        >
          {error}
        </p>
      )}
    </>
  );
}

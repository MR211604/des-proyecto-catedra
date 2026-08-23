import { useForm } from "@tanstack/react-form";
import type { Dispatch, SetStateAction } from "react";
import { ArrowIcon, EyeIcon, LockIcon, MailIcon } from "./AuthIcons.tsx";

export type CredentialsValues = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

type CredentialsStepProps = {
  identifier: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSubmitting: boolean;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordChange: Dispatch<SetStateAction<boolean>>;
  onRememberMeChange: (value: boolean) => void;
  onForgotPassword: (identifier: string) => void;
  onSubmit: (values: CredentialsValues) => Promise<void>;
};

export function CredentialsStep({
  identifier,
  password,
  showPassword,
  rememberMe,
  isSubmitting,
  onIdentifierChange,
  onPasswordChange,
  onShowPasswordChange,
  onRememberMeChange,
  onForgotPassword,
  onSubmit,
}: CredentialsStepProps) {
  const form = useForm({
    defaultValues: {
      identifier,
      password,
      rememberMe,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="identifier">
        {(field) => (
          <label className="block text-left">
            <span className="mb-2 block text-[0.95rem] font-semibold text-[#272027]">
              Correo electrónico
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-[#8d808b]">
                <MailIcon />
              </span>
              <input
                autoComplete="email"
                className="h-13 w-full rounded-[9px] border border-[#ddd3db] bg-white pl-12 pr-4 text-[0.95rem] text-[#272027] outline-none transition placeholder:text-[#c5b9c2] focus:border-[#93618b] focus:ring-4 focus:ring-[#93618b]/10"
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const value = event.target.value;
                  field.handleChange(value);
                  onIdentifierChange(value);
                }}
                placeholder="tu@ejemplo.com"
                required
                type="email"
                value={field.state.value}
              />
            </span>
          </label>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <label className="block text-left">
            <span className="mb-2 block text-[0.95rem] font-semibold text-[#272027]">
              Contraseña
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-[#8d808b]">
                <LockIcon />
              </span>
              <input
                autoComplete="current-password"
                className="h-13 w-full rounded-[9px] border border-[#ddd3db] bg-white pl-12 pr-12 text-[0.95rem] text-[#272027] outline-none transition placeholder:text-[#c5b9c2] focus:border-[#93618b] focus:ring-4 focus:ring-[#93618b]/10"
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const value = event.target.value;
                  field.handleChange(value);
                  onPasswordChange(value);
                }}
                placeholder="••••••••"
                required
                type={showPassword ? "text" : "password"}
                value={field.state.value}
              />
              <button
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute inset-y-0 right-3 grid w-9 place-items-center rounded-md text-[#8d808b] transition hover:text-[#714869] focus-visible:outline-2 focus-visible:outline-[#93618b]"
                onClick={() => onShowPasswordChange((visible) => !visible)}
                type="button"
              >
                <EyeIcon hidden={!showPassword} />
              </button>
            </span>
          </label>
        )}
      </form.Field>

      <form.Field name="rememberMe">
        {(field) => (
          <div className="flex items-center justify-between gap-4 pt-1 text-[0.9rem]">
            <label className="flex cursor-pointer items-center gap-2 text-[#5f555e]">
              <input
                checked={field.state.value}
                className="size-4.5 accent-[#93618b]"
                onChange={(event) => {
                  const value = event.target.checked;
                  field.handleChange(value);
                  onRememberMeChange(value);
                }}
                type="checkbox"
              />
              <span>Recordarme</span>
            </label>
            <button
              className="font-semibold text-[#87587f] transition hover:text-[#684061] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => onForgotPassword(form.state.values.identifier)}
              type="button"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(formSubmitting) => {
          const submitting = isSubmitting || formSubmitting;

          return (
            <button
              className="flex h-13 w-full items-center justify-center gap-3 rounded-[9px] bg-[#93618b] px-5 font-semibold text-white shadow-[0_7px_16px_rgba(147,97,139,0.2)] transition hover:bg-[#805279] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#754d70] disabled:cursor-wait disabled:opacity-65"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Validando..." : "Iniciar sesión"}
              {!submitting && <ArrowIcon />}
            </button>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

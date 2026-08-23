import { useForm } from "@tanstack/react-form";

export type MfaValues = {
  code: string;
};

type MfaStepProps = {
  code: string;
  isSubmitting: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (values: MfaValues) => Promise<void>;
};

export function MfaStep({
  code,
  isSubmitting,
  onCodeChange,
  onSubmit,
}: MfaStepProps) {
  const form = useForm({
    defaultValues: { code },
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
      <form.Field name="code">
        {(field) => (
          <label className="block text-left">
            <span className="mb-2 block text-[0.95rem] font-semibold text-[#272027]">
              Código de verificación
            </span>
            <input
              autoComplete="one-time-code"
              className="h-13 w-full rounded-[9px] border border-[#ddd3db] px-4 text-center text-lg tracking-[0.35em] outline-none focus:border-[#93618b] focus:ring-4 focus:ring-[#93618b]/10"
              inputMode="numeric"
              onBlur={field.handleBlur}
              onChange={(event) => {
                const value = event.target.value;
                field.handleChange(value);
                onCodeChange(value);
              }}
              placeholder="000000"
              required
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(formSubmitting) => (
          <button
            className="flex h-13 w-full items-center justify-center gap-3 rounded-[9px] bg-[#93618b] font-semibold text-white transition hover:bg-[#805279] disabled:cursor-wait disabled:opacity-65"
            disabled={isSubmitting || formSubmitting}
            type="submit"
          >
            {isSubmitting || formSubmitting ? "Verificando..." : "Verificar código"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}

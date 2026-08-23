import { useForm } from "@tanstack/react-form";

export type NewPasswordValues = {
  newPassword: string;
};

type NewPasswordStepProps = {
  newPassword: string;
  isSubmitting: boolean;
  onNewPasswordChange: (value: string) => void;
  onSubmit: (values: NewPasswordValues) => Promise<void>;
};

export function NewPasswordStep({
  newPassword,
  isSubmitting,
  onNewPasswordChange,
  onSubmit,
}: NewPasswordStepProps) {
  const form = useForm({
    defaultValues: { newPassword },
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
      <form.Field name="newPassword">
        {(field) => (
          <label className="block text-left">
            <span className="mb-2 block text-[0.95rem] font-semibold text-[#272027]">
              Nueva contraseña
            </span>
            <input
              autoComplete="new-password"
              className="h-13 w-full rounded-[9px] border border-[#ddd3db] px-4 outline-none focus:border-[#93618b] focus:ring-4 focus:ring-[#93618b]/10"
              minLength={8}
              onBlur={field.handleBlur}
              onChange={(event) => {
                const value = event.target.value;
                field.handleChange(value);
                onNewPasswordChange(value);
              }}
              required
              type="password"
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(formSubmitting) => (
          <button
            className="flex h-13 w-full items-center justify-center rounded-[9px] bg-[#93618b] font-semibold text-white transition hover:bg-[#805279] disabled:cursor-wait disabled:opacity-65"
            disabled={isSubmitting || formSubmitting}
            type="submit"
          >
            {isSubmitting || formSubmitting
              ? "Actualizando..."
              : "Actualizar contraseña"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}

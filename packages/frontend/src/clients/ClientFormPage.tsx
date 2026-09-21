import { ArrowLeft, Info, Ruler, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useClient, useClientMutations } from "./api.ts";
import type { Client, ClientInput, MeasurementValues } from "./types.ts";

const measurementFields = [
  ["chest", "Pecho"],
  ["waist", "Cintura"],
  ["hips", "Cadera"],
  ["sleeveLength", "Largo de manga"],
  ["garmentLength", "Largo total"],
  ["shoulders", "Hombros"],
] as const;

type FormState = {
  name: string;
  phone: string;
  email: string;
  preferences: string;
  measurementNotes: string;
  measurements: Record<(typeof measurementFields)[number][0], string>;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  preferences: "",
  measurementNotes: "",
  measurements: {
    chest: "",
    waist: "",
    hips: "",
    sleeveLength: "",
    garmentLength: "",
    shoulders: "",
  },
};

function formFromClient(client: Client): FormState {
  const values = client.measurements?.values ?? {};
  return {
    name: client.name,
    phone: client.phone ?? "",
    email: client.email ?? "",
    preferences: client.notes ?? "",
    measurementNotes: client.measurements?.notes ?? "",
    measurements: Object.fromEntries(
      measurementFields.map(([key]) => [key, values[key]?.toString() ?? ""]),
    ) as FormState["measurements"],
  };
}

function buildInput(form: FormState): ClientInput {
  const values = Object.fromEntries(
    measurementFields.flatMap(([key]) => {
      const value = form.measurements[key].trim();
      return value ? [[key, Number(value)]] : [];
    }),
  ) as MeasurementValues;
  const input: ClientInput = {
    name: form.name.trim(),
    phone: form.phone.trim(),
  };

  if (form.email.trim()) input.email = form.email.trim();
  if (form.preferences.trim()) input.notes = form.preferences.trim();
  if (Object.keys(values).length > 0 || form.measurementNotes.trim()) {
    input.measurements = {
      unit: "cm",
      values,
      ...(form.measurementNotes.trim()
        ? { notes: form.measurementNotes.trim() }
        : {}),
    };
  }
  return input;
}

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!form.phone.trim()) errors.phone = "El teléfono es obligatorio.";
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }
  for (const [key, label] of measurementFields) {
    const value = form.measurements[key].trim();
    if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      errors.measurements = `${label} debe ser un número no negativo.`;
      break;
    }
  }
  return errors;
}

function Field({
  label,
  value,
  onChange,
  required,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
      <span>
        {label} {required ? <span className="text-[#b34b5d]">*</span> : null}
      </span>
      <input
        className={`h-12 border bg-white px-3 text-base font-normal text-[#4d4350] outline-none transition focus:border-[#8b5e83] ${error ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? (
        <span className="text-xs font-normal text-[#b34b5d]">{error}</span>
      ) : null}
    </label>
  );
}

export function ClientFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const clientQuery = useClient(id);
  const { create, update } = useClientMutations();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  useEffect(() => {
    if (clientQuery.data) setForm(formFromClient(clientQuery.data));
  }, [clientQuery.data]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input = buildInput(form);
    const mutation =
      isEditing && id
        ? update.mutateAsync({ id, input })
        : create.mutateAsync(input);
    void mutation
      .then((result) => {
        toast.success(
          isEditing ? "Cliente actualizado." : "Cliente registrado.",
        );
        navigate(`/clientes?detail=${result.id}`);
      })
      .catch((error: unknown) =>
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo guardar el cliente.",
        ),
      );
  }

  if (isEditing && clientQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando cliente...
      </div>
    );
  }
  if (isEditing && (clientQuery.isError || !clientQuery.data)) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        No se pudo cargar el cliente.
      </div>
    );
  }
  if (isEditing && clientQuery.data?.deletedAt) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="m-0 text-lg font-bold text-[#302630]">
            Este cliente está inactivo.
          </p>
          <p className="mt-2 text-sm text-[#806f7d]">
            Solo puedes restaurarlo desde su ficha.
          </p>
          <button
            className="mt-5 rounded-lg border-0 bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
            onClick={() => navigate(`/clientes?detail=${id}`)}
            type="button"
          >
            Ver ficha del cliente
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-[900px]">
        <button
          className="mb-8 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/clientes")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a clientes
        </button>
        <form
          className="rounded-xl bg-white px-6 py-8 shadow-[0_10px_35px_-25px_#70466a] sm:px-9"
          onSubmit={submit}
        >
          <header className="border-b border-[#eee2eb] pb-7">
            <h1 className="m-0 text-3xl font-bold tracking-[-1px] text-[#171318] sm:text-4xl">
              {isEditing ? "Editar Cliente" : "Registrar Nuevo Cliente"}
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              Completa los detalles para mantener actualizado el perfil del
              taller.
            </p>
          </header>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <UserRound size={23} /> Información personal
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                error={errors.name}
                label="Nombre completo"
                onChange={(value) => updateField("name", value)}
                required
                value={form.name}
              />
              <Field
                error={errors.phone}
                label="Teléfono"
                onChange={(value) => updateField("phone", value)}
                required
                value={form.phone}
              />
              <Field
                error={errors.email}
                label="Correo electrónico"
                onChange={(value) => updateField("email", value)}
                type="email"
                value={form.email}
              />
            </div>
          </section>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <Info size={23} /> Información adicional
            </h2>
            <label className="grid max-w-[560px] gap-2 text-sm font-semibold text-[#211b21]">
              Preferencias
              <textarea
                className="min-h-28 border border-[#9b9aa2] bg-white p-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                onChange={(event) =>
                  updateField("preferences", event.target.value)
                }
                value={form.preferences}
              />
            </label>
          </section>

          <section className="py-8">
            <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <Ruler size={23} /> Medidas del cliente{" "}
              <span className="rounded-full bg-[#eadfeb] px-3 py-1 text-xs font-medium text-[#443747]">
                Opcional
              </span>
            </h2>
            <p className="mb-5 text-sm text-[#806f7d]">
              Registra las medidas disponibles en centímetros. Puedes completar
              el resto después.
            </p>
            <div className="rounded-lg bg-[#fbf0fa] p-4 sm:p-7">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {measurementFields.map(([key, label]) => (
                  <Field
                    key={key}
                    label={`${label} (cm)`}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        measurements: { ...current.measurements, [key]: value },
                      }))
                    }
                    type="number"
                    value={form.measurements[key]}
                  />
                ))}
              </div>
              {errors.measurements ? (
                <p className="mt-3 text-xs text-[#b34b5d]">
                  {errors.measurements}
                </p>
              ) : null}
              <label className="mt-6 grid max-w-[560px] gap-2 text-sm font-semibold text-[#211b21]">
                Observaciones de medición
                <textarea
                  className="min-h-24 border border-[#9b9aa2] bg-white p-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                  onChange={(event) =>
                    updateField("measurementNotes", event.target.value)
                  }
                  value={form.measurementNotes}
                />
              </label>
            </div>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#eee2eb] pt-7">
            <button
              className="border-0 bg-transparent px-4 py-3 text-base text-[#211b21]"
              onClick={() => navigate("/clientes")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white disabled:opacity-50"
              disabled={create.isPending || update.isPending}
              type="submit"
            >
              {isEditing ? "Guardar cambios" : "Guardar cliente"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

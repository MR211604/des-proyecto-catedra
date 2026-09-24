import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Info, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useSupplier, useSupplierMutations } from "./api.ts";
import type { Supplier, SupplierInput } from "./types.ts";

type FormState = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

function formFromSupplier(supplier: Supplier): FormState {
  return {
    name: supplier.name,
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    notes: supplier.notes ?? "",
  };
}

function buildInput(form: FormState): SupplierInput {
  const input: SupplierInput = { name: form.name.trim() };
  if (form.phone.trim()) input.phone = form.phone.trim();
  if (form.email.trim()) input.email = form.email.trim();
  if (form.notes.trim()) input.notes = form.notes.trim();
  return input;
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

export function SupplierFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const supplierQuery = useSupplier(id);

  if (isEditing && supplierQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando proveedor...
      </div>
    );
  }
  if (isEditing && (supplierQuery.isError || !supplierQuery.data)) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        No se pudo cargar el proveedor.
      </div>
    );
  }
  if (isEditing && supplierQuery.data?.deletedAt) {
    return <InactiveSupplierState id={id} />;
  }

  return <SupplierFormEditor supplier={supplierQuery.data} id={id} />;
}

function InactiveSupplierState({ id }: { id: string | undefined }) {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="m-0 text-lg font-bold text-[#302630]">
          Este proveedor está inactivo.
        </p>
        <p className="mt-2 text-sm text-[#806f7d]">
          Solo puedes restaurarlo desde su ficha.
        </p>
        <button
          className="mt-5 rounded-lg border-0 bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
          onClick={() => navigate(`/proveedores/${id}`)}
          type="button"
        >
          Ver ficha del proveedor
        </button>
      </div>
    </div>
  );
}

function SupplierFormEditor({
  supplier,
  id,
}: {
  supplier: Supplier | undefined;
  id: string | undefined;
}) {
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { create, update } = useSupplierMutations();
  const form = useForm({
    defaultValues: supplier ? formFromSupplier(supplier) : emptyForm,
    onSubmit: async ({ value }) => {
      const input = buildInput(value);
      const mutation =
        isEditing && id
          ? update.mutateAsync({ id, input })
          : create.mutateAsync(input);
      await mutation
        .then((result) => {
          toast.success(
            isEditing ? "Proveedor actualizado." : "Proveedor registrado.",
          );
          navigate(`/proveedores/${result.id}`);
        })
        .catch((error: unknown) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "No se pudo guardar el proveedor.",
          ),
        );
    },
  });

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-225">
        <button
          className="mb-8 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/proveedores")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a proveedores
        </button>
        <form
          className="rounded-xl bg-white px-6 py-8 shadow-[0_10px_35px_-25px_#70466a] sm:px-9"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <header className="border-b border-[#eee2eb] pb-7">
            <h1 className="m-0 text-3xl font-bold tracking-[-1px] text-[#171318] sm:text-4xl">
              {isEditing ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              Mantén actualizados los datos de quienes abastecen los materiales
              del taller.
            </p>
          </header>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <Truck size={23} /> Información del proveedor
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <form.Field
                name="name"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : "El nombre es obligatorio.",
                }}
              >
                {(field) => (
                  <Field
                    error={field.state.meta.errors[0] as string}
                    label="Nombre"
                    onChange={field.handleChange}
                    required
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field name="phone">
                {(field) => (
                  <Field
                    label="Teléfono"
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="email"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() && !/^\S+@\S+\.\S+$/.test(value.trim())
                      ? "Ingresa un correo electrónico válido."
                      : undefined,
                }}
              >
                {(field) => (
                  <Field
                    error={field.state.meta.errors[0] as string}
                    label="Correo electrónico"
                    onChange={field.handleChange}
                    type="email"
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>
          </section>

          <section className="py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <Info size={23} /> Notas
            </h2>
            <form.Field name="notes">
              {(field) => (
                <textarea
                  className="min-h-28 w-full border border-[#9b9aa2] bg-white p-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Añade información útil sobre este proveedor..."
                  value={field.state.value}
                />
              )}
            </form.Field>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#eee2eb] pt-7">
            <button
              className="cursor-pointer border-0 bg-transparent px-4 py-3 text-base text-[#211b21]"
              onClick={() => navigate("/proveedores")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="cursor-pointer rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white disabled:opacity-50 hover:bg-[#70466a]"
              disabled={
                create.isPending || update.isPending || form.state.isSubmitting
              }
              type="submit"
            >
              {isEditing ? "Guardar cambios" : "Guardar proveedor"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Boxes, Package } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import {
  useInventoryItem,
  useInventoryMutations,
  useInventorySuppliers,
} from "./api.ts";
import type { InventoryItem, InventoryUnit } from "./types.ts";

type FormState = {
  name: string;
  sku: string;
  unit: InventoryUnit;
  quantity: string;
  reorderPoint: string;
  supplierId: string;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  unit: "METER",
  quantity: "0",
  reorderPoint: "0",
  supplierId: "",
};

const unitLabels: Record<InventoryUnit, string> = {
  METER: "Metros",
  UNIT: "Unidades",
  ROLL: "Rollos",
  KILOGRAM: "Kilogramos",
};

function formFromItem(item: InventoryItem): FormState {
  return {
    name: item.name,
    sku: item.sku ?? "",
    unit: item.unit,
    quantity: item.quantity,
    reorderPoint: item.reorderPoint,
    supplierId: item.supplierId ?? "",
  };
}

function isNonNegativeDecimal(value: string) {
  return /^\d+(?:\.\d{1,3})?$/.test(value.trim());
}

type CreateInput = {
  name: string;
  sku?: string;
  unit: InventoryUnit;
  quantity: string;
  reorderPoint: string;
  supplierId?: string;
};

type UpdateInput = {
  name: string;
  sku?: string | null;
  reorderPoint: string;
  supplierId?: string | null;
};

function optionalFields(value: FormState) {
  return {
    ...(value.sku.trim() ? { sku: value.sku.trim() } : {}),
    ...(value.supplierId ? { supplierId: value.supplierId } : {}),
  };
}

function buildCreateInput(value: FormState): CreateInput {
  return {
    name: value.name.trim(),
    unit: value.unit,
    quantity: value.quantity.trim(),
    reorderPoint: value.reorderPoint.trim(),
    ...optionalFields(value),
  };
}

function buildUpdateInput(value: FormState): UpdateInput {
  return {
    name: value.name.trim(),
    reorderPoint: value.reorderPoint.trim(),
    sku: value.sku.trim() || null,
    supplierId: value.supplierId || null,
  };
}

function Field({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  disabled = false,
  min,
  step,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
  min?: string;
  step?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
      <span>
        {label} {required ? <span className="text-[#b34b5d]">*</span> : null}
      </span>
      <input
        className={`h-12 border bg-white px-3 text-base font-normal text-[#4d4350] outline-none transition focus:border-[#8b5e83] disabled:cursor-not-allowed disabled:bg-[#f5f0f4] ${error ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type={type}
        value={value}
      />
      {error ? (
        <span className="text-xs font-normal text-[#b34b5d]">{error}</span>
      ) : null}
    </label>
  );
}

export function InventoryFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const itemQuery = useInventoryItem(id);
  const suppliersQuery = useInventorySuppliers();

  if (isEditing && itemQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando material...
      </div>
    );
  }

  if (isEditing && (itemQuery.isError || !itemQuery.data)) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center text-sm text-[#806f7d]">
        No se pudo cargar el material.
      </div>
    );
  }

  if (isEditing && itemQuery.data?.deletedAt) {
    return <InactiveInventoryState />;
  }

  return (
    <InventoryFormEditor
      id={id}
      isEditing={isEditing}
      item={itemQuery.data}
      suppliers={suppliersQuery.data ?? []}
      suppliersLoading={suppliersQuery.isPending}
    />
  );
}

function InactiveInventoryState() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="m-0 text-lg font-bold text-[#302630]">
          Este material está inactivo.
        </p>
        <p className="mt-2 text-sm text-[#806f7d]">
          Los materiales inactivos no se pueden editar.
        </p>
        <button
          className="mt-5 rounded-lg border-0 bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
          onClick={() => navigate("/inventario?tab=inactive")}
          type="button"
        >
          Volver al inventario
        </button>
      </div>
    </div>
  );
}

function InventoryFormEditor({
  id,
  isEditing,
  item,
  suppliers,
  suppliersLoading,
}: {
  id: string | undefined;
  isEditing: boolean;
  item: InventoryItem | undefined;
  suppliers: Array<{ id: string; name: string }>;
  suppliersLoading: boolean;
}) {
  const navigate = useNavigate();
  const { create, update } = useInventoryMutations();
  const form = useForm({
    defaultValues: item ? formFromItem(item) : emptyForm,
    onSubmit: async ({ value }) => {
      try {
        if (isEditing && id) {
          await update.mutateAsync({ id, input: buildUpdateInput(value) });
          toast.success("Material actualizado.");
        } else {
          await create.mutateAsync(buildCreateInput(value));
          toast.success("Material registrado.");
        }
        navigate("/inventario");
      } catch (error: unknown) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo guardar el material.",
        );
      }
    },
  });

  const saving =
    create.isPending || update.isPending || form.state.isSubmitting;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-225">
        <button
          className="mb-8 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/inventario")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a inventario
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
              {isEditing ? "Editar Material" : "Registrar Nuevo Material"}
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              {isEditing
                ? "Actualiza los datos descriptivos sin modificar la existencia actual."
                : "Registra un material para controlar sus existencias en el taller."}
            </p>
          </header>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <Package size={23} /> Datos del material
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
                    maxLength={150}
                    onChange={field.handleChange}
                    required
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field name="sku">
                {(field) => (
                  <Field
                    label="SKU (opcional)"
                    maxLength={100}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <label
                className="grid gap-2 text-sm font-semibold text-[#211b21]"
                htmlFor="inventory-unit"
              >
                <span>
                  Unidad de medida <span className="text-[#b34b5d]">*</span>
                </span>
                <form.Field name="unit">
                  {(field) => (
                    <select
                      id="inventory-unit"
                      className="h-12 border border-[#9b9aa2] bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] disabled:cursor-not-allowed disabled:bg-[#f5f0f4]"
                      disabled={isEditing}
                      onChange={(event) =>
                        field.handleChange(event.target.value as InventoryUnit)
                      }
                      value={field.state.value}
                    >
                      {Object.entries(unitLabels).map(([unit, label]) => (
                        <option key={unit} value={unit}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </form.Field>
              </label>
              <form.Field
                name="quantity"
                validators={{
                  onSubmit: ({ value }) =>
                    isEditing || isNonNegativeDecimal(value)
                      ? undefined
                      : "Ingresa una cantidad no negativa con hasta 3 decimales.",
                }}
              >
                {(field) => (
                  <Field
                    disabled={isEditing}
                    error={field.state.meta.errors[0] as string}
                    label={`Existencia inicial${isEditing ? " (no editable)" : ""}`}
                    min="0"
                    onChange={field.handleChange}
                    required={!isEditing}
                    step="0.001"
                    type="number"
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="reorderPoint"
                validators={{
                  onSubmit: ({ value }) =>
                    isNonNegativeDecimal(value)
                      ? undefined
                      : "Ingresa un punto de reorden no negativo con hasta 3 decimales.",
                }}
              >
                {(field) => (
                  <Field
                    error={field.state.meta.errors[0] as string}
                    label="Punto de reorden"
                    min="0"
                    onChange={field.handleChange}
                    required
                    step="0.001"
                    type="number"
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <label
                className="grid gap-2 text-sm font-semibold text-[#211b21]"
                htmlFor="inventory-supplier"
              >
                <span>Supplier (opcional)</span>
                <form.Field name="supplierId">
                  {(field) => (
                    <select
                      id="inventory-supplier"
                      className="h-12 border border-[#9b9aa2] bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                      disabled={suppliersLoading}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    >
                      <option value="">
                        {suppliersLoading
                          ? "Cargando suppliers..."
                          : "Sin supplier"}
                      </option>
                      {item?.supplierId &&
                      !suppliers.some(
                        (supplier) => supplier.id === item.supplierId,
                      ) ? (
                        <option disabled value={item.supplierId}>
                          Supplier actual (inactivo)
                        </option>
                      ) : null}
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  )}
                </form.Field>
              </label>
            </div>
          </section>

          <section className="rounded-lg bg-[#fbf0fa] p-5 text-sm text-[#5b4b58]">
            <div className="flex items-start gap-3">
              <Boxes className="mt-0.5 shrink-0 text-[#8b5e83]" size={20} />
              <p className="m-0">
                {isEditing
                  ? "Para cambiar la existencia, registra un movimiento desde el inventario."
                  : "La existencia inicial se registra con el material y no crea un movimiento de stock."}
              </p>
            </div>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#eee2eb] pt-7">
            <button
              className="cursor-pointer border-0 bg-transparent px-4 py-3 text-base text-[#211b21]"
              onClick={() => navigate("/inventario")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="cursor-pointer rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white hover:bg-[#70466a] disabled:opacity-50"
              disabled={saving || suppliersLoading}
              type="submit"
            >
              {isEditing ? "Guardar cambios" : "Guardar material"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Boxes, FileText, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useQuote, useQuoteFormMutations, useQuoteFormOptions } from "./api.ts";
import type {
  QuoteDetail,
  QuoteInput,
  QuoteMaterialUnit,
} from "./types.ts";

type MaterialForm = {
  id: string;
  inventoryItemId: string;
  quantity: string;
};

type ItemForm = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  materials: MaterialForm[];
};

type FormState = {
  clientId: string;
  validUntil: string;
  notes: string;
  items: ItemForm[];
};

let formIdCounter = 0;
function formId(prefix: string) {
  formIdCounter += 1;
  return `${prefix}-${formIdCounter}`;
}

const emptyItem = (): ItemForm => ({
  id: formId("item"),
  description: "",
  quantity: "1",
  unitPrice: "",
  materials: [],
});

const emptyForm: FormState = {
  clientId: "",
  validUntil: "",
  notes: "",
  items: [emptyItem()],
};

const unitLabels: Record<QuoteMaterialUnit, string> = {
  METER: "metros",
  UNIT: "unidades",
  ROLL: "rollos",
  KILOGRAM: "kilogramos",
};

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function formFromQuote(quote: QuoteDetail): FormState {
  return {
    clientId: quote.client.id,
    validUntil: dateInput(quote.validUntil),
    notes: quote.notes ?? "",
    items: quote.items.map((item) => ({
      id: formId("item"),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      materials: item.materials.map((material) => ({
        id: formId("material"),
        inventoryItemId: material.inventoryItemId,
        quantity: material.quantity,
      })),
    })),
  };
}

function isDecimal(value: string, scale: number) {
  return new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(value.trim());
}

function isPositiveDecimal(value: string, scale: number) {
  return isDecimal(value, scale) && Number(value) > 0;
}

function buildInput(
  value: FormState,
  inventory: Array<{ id: string; unit: QuoteMaterialUnit }>,
): QuoteInput {
  return {
    clientId: value.clientId,
    ...(value.validUntil ? { validUntil: value.validUntil } : {}),
    ...(value.notes.trim() ? { notes: value.notes.trim() } : {}),
    items: value.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unitPrice: item.unitPrice.trim(),
      ...(item.materials.length > 0
        ? {
            materials: item.materials.map((material) => ({
              inventoryItemId: material.inventoryItemId,
              quantity: material.quantity.trim(),
              unit:
                inventory.find(
                  (candidate) => candidate.id === material.inventoryItemId,
                )?.unit ?? "UNIT",
            })),
          }
        : {}),
    })),
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  error,
  min,
  step,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
  min?: string;
  step?: string;
  maxLength?: number;
}) {
  return (
    <label className="relative grid gap-2 text-sm font-semibold text-[#211b21]">
      <span>
        {label} {required ? <span className="text-[#b34b5d]">*</span> : null}
      </span>
      <input
        className={`h-12 border bg-white px-3 text-base font-normal text-[#4d4350] outline-none transition focus:border-[#8b5e83] ${error ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type={type}
        value={value}
      />
      {error ? (
        <span className="absolute top-full left-0 mt-1 text-xs font-normal text-[#b34b5d]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function QuoteFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const quoteQuery = useQuote(id);

  if (isEditing && quoteQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando cotización...
      </div>
    );
  }

  if (isEditing && (quoteQuery.isError || !quoteQuery.data)) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center text-sm text-[#806f7d]">
        No se pudo cargar la cotización.
      </div>
    );
  }

  if (isEditing && quoteQuery.data?.status !== "DRAFT") {
    return <UnavailableQuoteState />;
  }

  return <QuoteFormEditor id={id} quote={quoteQuery.data} />;
}

function UnavailableQuoteState() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="m-0 text-lg font-bold text-[#302630]">
          Esta cotización ya no es un borrador.
        </p>
        <p className="mt-2 text-sm text-[#806f7d]">
          Solo puedes editar cotizaciones que estén en estado borrador.
        </p>
        <button
          className="mt-5 rounded-lg border-0 bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
          onClick={() => navigate("/cotizaciones")}
          type="button"
        >
          Volver a cotizaciones
        </button>
      </div>
    </div>
  );
}

function QuoteFormEditor({
  id,
  quote,
}: {
  id: string | undefined;
  quote: QuoteDetail | undefined;
}) {
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const options = useQuoteFormOptions();
  const { create, update } = useQuoteFormMutations();
  const form = useForm({
    defaultValues: quote ? formFromQuote(quote) : emptyForm,
    onSubmit: async ({ value }) => {
      const input = buildInput(value, options.inventory.data ?? []);
      try {
        if (isEditing && id) {
          await update.mutateAsync({ id, input });
          toast.success("Cotización actualizada.");
        } else {
          await create.mutateAsync(input);
          toast.success("Cotización registrada.");
        }
        navigate("/cotizaciones");
      } catch (error: unknown) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo guardar la cotización.",
        );
      }
    },
  });

  const saving =
    create.isPending || update.isPending || form.state.isSubmitting;
  const optionsLoading =
    options.clients.isPending || options.inventory.isPending;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-250">
        <button
          className="mb-8 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/cotizaciones")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a cotizaciones
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
              {isEditing ? "Editar Cotización" : "Registrar Nueva Cotización"}
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              Prepara una propuesta comercial para el cliente antes de enviarla.
            </p>
          </header>

          <form.Subscribe selector={(state) => state.fieldMeta}>
            {(fieldMeta) => {
              const errors = [
                ...new Set(
                  Object.values(fieldMeta).flatMap(
                    (meta) => meta?.errors.map(String) ?? [],
                  ),
                ),
              ];
              return errors.length > 0 ? (
                <div className="mt-6 rounded-lg bg-[#fff1f2] p-4 text-sm text-[#9a4050]">
                  <p className="m-0 font-bold">Revisa estos campos:</p>
                  <ul className="mt-2 mb-0 list-disc pl-5">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            }}
          </form.Subscribe>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <FileText size={23} /> Información de la cotización
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <label
                className="relative grid gap-2 text-sm font-semibold text-[#211b21]"
                htmlFor="quote-client"
              >
                <span>
                  Cliente <span className="text-[#b34b5d]">*</span>
                </span>
                <form.Field
                  name="clientId"
                  validators={{
                    onSubmit: ({ value }) =>
                      value ? undefined : "Selecciona un cliente.",
                  }}
                >
                  {(field) => (
                    <>
                      <select
                        id="quote-client"
                        className={`h-12 border bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${field.state.meta.errors[0] ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        value={field.state.value}
                      >
                        <option value="">
                          {options.clients.isPending
                            ? "Cargando clientes..."
                            : "Selecciona un cliente"}
                        </option>
                        {options.clients.data?.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      {field.state.meta.errors[0] ? (
                        <span className="absolute top-full left-0 mt-1 text-xs font-normal text-[#b34b5d]">
                          {field.state.meta.errors[0] as string}
                        </span>
                      ) : null}
                    </>
                  )}
                </form.Field>
              </label>
              <form.Field name="validUntil">
                {(field) => (
                  <Field
                    label="Válida hasta (opcional)"
                    onChange={field.handleChange}
                    type="date"
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>
            <label
              className="mt-6 grid w-full gap-2 text-sm font-semibold text-[#211b21]"
              htmlFor="quote-notes"
            >
              Notas
              <form.Field name="notes">
                {(field) => (
                  <textarea
                    id="quote-notes"
                    className="min-h-28 border border-[#9b9aa2] bg-white p-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                    maxLength={1000}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </label>
          </section>

          <section className="py-8">
            <div className="mb-7 flex items-center justify-between gap-3">
              <h2 className="m-0 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
                <Boxes size={23} /> Conceptos de la cotización
              </h2>
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 py-2 text-sm font-bold text-[#70466a] hover:border-[#8b5e83]"
                onClick={() => form.pushFieldValue("items", emptyItem())}
                type="button"
              >
                <Plus size={17} /> Agregar concepto
              </button>
            </div>
            <div className="grid gap-5">
              <form.Field
                name="items"
                validators={{
                  onSubmit: ({ value }) =>
                    value.length > 0
                      ? undefined
                      : "Agrega al menos un concepto.",
                }}
              >
                {(itemsField) =>
                  itemsField.state.value.map((item, index) => (
                    <article
                      className="rounded-lg bg-[#fbf0fa] p-4 sm:p-6"
                      key={item.id}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="m-0 text-base font-bold text-[#443747]">
                          Concepto {index + 1}
                        </h3>
                        {itemsField.state.value.length > 1 ? (
                          <button
                            aria-label={`Eliminar concepto ${index + 1}`}
                            className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-white"
                            onClick={() => itemsField.removeValue(index)}
                            type="button"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
                        <form.Field
                          name={`items[${index}].description`}
                          validators={{
                            onSubmit: ({ value }) =>
                              value.trim()
                                ? undefined
                                : `El concepto ${index + 1} necesita una descripción.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Descripción"
                              maxLength={500}
                              onChange={field.handleChange}
                              required
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                        <form.Field
                          name={`items[${index}].quantity`}
                          validators={{
                            onSubmit: ({ value }) =>
                              isPositiveDecimal(value, 3)
                                ? undefined
                                : `La cantidad del concepto ${index + 1} debe ser mayor que cero y tener hasta 3 decimales.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Cantidad"
                              min="0"
                              onChange={field.handleChange}
                              required
                              step="0.001"
                              type="number"
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                        <form.Field
                          name={`items[${index}].unitPrice`}
                          validators={{
                            onSubmit: ({ value }) =>
                              isDecimal(value, 2)
                                ? undefined
                                : `El precio unitario del concepto ${index + 1} debe ser válido y tener hasta 2 decimales.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Precio unitario"
                              min="0"
                              onChange={field.handleChange}
                              required
                              step="0.01"
                              type="number"
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                      </div>

                      <div className="mt-8 border-t border-[#eadde7] pt-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="m-0 text-sm font-bold text-[#70466a]">
                            Materiales
                          </h4>
                          <button
                            className="cursor-pointer text-xs font-bold text-[#8b5e83]"
                            onClick={() =>
                              form.pushFieldValue(`items[${index}].materials`, {
                                id: formId("material"),
                                inventoryItemId: "",
                                quantity: "",
                              })
                            }
                            type="button"
                          >
                            + Agregar material
                          </button>
                        </div>
                        {item.materials.length === 0 ? (
                          <p className="m-0 text-xs text-[#806f7d]">
                            Opcional. Agrega los materiales previstos para este
                            concepto.
                          </p>
                        ) : (
                          <div className="grid gap-3">
                            {item.materials.map((material, materialIndex) => {
                              const selected = options.inventory.data?.find(
                                (inventoryItem) =>
                                  inventoryItem.id === material.inventoryItemId,
                              );
                              return (
                                <div
                                  className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_1fr_auto]"
                                  key={material.id}
                                >
                                  <label
                                    className="relative grid gap-2 text-sm font-semibold text-[#211b21]"
                                    htmlFor={`quote-material-${index}-${materialIndex}`}
                                  >
                                    <span>Material</span>
                                    <form.Field
                                      name={`items[${index}].materials[${materialIndex}].inventoryItemId`}
                                      validators={{
                                        onSubmit: ({ value }) => {
                                          if (!value) {
                                            return `Selecciona el material ${materialIndex + 1} del concepto ${index + 1}.`;
                                          }
                                          const materials = form.getFieldValue(
                                            `items[${index}].materials`,
                                          );
                                          return materials.filter(
                                            (candidate, candidateIndex) =>
                                              candidateIndex !==
                                                materialIndex &&
                                              candidate.inventoryItemId ===
                                                value,
                                          ).length > 0
                                            ? "No repitas un material dentro del mismo concepto."
                                            : undefined;
                                        },
                                      }}
                                    >
                                      {(field) => (
                                        <>
                                          <select
                                            id={`quote-material-${index}-${materialIndex}`}
                                            className={`h-12 border bg-white px-2 text-sm font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${field.state.meta.errors[0] ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                                            onChange={(event) =>
                                              field.handleChange(
                                                event.target.value,
                                              )
                                            }
                                            value={field.state.value}
                                          >
                                            <option value="">
                                              {options.inventory.isPending
                                                ? "Cargando materiales..."
                                                : "Selecciona un material"}
                                            </option>
                                            {options.inventory.data?.map(
                                              (inventoryItem) => (
                                                <option
                                                  key={inventoryItem.id}
                                                  value={inventoryItem.id}
                                                >
                                                  {inventoryItem.name}
                                                  {inventoryItem.sku
                                                    ? ` (${inventoryItem.sku})`
                                                    : ""}
                                                </option>
                                              ),
                                            )}
                                          </select>
                                          {field.state.meta.errors[0] ? (
                                            <span className="absolute top-full left-0 mt-1 text-xs font-normal text-[#b34b5d]">
                                              {
                                                field.state.meta
                                                  .errors[0] as string
                                              }
                                            </span>
                                          ) : null}
                                        </>
                                      )}
                                    </form.Field>
                                  </label>
                                  <form.Field
                                    name={`items[${index}].materials[${materialIndex}].quantity`}
                                    validators={{
                                      onSubmit: ({ value }) =>
                                        isPositiveDecimal(value, 3)
                                          ? undefined
                                          : `La cantidad del material ${materialIndex + 1} no es válida.`,
                                    }}
                                  >
                                    {(field) => (
                                      <Field
                                        error={
                                          field.state.meta.errors[0] as string
                                        }
                                        label={`Cantidad${selected ? ` (${unitLabels[selected.unit]})` : ""}`}
                                        min="0"
                                        onChange={field.handleChange}
                                        required
                                        step="0.001"
                                        type="number"
                                        value={field.state.value}
                                      />
                                    )}
                                  </form.Field>
                                  <button
                                    aria-label={`Eliminar material ${materialIndex + 1} del concepto ${index + 1}`}
                                    className="mb-1 cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-white"
                                    onClick={() =>
                                      form.removeFieldValue(
                                        `items[${index}].materials`,
                                        materialIndex,
                                      )
                                    }
                                    type="button"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                }
              </form.Field>
            </div>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#eee2eb] pt-7">
            <button
              className="cursor-pointer border-0 bg-transparent px-4 py-3 text-base text-[#211b21]"
              onClick={() => navigate("/cotizaciones")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="cursor-pointer rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white hover:bg-[#70466a] disabled:opacity-50"
              disabled={saving || optionsLoading}
              type="submit"
            >
              {isEditing ? "Guardar cambios" : "Guardar cotización"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

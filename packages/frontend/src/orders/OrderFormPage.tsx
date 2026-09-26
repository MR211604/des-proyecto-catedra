import { useForm } from "@tanstack/react-form";
import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useOrder, useOrderFormMutations, useOrderFormOptions } from "./api.ts";
import type { OrderDetail } from "./types.ts";

type MaterialForm = { id: string; inventoryItemId: string; quantity: string };
type ItemForm = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  materials: MaterialForm[];
};
type JobForm = {
  id: string;
  stageId: string;
  description: string;
  orderItemIndex: string;
  assignedTo: string;
  dueDate: string;
};
type FormState = {
  clientId: string;
  dueDate: string;
  notes: string;
  items: ItemForm[];
  jobs: JobForm[];
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
const emptyJob = (stageId = ""): JobForm => ({
  id: formId("job"),
  stageId,
  description: "",
  orderItemIndex: "0",
  assignedTo: "",
  dueDate: "",
});

const emptyForm: FormState = {
  clientId: "",
  dueDate: "",
  notes: "",
  items: [emptyItem()],
  jobs: [emptyJob()],
};

const unitLabels: Record<string, string> = {
  METER: "metros",
  UNIT: "unidades",
  ROLL: "rollos",
  KILOGRAM: "kilogramos",
};

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function formFromOrder(order: OrderDetail): FormState {
  return {
    clientId: order.client.id,
    dueDate: dateInput(order.dueDate),
    notes: order.notes ?? "",
    items: order.items.map((item) => ({
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
    jobs: order.jobs.map((job) => ({
      id: formId("job"),
      stageId: job.stageId,
      description: job.description,
      orderItemIndex: String(
        Math.max(
          0,
          order.items.findIndex((item) => item.id === job.orderItemId),
        ),
      ),
      assignedTo: job.assignedTo ?? "",
      dueDate: dateInput(job.dueDate),
    })),
  };
}

function buildInput(
  form: FormState,
  inventory: Array<{ id: string; unit: string }>,
) {
  return {
    clientId: form.clientId,
    dueDate: form.dueDate || null,
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    items: form.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unitPrice: item.unitPrice.trim(),
      ...(item.materials.length > 0
        ? {
            materials: item.materials.map((material) => ({
              inventoryItemId: material.inventoryItemId,
              quantity: material.quantity.trim(),
              unit: inventory.find(
                (item) => item.id === material.inventoryItemId,
              )?.unit,
            })),
          }
        : {}),
    })),
    jobs: form.jobs.map((job) => ({
      stageId: job.stageId,
      description: job.description.trim(),
      orderItemIndex: Number(job.orderItemIndex),
      ...(job.assignedTo.trim() ? { assignedTo: job.assignedTo.trim() } : {}),
      dueDate: job.dueDate || null,
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="relative grid gap-2 text-sm font-semibold text-[#211b21]">
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
        <span className="absolute top-full left-0 mt-1 text-xs font-normal text-[#b34b5d]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function OrderFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const orderQuery = useOrder(id);
  const options = useOrderFormOptions();

  if (isEditing && orderQuery.isPending)
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando pedido...
      </div>
    );
  if (isEditing && (orderQuery.isError || !orderQuery.data))
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        No se pudo cargar el pedido.
      </div>
    );

  return <OrderFormEditor id={id} options={options} order={orderQuery.data} />;
}

function OrderFormEditor({
  id,
  options,
  order,
}: {
  id: string | undefined;
  options: ReturnType<typeof useOrderFormOptions>;
  order: OrderDetail | undefined;
}) {
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { create, update } = useOrderFormMutations();
  const form = useForm({
    defaultValues: order ? formFromOrder(order) : emptyForm,
    onSubmit: async ({ value }) => {
      const inventory = options.inventory.data ?? [];
      const mutation =
        isEditing && id
          ? update.mutateAsync({ id, input: buildInput(value, inventory) })
          : create.mutateAsync(buildInput(value, inventory));
      await mutation
        .then((result) => {
          toast.success(
            isEditing ? "Pedido actualizado." : "Pedido registrado.",
          );
          navigate("/pedidos");
          return result;
        })
        .catch((error: unknown) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "No se pudo guardar el pedido.",
          ),
        );
    },
  });

  useEffect(() => {
    const firstStage = options.stages.data?.[0];
    if (!isEditing && firstStage && !form.getFieldValue("jobs")[0]?.stageId) {
      form.setFieldValue("jobs", [emptyJob(firstStage.id)]);
    }
  }, [form, isEditing, options.stages.data]);

  const saving = create.isPending || update.isPending;
  const optionsLoading =
    options.clients.isPending ||
    options.inventory.isPending ||
    options.stages.isPending;
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-250">
        <button
          className="mb-8 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/pedidos")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a pedidos
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
              {isEditing ? "Editar Pedido" : "Registrar Nuevo Pedido"}
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              Completa los detalles comerciales y de producción del pedido.
            </p>
          </header>

          <form.Subscribe selector={(state) => state.fieldMeta}>
            {(fieldMeta) => {
              const errors = Object.values(fieldMeta).flatMap(
                (meta) => meta?.errors.map(String) ?? [],
              );
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
              <ClipboardList size={23} /> Información del pedido
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <label
                className="grid gap-2 text-sm font-semibold text-[#211b21]"
                htmlFor="order-client"
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
                    <select
                      id="order-client"
                      className="h-12 border border-[#9b9aa2] bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    >
                      <option value="">Selecciona un cliente</option>
                      {options.clients.data?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  )}
                </form.Field>
              </label>
              <form.Field name="dueDate">
                {(field) => (
                  <Field
                    label="Fecha estimada de entrega"
                    onChange={field.handleChange}
                    type="date"
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>
            <label
              className="mt-6 grid w-full gap-2 text-sm font-semibold text-[#211b21]"
              htmlFor="order-notes"
            >
              Notas del pedido
              <form.Field name="notes">
                {(field) => (
                  <textarea
                    id="order-notes"
                    className="min-h-28 border border-[#9b9aa2] bg-white p-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                    maxLength={1000}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </label>
          </section>

          <section className="border-b border-[#eee2eb] py-8">
            <div className="mb-7 flex items-center justify-between gap-3">
              <h2 className="m-0 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
                <Boxes size={23} /> Conceptos del pedido
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
                            aria-label="Eliminar concepto"
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
                              value && Number(value) > 0
                                ? undefined
                                : `La cantidad del concepto ${index + 1} debe ser mayor que cero.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Cantidad"
                              onChange={field.handleChange}
                              required
                              type="number"
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                        <form.Field
                          name={`items[${index}].unitPrice`}
                          validators={{
                            onSubmit: ({ value }) =>
                              value && Number(value) >= 0
                                ? undefined
                                : `El precio del concepto ${index + 1} no es válido.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Precio unitario"
                              onChange={field.handleChange}
                              required
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
                            Opcional. Agrega los materiales que se consumirán en
                            producción.
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
                                    htmlFor={`material-${index}-${materialIndex}`}
                                  >
                                    <span>Material</span>
                                    <form.Field
                                      name={`items[${index}].materials[${materialIndex}].inventoryItemId`}
                                      validators={{
                                        onSubmit: ({ value }) =>
                                          value
                                            ? undefined
                                            : `Selecciona el material ${materialIndex + 1} del concepto ${index + 1}.`,
                                      }}
                                    >
                                      {(field) => (
                                        <>
                                          <select
                                            id={`material-${index}-${materialIndex}`}
                                            className={`h-12 border bg-white px-2 text-sm font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${field.state.meta.errors[0] ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                                            onChange={(event) =>
                                              field.handleChange(
                                                event.target.value,
                                              )
                                            }
                                            value={field.state.value}
                                          >
                                            <option value="">
                                              Selecciona un material
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
                                        value && Number(value) > 0
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
                                        onChange={field.handleChange}
                                        type="number"
                                        value={field.state.value}
                                      />
                                    )}
                                  </form.Field>
                                  <button
                                    aria-label="Eliminar material"
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

          <section className="py-8">
            <div className="mb-7 flex items-center justify-between gap-3">
              <h2 className="m-0 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
                <Wrench size={23} /> Trabajos de producción
              </h2>
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 py-2 text-sm font-bold text-[#70466a] hover:border-[#8b5e83]"
                onClick={() =>
                  form.pushFieldValue(
                    "jobs",
                    emptyJob(options.stages.data?.[0]?.id),
                  )
                }
                type="button"
              >
                <Plus size={17} /> Agregar trabajo
              </button>
            </div>
            <p className="mb-5 text-sm text-[#806f7d]">
              Cada pedido debe tener al menos un trabajo para poder avanzar por
              producción.
            </p>
            <div className="grid gap-5">
              <form.Field
                name="jobs"
                validators={{
                  onSubmit: ({ value }) =>
                    value.length > 0
                      ? undefined
                      : "Agrega al menos un trabajo de producción.",
                }}
              >
                {(jobsField) =>
                  jobsField.state.value.map((job, index) => (
                    <article
                      className="rounded-lg bg-[#fbf0fa] p-4 sm:p-6"
                      key={job.id}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="m-0 text-base font-bold text-[#443747]">
                          Trabajo {index + 1}
                        </h3>
                        {jobsField.state.value.length > 1 ? (
                          <button
                            aria-label="Eliminar trabajo"
                            className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-white"
                            onClick={() => jobsField.removeValue(index)}
                            type="button"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-8 sm:grid-cols-2">
                        <label
                          className="grid gap-2 text-sm font-semibold text-[#211b21]"
                          htmlFor={`job-stage-${index}`}
                        >
                          Etapa
                          <form.Field
                            name={`jobs[${index}].stageId`}
                            validators={{
                              onSubmit: ({ value }) =>
                                value
                                  ? undefined
                                  : `Selecciona una etapa para el trabajo ${index + 1}.`,
                            }}
                          >
                            {(field) => (
                              <select
                                id={`job-stage-${index}`}
                                className="h-12 border border-[#9b9aa2] bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                value={field.state.value}
                              >
                                <option value="">Selecciona una etapa</option>
                                {options.stages.data?.map((stage) => (
                                  <option key={stage.id} value={stage.id}>
                                    {stage.position}. {stage.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </form.Field>
                        </label>
                        <label
                          className="grid gap-2 text-sm font-semibold text-[#211b21]"
                          htmlFor={`job-item-${index}`}
                        >
                          Concepto asociado
                          <form.Field name={`jobs[${index}].orderItemIndex`}>
                            {(field) => (
                              <select
                                id={`job-item-${index}`}
                                className="h-12 border border-[#9b9aa2] bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                value={field.state.value}
                              >
                                {form
                                  .getFieldValue("items")
                                  .map((item, itemIndex) => (
                                    <option key={item.id} value={itemIndex}>
                                      Concepto {itemIndex + 1}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </form.Field>
                        </label>
                        <form.Field
                          name={`jobs[${index}].description`}
                          validators={{
                            onSubmit: ({ value }) =>
                              value.trim()
                                ? undefined
                                : `El trabajo ${index + 1} necesita una descripción.`,
                          }}
                        >
                          {(field) => (
                            <Field
                              error={field.state.meta.errors[0] as string}
                              label="Descripción del trabajo"
                              onChange={field.handleChange}
                              required
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                        <form.Field name={`jobs[${index}].assignedTo`}>
                          {(field) => (
                            <Field
                              label="Responsable"
                              onChange={field.handleChange}
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
                        <form.Field name={`jobs[${index}].dueDate`}>
                          {(field) => (
                            <Field
                              label="Fecha estimada del trabajo"
                              onChange={field.handleChange}
                              type="date"
                              value={field.state.value}
                            />
                          )}
                        </form.Field>
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
              onClick={() => navigate("/pedidos")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="cursor-pointer rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white hover:bg-[#70466a] disabled:opacity-50"
              disabled={saving || optionsLoading}
              type="submit"
            >
              {isEditing ? "Guardar cambios" : "Guardar pedido"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

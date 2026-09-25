import PDFDocument from "pdfkit";

type TableCell = string | PDFKit.Mixins.CellOptions;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatFields(fields: Record<string, string>): string {
  const entries = Object.entries(fields);
  return entries.length
    ? entries.map(([key, nestedValue]) => `${key}: ${nestedValue}`).join(", ")
    : "—";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value instanceof Date) return value.toLocaleString("es-ES");
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((entry) => {
        if (!isRecord(entry)) return formatValue(entry);
        return formatFields(flattenRecord(entry));
      })
      .join(", ");
  }
  if (isRecord(value)) return formatFields(flattenRecord(value));
  return String(value);
}

function flattenRecord(
  value: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (isRecord(entry)) {
      Object.assign(result, flattenRecord(entry, field));
    } else {
      result[field] = formatValue(entry);
    }
  }
  return result;
}

function tableRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, formatValue(entry)]),
  );
}

function rowsForTable(values: unknown[]) {
  const rows = values.map((value) =>
    isRecord(value) ? tableRecord(value) : { value: formatValue(value) },
  );
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return {
    headers,
    rows: rows.map((row) => headers.map((header) => row[header] ?? "—")),
  };
}

function addTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
) {
  if (headers.length === 0) return;

  const headerCells: TableCell[] = headers.map((header) => ({
    text: header,
    type: "TH",
    backgroundColor: "#E5E7EB",
  }));
  const data: TableCell[][] = [
    headerCells,
    ...rows.map((row) => row.map((cell) => cell)),
  ];

  doc.fontSize(8).table({
    data,
    maxWidth: 515,
    defaultStyle: {
      padding: 4,
      borderColor: "#D1D5DB",
    },
    rowStyles: (row) =>
      row > 0 && row % 2 === 0 ? { backgroundColor: "#F8FAFC" } : undefined,
  });
}

function addObjectTable(
  doc: PDFKit.PDFDocument,
  value: Record<string, unknown>,
) {
  const rows = Object.entries(flattenRecord(value));
  addTable(
    doc,
    ["Campo", "Valor"],
    rows.map(([key, entry]) => [key, entry]),
  );
}

function addRecordsTable(doc: PDFKit.PDFDocument, values: unknown[]) {
  const { headers, rows } = rowsForTable(values);
  addTable(doc, headers, rows);
}

export function renderReportPdf(
  title: string,
  payload: Record<string, unknown>,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(18).text("ERP para Confecciones Azucena");
    document.moveDown(0.35);
    document.fontSize(14).text(title);
    document.moveDown(0.25);
    document
      .fontSize(9)
      .fillColor("#555")
      .text(
        `Generado: ${new Date().toLocaleDateString("es-ES", {
          dateStyle: "long",
        })} a las ${new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    document.fillColor("#000").moveDown();

    const period = payload.period;
    if (period && typeof period === "object") {
      document.fontSize(10).text("Periodo");
      addObjectTable(document, period as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (payload.filters && typeof payload.filters === "object") {
      document.fontSize(10).text("Filtros aplicados");
      addObjectTable(document, payload.filters as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (payload.summary && typeof payload.summary === "object") {
      document.fontSize(11).text("Resumen");
      addObjectTable(document, payload.summary as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (
      payload.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
    ) {
      document.fontSize(11).text("Datos");
      addObjectTable(document, payload.data as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (Array.isArray(payload.groups) && payload.groups.length > 0) {
      document.fontSize(11).text("Agrupaciones");
      addRecordsTable(document, payload.groups);
      document.moveDown(0.5);
    }

    if (Array.isArray(payload.data) && payload.data.length > 0) {
      document.fontSize(11).text("Detalle");
      addRecordsTable(document, payload.data);
    }

    const meta = payload.meta;
    const hasNoRows =
      (meta &&
        typeof meta === "object" &&
        "total" in meta &&
        meta.total === 0) ||
      (Array.isArray(payload.data) && payload.data.length === 0);
    if (hasNoRows) {
      document
        .fontSize(10)
        .text("Sin resultados para los filtros seleccionados.");
    }

    document.end();
  });
}

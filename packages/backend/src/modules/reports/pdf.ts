import PDFDocument from "pdfkit";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}

function addKeyValue(
  doc: PDFKit.PDFDocument,
  key: string,
  value: unknown,
  indent = 0,
) {
  const text = `${" ".repeat(indent)}${key}: ${formatValue(value)}`;
  doc.fontSize(9).text(text, { width: 520 });
}

function addObject(
  doc: PDFKit.PDFDocument,
  value: Record<string, unknown>,
  indent = 0,
) {
  for (const [key, entry] of Object.entries(value)) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      doc.fontSize(10).text(`${" ".repeat(indent)}${key}:`);
      addObject(doc, entry as Record<string, unknown>, indent + 2);
    } else if (
      Array.isArray(entry) &&
      entry.some((item) => item && typeof item === "object")
    ) {
      doc.fontSize(10).text(`${" ".repeat(indent)}${key}:`);
      for (const item of entry) {
        if (item && typeof item === "object")
          addObject(doc, item as Record<string, unknown>, indent + 2);
        else addKeyValue(doc, "-", item, indent + 2);
      }
    } else {
      addKeyValue(doc, key, entry, indent);
    }
  }
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
      .text(`Generado: ${new Date().toISOString()}`);
    document.fillColor("#000").moveDown();

    const period = payload.period;
    if (period && typeof period === "object") {
      document.fontSize(10).text("Periodo");
      addObject(document, period as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (payload.filters && typeof payload.filters === "object") {
      document.fontSize(10).text("Filtros aplicados");
      addObject(document, payload.filters as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (payload.summary && typeof payload.summary === "object") {
      document.fontSize(11).text("Resumen");
      addObject(document, payload.summary as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (
      payload.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
    ) {
      document.fontSize(11).text("Datos");
      addObject(document, payload.data as Record<string, unknown>);
      document.moveDown(0.5);
    }

    if (Array.isArray(payload.groups) && payload.groups.length > 0) {
      document.fontSize(11).text("Agrupaciones");
      for (const group of payload.groups) addKeyValue(document, "-", group);
      document.moveDown(0.5);
    }

    if (Array.isArray(payload.data) && payload.data.length > 0) {
      document.fontSize(11).text("Detalle");
      for (const row of payload.data) addKeyValue(document, "-", row);
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

import PDFDocument from "pdfkit";
import {
  flattenPdfRecord,
  formatGeneratedDate,
  formatGeneratedTime,
  rowsForPdfTable,
} from "./pdf-format.js";

type TableCell = string | PDFKit.Mixins.CellOptions;

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
  const rows = Object.entries(flattenPdfRecord(value));
  addTable(
    doc,
    ["Campo", "Valor"],
    rows.map(([key, entry]) => [key, entry]),
  );
}

function addRecordsTable(doc: PDFKit.PDFDocument, values: unknown[]) {
  const { headers, rows } = rowsForPdfTable(values);
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
        `Generado: ${formatGeneratedDate()} a las ${formatGeneratedTime()}`,
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

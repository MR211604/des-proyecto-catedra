import { describe, expect, it } from "vitest";
import {
  flattenPdfRecord,
  formatPdfValue,
  rowsForPdfTable,
} from "./pdf-format.js";

describe("PDF report formatting", () => {
  it("translates fields and projects report relationships to flat values", () => {
    expect(
      flattenPdfRecord({
        client: { id: "client-1", name: "Ana López" },
        supplier: { id: "supplier-1", name: "Textiles Uno" },
        order: { id: "order-1", number: "ORD-001" },
        stage: { id: "stage-1", name: "Corte" },
        status: "CONFIRMED",
      }),
    ).toEqual({
      Cliente: "Ana López",
      Proveedor: "Textiles Uno",
      Orden: "order-1",
      "ID de etapa": "stage-1",
      "Nombre de etapa": "Corte",
      Estado: "Confirmada",
    });
  });

  it("uses the order customer for payment sale values", () => {
    expect(
      flattenPdfRecord({
        sale: {
          number: "SALE-001",
          order: { client: { id: "client-1", name: "Ana López" } },
        },
      }),
    ).toEqual({ Cliente: "Ana López" });
  });

  it("translates aggregate status keys", () => {
    expect(
      flattenPdfRecord({
        byStatus: { CONFIRMED: 2, IN_PRODUCTION: 1 },
      }),
    ).toEqual({
      "Por estado / Confirmadas": "2",
      "Por estado / En producción": "1",
    });
  });

  it("translates report sections and filter values", () => {
    expect(
      flattenPdfRecord({
        orders: { readyForDelivery: 3 },
        groupBy: "month",
        supplierId: "supplier-1",
      }),
    ).toEqual({
      "Pedidos / Listas para entrega": "3",
      "Agrupar por": "Mes",
      "ID del proveedor": "supplier-1",
    });
  });

  it("formats timestamps using the report timezone", () => {
    expect(formatPdfValue("2026-09-28T05:30:00.000Z", "paidAt")).toBe(
      "2026-09-27",
    );
    expect(formatPdfValue("2026-09-28", "from")).toBe("2026-09-28");
  });

  it("creates flat table rows without serialized objects", () => {
    expect(
      rowsForPdfTable([
        { client: { name: "Ana López" }, total: 125.5 },
        { client: { name: "Luis Pérez" }, total: 80 },
      ]),
    ).toEqual({
      headers: ["Cliente", "Total"],
      rows: [
        ["Ana López", "125.50"],
        ["Luis Pérez", "80"],
      ],
    });
  });
});

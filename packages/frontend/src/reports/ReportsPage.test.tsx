// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReportData, useReportFilterOptions } from "./api.ts";
import { ReportsPage } from "./ReportsPage.tsx";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

vi.mock("./api.ts", () => ({
  downloadReportPdf: vi.fn(),
  useReportData: vi.fn(),
  useReportFilterOptions: vi.fn(),
}));

const emptyReport = {
  data: undefined,
  error: null,
  isError: false,
  isFetching: false,
  isPending: false,
};

beforeEach(() => {
  vi.mocked(useReportData).mockReturnValue(
    emptyReport as ReturnType<typeof useReportData>,
  );
  vi.mocked(useReportFilterOptions).mockReturnValue(
    {} as ReturnType<typeof useReportFilterOptions>,
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReportsPage", () => {
  it("waits for Generate report before requesting the default summary", () => {
    render(<ReportsPage />);

    expect(useReportData).toHaveBeenLastCalledWith(null, 1);
    expect(
      (
        screen.getByRole("button", {
          name: "Exportar PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Generar reporte" }));

    expect(useReportData).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "summary", period: "month" }),
      1,
    );
  });
});

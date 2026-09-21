import { type ColumnDef, useTable } from "@tanstack/react-table";
import { appTableFeatures } from "./tableConfig.ts";

type DataTableProps<T extends object> = {
  columns: ColumnDef<typeof appTableFeatures, T, unknown>[];
  data: T[];
};

export function DataTable<T extends object>({
  columns,
  data,
}: DataTableProps<T>) {
  const table = useTable({ features: appTableFeatures, data, columns });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead className="bg-[#fcf9fb]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className="border-b border-[#eee2eb] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#766774]"
                  key={header.id}
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              className="border-b border-[#f1e7ef] last:border-b-0 hover:bg-[#fffafd]"
              key={row.id}
            >
              {row.getAllCells().map((cell) => (
                <td className="px-5 py-4 text-sm text-[#3d343d]" key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

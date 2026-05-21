import { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ rows, columns, loading, onRowClick, empty, rowKey }: Props<T>) {
  return (
    <div className="rounded-2xl border border-zinc-900 overflow-hidden bg-zinc-950/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900/50 border-b border-zinc-900">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 ${
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                }`}
                style={{ width: c.width }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-zinc-600">
                Loading…
              </td>
            </tr>
          )}
          {!loading && (!rows || rows.length === 0) && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-zinc-600">
                {empty ?? "No rows yet"}
              </td>
            </tr>
          )}
          {!loading &&
            rows?.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={() => onRowClick?.(r)}
                className={`border-b border-zinc-900 last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-zinc-900/40" : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={`px-4 py-3 ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {c.render ? c.render(r) : ((r as unknown as Record<string, ReactNode>)[String(c.key)] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

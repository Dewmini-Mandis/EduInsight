import React from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  onRowClick,
  emptyMessage = "No data available."
}: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: "32px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "14px",
        backgroundColor: "var(--surface)",
        borderRadius: "8px",
        border: "1px dashed var(--border)"
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
        fontSize: "13px"
      }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((col) => (
              <th 
                key={col.key}
                style={{
                  padding: "12px 16px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textAlign: col.align || "left",
                  width: col.width
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr 
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              style={{
                borderBottom: idx === data.length - 1 ? "none" : "1px solid var(--border)",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background-color 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = "var(--surface-muted)";
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {columns.map((col) => (
                <td 
                  key={col.key}
                  style={{
                    padding: "16px",
                    color: "var(--text-primary)",
                    textAlign: col.align || "left",
                    verticalAlign: "middle"
                  }}
                >
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;

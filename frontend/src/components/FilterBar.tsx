import React from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters?: {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (val: string) => void;
  }[];
  onExport?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters = [], onExport, searchPlaceholder, searchValue, onSearchChange }) => {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      justifyContent: "space-between", // Changed from flex-end
      marginBottom: "24px",
      width: "100%"
    }}>
      <div style={{ flex: 1, maxWidth: "400px" }}>
        {searchPlaceholder !== undefined && (
          <div style={{ position: "relative", width: "100%" }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input 
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {filters.map((filter, idx) => (
          <select
            key={idx}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: "500",
              outline: "none",
              cursor: "pointer",
              minWidth: "120px"
            }}
          >
            {filter.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
        
        {onExport && (
          <button
            onClick={onExport}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-muted)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--surface)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;

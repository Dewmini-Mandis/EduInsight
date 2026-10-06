import React, { useState } from "react";
import { RotateCcw } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters?: {
    label: string;
    options: FilterOption[];
    value: string;
    defaultValue?: string;
    onChange: (val: string) => void;
  }[];
  onExport?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onClearFilters?: () => void;
  isClearActive?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters = [],
  onExport,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onClearFilters,
  isClearActive
}) => {
  const [hoverClear, setHoverClear] = useState(false);

  const isSearchActive = Boolean(searchValue && searchValue.trim().length > 0);
  const isDropdownActive = filters.some(f => {
    const defaultVal = f.defaultValue !== undefined ? f.defaultValue : (f.options[0]?.value || "");
    const val = (f.value || "").trim();
    return val !== defaultVal && val !== "All" && val !== "All Status" && val !== "All Classes" && val !== "All Topics" && val !== "All Levels" && val !== "";
  });
  
  const showClear = Boolean(onClearFilters && (isClearActive !== undefined ? isClearActive : (isSearchActive || isDropdownActive)));

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      justifyContent: "space-between",
      marginBottom: "24px",
      width: "100%",
      flexWrap: "wrap"
    }}>
      <div style={{ flex: 1, minWidth: "240px", maxWidth: "400px" }}>
        {searchPlaceholder !== undefined && (
          <div style={{ position: "relative", width: "100%" }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#5D78A3", pointerEvents: "none", display: "flex" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <input 
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#FFFFFF",
                fontSize: "13px",
                color: "#0B1F3A",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {filters.map((filter, idx) => (
          <select
            key={idx}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            style={{
              height: "40px",
              padding: "0 12px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
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

        {showClear && (
          <button
            type="button"
            onClick={onClearFilters}
            onMouseEnter={() => setHoverClear(true)}
            onMouseLeave={() => setHoverClear(false)}
            aria-label="Clear active filters"
            style={{
              height: "40px",
              padding: "0 14px",
              borderRadius: "8px",
              backgroundColor: hoverClear ? "#F4F8FD" : "#FFFFFF",
              border: `1px solid ${hoverClear ? "#BFD0E5" : "#DCE6F3"}`,
              color: "#3D5E8A",
              fontSize: "13.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease"
            }}
          >
            <RotateCcw size={14} /> Clear Filters
          </button>
        )}
        
        {onExport && (
          <button
            onClick={onExport}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "40px",
              padding: "0 16px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
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

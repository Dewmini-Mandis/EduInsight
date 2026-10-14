import React, { useState, useEffect, useRef } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Hidden input to enforce required validation if needed */}
      <input 
        type="text" 
        value={value} 
        onChange={() => {}} 
        required={required} 
        style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} 
      />
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid var(--border, #e2e8f0)",
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span style={{ color: selectedOption ? "var(--text-primary)" : "var(--text-secondary, #94a3b8)" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          backgroundColor: "white",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
          zIndex: 1000,
          maxHeight: "250px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid var(--border, #e2e8f0)" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border, #e2e8f0)",
                outline: "none"
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary, #94a3b8)" }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: "10px",
                    cursor: "pointer",
                    backgroundColor: value === opt.value ? "var(--blue-50, #eff6ff)" : "transparent",
                    color: value === opt.value ? "var(--blue-600, #2563eb)" : "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = "var(--surface-hover, #f8fafc)";
                  }}
                  onMouseLeave={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

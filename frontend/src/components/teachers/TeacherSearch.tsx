import React from "react";
import { Search } from "lucide-react";

interface TeacherSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const TeacherSearch: React.FC<TeacherSearchProps> = ({
  value,
  onChange,
  placeholder = "Search teacher by name or email...",
}) => {
  return (
    <div className="admin-search-container">
      <Search className="admin-search-icon" size={18} />
      <input
        type="text"
        className="admin-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default TeacherSearch;

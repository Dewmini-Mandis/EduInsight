import React from "react";
import { Search } from "lucide-react";

interface StudentSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedClassroom: string;
  onClassroomChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  classrooms: { id: number; name: string; grade?: string }[];
}

const StudentSearchFilters: React.FC<StudentSearchFiltersProps> = ({
  search,
  onSearchChange,
  selectedClassroom,
  onClassroomChange,
  selectedStatus,
  onStatusChange,
  classrooms,
}) => {
  return (
    <div className="admin-filter-bar">
      <div className="admin-search-container">
        <Search className="admin-search-icon" size={18} />
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search by name, email, or index number..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="admin-filter-dropdowns">
        <select
          className="admin-filter-select"
          value={selectedClassroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        >
          <option value="All Classes">All Classes</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} {c.grade ? `(Grade ${c.grade})` : ""}
            </option>
          ))}
        </select>

        <select
          className="admin-filter-select"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="All Status">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
};

export default StudentSearchFilters;

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import TeacherStatusBadge from "./TeacherStatusBadge";

export interface TeacherData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  school_id?: number;
  school_name?: string;
  teacher_profile?: {
    subjects?: string[];
    classrooms?: { id: number; name: string; grade?: string }[];
  };
}

interface TeacherRowProps {
  teacher: TeacherData;
  onEdit: (teacher: TeacherData) => void;
  onDelete: (teacher: TeacherData) => void;
}

const TeacherRow: React.FC<TeacherRowProps> = ({ teacher, onEdit, onDelete }) => {
  const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || "Unnamed Teacher";

  return (
    <tr>
      <td>
        <span className="admin-teacher-name">{fullName}</span>
      </td>
      <td>
        <span className="admin-teacher-email">{teacher.email || "-"}</span>
      </td>
      <td>
        <TeacherStatusBadge isActive={teacher.is_active} />
      </td>
      <td>
        <div className="admin-table-actions">
          <button
            type="button"
            className="admin-btn-action-edit"
            onClick={() => onEdit(teacher)}
            title="Edit Teacher Account"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            className="admin-btn-action-delete"
            onClick={() => onDelete(teacher)}
            title="Delete Teacher Account"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TeacherRow;

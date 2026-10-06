import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import StudentStatusBadge from "./StudentStatusBadge";

export interface StudentItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role?: string;
  student_profile?: {
    index_no?: string;
    class_name?: string;
    grade?: string;
    class_room?: { id: number; name: string };
    assigned_teacher_id?: number;
    assigned_teacher_name?: string;
    assigned_teacher_email?: string;
  };
}

interface StudentRowProps {
  student: StudentItem;
  onEdit: (student: StudentItem) => void;
  onDelete: (student: StudentItem) => void;
}

const StudentRow: React.FC<StudentRowProps> = ({ student, onEdit, onDelete }) => {
  const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.toUpperCase();
  const indexNo = student.student_profile?.index_no || "-";
  
  const className = student.student_profile?.class_room?.name || student.student_profile?.class_name || "-";
  const gradeText = student.student_profile?.grade ? ` (Grade ${student.student_profile.grade})` : "";
  const classDisplay = className !== "-" ? `${className}${gradeText}` : "-";

  const teacherName = student.student_profile?.assigned_teacher_name;
  const teacherEmail = student.student_profile?.assigned_teacher_email;
  const teacherDisplay = teacherName ? (teacherEmail ? `${teacherName}` : teacherName) : "-";

  return (
    <tr>
      <td>
        <div className="admin-student-cell">
          <div className="admin-avatar-circle">
            {initials || "ST"}
          </div>
          <div className="admin-student-info">
            <span className="admin-student-name">
              {student.first_name} {student.last_name}
            </span>
            <span className="admin-student-email">{student.email}</span>
          </div>
        </div>
      </td>

      <td>
        <span style={{ color: "var(--admin-text-secondary)", fontWeight: 500 }}>
          {indexNo}
        </span>
      </td>

      <td>
        <span style={{ color: "var(--admin-text-primary)", fontWeight: 500 }}>
          {classDisplay}
        </span>
      </td>

      <td>
        <span style={{ color: "var(--admin-text-secondary)", fontWeight: 500 }}>
          {teacherDisplay}
        </span>
      </td>

      <td>
        <StudentStatusBadge isActive={student.is_active} />
      </td>

      <td>
        <div className="admin-table-actions">
          <button
            type="button"
            className="admin-btn-action-edit"
            onClick={() => onEdit(student)}
            title="Edit student profile"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            type="button"
            className="admin-btn-action-delete"
            onClick={() => onDelete(student)}
            title="Delete student account"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default StudentRow;

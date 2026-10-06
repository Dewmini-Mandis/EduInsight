import React from "react";
import { Users, Pencil, Trash2 } from "lucide-react";
import TeacherRow, { TeacherData } from "./TeacherRow";
import TeacherStatusBadge from "./TeacherStatusBadge";

interface TeacherDirectoryProps {
  teachers: TeacherData[];
  loading: boolean;
  onEdit: (teacher: TeacherData) => void;
  onDelete: (teacher: TeacherData) => void;
}

const TeacherDirectory: React.FC<TeacherDirectoryProps> = ({
  teachers,
  loading,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Teacher Directory</h2>
        <p className="admin-card-subtitle">Manage all teacher accounts in EduInsight</p>
      </div>

      <div className="admin-table-wrapper">
        {loading ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">
              <Users size={28} />
            </div>
            <p className="admin-empty-title">Loading Teacher Directory...</p>
            <p className="admin-empty-desc">Fetching registered teacher accounts from EduInsight.</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">
              <Users size={28} />
            </div>
            <p className="admin-empty-title">No Teacher Accounts Found</p>
            <p className="admin-empty-desc">
              There are no teacher records matching your search criteria. Try adjusting your search term or add a new teacher.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View (Visible >= 768px) */}
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <TeacherRow
                    key={teacher.id}
                    teacher={teacher}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>

            {/* Mobile Teacher Cards View (Visible < 768px) */}
            <div className="admin-mobile-teacher-list">
              {teachers.map((teacher) => {
                const fullName =
                  `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() ||
                  "Unnamed Teacher";
                return (
                  <div key={teacher.id} className="admin-mobile-teacher-card">
                    <div className="admin-mobile-teacher-header">
                      <div className="admin-mobile-teacher-info">
                        <span className="admin-teacher-name">{fullName}</span>
                        <span className="admin-teacher-email">{teacher.email || "-"}</span>
                      </div>
                      <TeacherStatusBadge isActive={teacher.is_active} />
                    </div>
                    <div className="admin-mobile-teacher-actions">
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
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherDirectory;

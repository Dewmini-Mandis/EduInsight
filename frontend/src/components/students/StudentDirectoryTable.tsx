import React, { useState } from "react";
import { Edit2, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import StudentRow, { StudentItem } from "./StudentRow";
import StudentStatusBadge from "./StudentStatusBadge";

interface StudentDirectoryTableProps {
  students: StudentItem[];
  loading: boolean;
  onEdit: (student: StudentItem) => void;
  onDelete: (student: StudentItem) => void;
}

const StudentDirectoryTable: React.FC<StudentDirectoryTableProps> = ({
  students,
  loading,
  onEdit,
  onDelete,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalStudents = students.length;
  const totalPages = Math.ceil(totalStudents / pageSize) || 1;
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalStudents);
  const currentStudents = students.slice(startIndex, endIndex);

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Student Directory</h2>
        <p className="admin-card-subtitle">
          View all registered students across classrooms.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--admin-text-secondary)" }}>
          Loading students directory...
        </div>
      ) : students.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">
            <Users size={28} />
          </div>
          <h3 className="admin-empty-title">No Students Found</h3>
          <p className="admin-empty-desc">
            No enrolled students match your search or filter criteria.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Index Number</th>
                  <th>Class / Grade</th>
                  <th>Assigned Teacher</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "32px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="admin-mobile-student-list">
            {currentStudents.map((student) => {
              const initials = `${student.first_name?.charAt(0) || ""}${student.last_name?.charAt(0) || ""}`.toUpperCase();
              const className = student.student_profile?.class_room?.name || student.student_profile?.class_name || "-";
              const gradeText = student.student_profile?.grade ? ` (Grade ${student.student_profile.grade})` : "";
              const teacherName = student.student_profile?.assigned_teacher_name || "-";

              return (
                <div key={student.id} className="admin-mobile-student-card">
                  <div className="admin-mobile-student-header">
                    <div className="admin-student-cell">
                      <div className="admin-avatar-circle">{initials}</div>
                      <div className="admin-mobile-student-info">
                        <span className="admin-student-name">
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="admin-student-email">{student.email}</span>
                      </div>
                    </div>
                    <StudentStatusBadge isActive={student.is_active} />
                  </div>

                  <div className="admin-mobile-meta-grid">
                    <div>
                      <div className="admin-mobile-meta-label">Index Number</div>
                      <div className="admin-mobile-meta-value">{student.student_profile?.index_no || "-"}</div>
                    </div>
                    <div>
                      <div className="admin-mobile-meta-label">Class / Grade</div>
                      <div className="admin-mobile-meta-value">{className}{gradeText}</div>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <div className="admin-mobile-meta-label">Assigned Teacher</div>
                      <div className="admin-mobile-meta-value">{teacherName}</div>
                    </div>
                  </div>

                  <div className="admin-mobile-student-actions">
                    <button
                      type="button"
                      className="admin-btn-action-edit"
                      onClick={() => onEdit(student)}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action-delete"
                      onClick={() => onDelete(student)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer & Pagination */}
          <div className="admin-table-footer">
            <div>
              Showing <strong>{totalStudents > 0 ? startIndex + 1 : 0}–{endIndex}</strong> of <strong>{totalStudents}</strong> students
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`admin-page-btn ${page === currentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDirectoryTable;

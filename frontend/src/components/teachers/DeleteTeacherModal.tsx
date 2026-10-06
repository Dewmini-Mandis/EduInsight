import React from "react";
import { AlertTriangle } from "lucide-react";
import { TeacherData } from "./TeacherRow";

interface DeleteTeacherModalProps {
  teacher: TeacherData | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteTeacherModal: React.FC<DeleteTeacherModalProps> = ({
  teacher,
  loading,
  onClose,
  onConfirm,
}) => {
  if (!teacher) return null;

  const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || "this teacher";

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-icon-tile-danger">
            <AlertTriangle size={22} />
          </div>
          <h3 className="admin-modal-title">Delete Teacher Account</h3>
        </div>

        <div className="admin-modal-body">
          Are you sure you want to delete <strong>{fullName}</strong> ({teacher.email})? This action will remove the teacher's profile and cannot be undone.
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTeacherModal;

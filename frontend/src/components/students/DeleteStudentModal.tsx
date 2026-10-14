import React from "react";
import { AlertTriangle } from "lucide-react";
import { StudentItem } from "./StudentRow";

interface DeleteStudentModalProps {
  student: StudentItem | null;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  student,
  onConfirm,
  onClose,
  loading,
}) => {
  if (!student) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-icon-tile-danger">
            <AlertTriangle size={22} />
          </div>
          <h3 className="admin-modal-title">Delete Student Account</h3>
        </div>

        <div className="admin-modal-body">
          Are you sure you want to delete the student account for{" "}
          <strong>
            {student.first_name} {student.last_name}
          </strong>{" "}
          ({student.email})? This action cannot be undone and will remove all associated quiz attempts and progress records.
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
            {loading ? "Deleting..." : "Delete Student"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteStudentModal;

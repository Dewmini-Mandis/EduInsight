import React from "react";

interface StudentStatusBadgeProps {
  isActive: boolean;
}

const StudentStatusBadge: React.FC<StudentStatusBadgeProps> = ({ isActive }) => {
  if (isActive) {
    return (
      <span className="admin-badge-active">
        <span className="admin-badge-active-dot" />
        Active
      </span>
    );
  }

  return (
    <span className="admin-badge-inactive">
      <span className="admin-badge-inactive-dot" />
      Inactive
    </span>
  );
};

export default StudentStatusBadge;

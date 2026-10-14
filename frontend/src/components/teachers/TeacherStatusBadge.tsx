import React from "react";

interface TeacherStatusBadgeProps {
  isActive: boolean;
}

const TeacherStatusBadge: React.FC<TeacherStatusBadgeProps> = ({ isActive }) => {
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

export default TeacherStatusBadge;

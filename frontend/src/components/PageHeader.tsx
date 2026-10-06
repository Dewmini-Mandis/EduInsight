import React from "react";
import { useLocation } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions
}) => {
  const location = useLocation();

  // Custom breadcrumbs based on the screenshots
  const renderBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes("/quizzes/create")) {
      return (
        <div style={{ color: "#5D78A3", fontSize: "12px", marginBottom: "8px" }}>
          Dashboard &gt; Quizzes &gt; <span style={{ color: "#0B1F3A", fontWeight: "500" }}>Create Quiz</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="teacher-page-header">
      <div className="teacher-page-header-text">
        {renderBreadcrumbs()}
        <h1 className="teacher-page-header-title">{title}</h1>
        {subtitle && (
          <p className="teacher-page-header-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="teacher-page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

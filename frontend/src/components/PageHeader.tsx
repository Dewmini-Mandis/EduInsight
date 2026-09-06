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
    <div style={{
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "flex-end", 
      padding: "24px 32px 16px 32px",
      backgroundColor: "transparent"
    }}>
      <div>
        {renderBreadcrumbs()}
        <h1 style={{
          fontSize: "32px",
          fontWeight: "700",
          color: "#0B1F3A",
          margin: "0 0 4px 0",
          lineHeight: "1.2"
        }}>{title}</h1>
        <p style={{
          fontSize: "15px",
          fontWeight: "400",
          color: "#5D78A3",
          margin: 0
        }}>
          {subtitle}
        </p>
      </div>

      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

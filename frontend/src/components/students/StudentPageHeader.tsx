import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface StudentPageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rightActions?: React.ReactNode;
}

const StudentPageHeader: React.FC<StudentPageHeaderProps> = ({
  breadcrumbs,
  icon,
  title,
  subtitle,
  rightActions,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="admin-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {item.path && !isLast ? (
                  <Link to={item.path} className="admin-breadcrumb-link">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "admin-breadcrumb-current" : "admin-breadcrumb-link"}>
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <span className="admin-breadcrumb-separator">
                    <ChevronRight size={14} />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="admin-header-card">
        <div className="admin-header-left">
          <div className="admin-header-icon-tile">
            {icon}
          </div>
          <div className="admin-header-title-group">
            <h1 className="admin-header-title">{title}</h1>
            <p className="admin-header-subtitle">{subtitle}</p>
          </div>
        </div>

        {rightActions && (
          <div className="admin-header-right">
            {rightActions}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPageHeader;

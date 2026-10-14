import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "../../styles/student.css";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <div className="student-breadcrumbs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} className="student-breadcrumb-separator" />}
            {isLast || !item.path ? (
              <span className="student-breadcrumb-active">{item.label}</span>
            ) : (
              <span
                className="student-breadcrumb-item"
                onClick={() => item.path && navigate(item.path)}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;

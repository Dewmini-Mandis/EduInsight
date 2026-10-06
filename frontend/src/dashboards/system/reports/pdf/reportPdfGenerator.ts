import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  is_active: boolean;
  school_id?: number | null;
  student_profile?: {
    index_no?: string;
    grade?: string;
    class_name?: string;
  } | null;
  teacher_profile?: {
    subjects?: string[];
  } | null;
}

export interface ClassItem {
  id: number;
  name: string;
  school?: number | null;
}

export interface LessonItem {
  id: number;
  title: string;
  term?: number | null;
  term_name?: string;
  skills_count?: number;
}

export interface TermItem {
  id: number;
  name: string;
}

export interface ActivityItem {
  id: number;
  actor_name?: string;
  role?: string;
  action: string;
  entity_type: string;
  description?: string;
  timestamp: string;
}

export interface ReportFilterState {
  selectedReport: "teacher" | "student" | "class" | "lesson" | "system" | "activity";
  filterTerm: string;
  filterClass: string;
  filterStatus: string;
  searchTerm: string;
}

const getFormattedDate = (): string => {
  const now = new Date();
  return now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getFileDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadLogoAsBase64 = async (): Promise<string | null> => {
  const logoUrls = ["/eduinsight-logo-icon.png", "/eduinsight-logo.png"];
  for (const url of logoUrls) {
    try {
      const dataUrl = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
      });
      if (dataUrl) return dataUrl;
    } catch {
      // try next logo
    }
  }
  return null;
};

const isDefaultFilterValue = (val?: string): boolean => {
  if (!val) return true;
  const trimmed = val.trim().toLowerCase();
  return (
    trimmed === "" ||
    trimmed === "all" ||
    trimmed === "all statuses" ||
    trimmed === "all classes" ||
    trimmed === "all teachers" ||
    trimmed === "all terms" ||
    trimmed === "all levels" ||
    trimmed === "all types"
  );
};

const addHeaderAndFooter = (
  doc: jsPDF,
  reportTitle: string,
  logoBase64: string | null
) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const dateStr = getFormattedDate();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let textStartX = 14;

    // Render official EduInsight logo if loaded
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 14, 10, 11, 11);
        textStartX = 28;
      } catch (err) {
        console.warn("Could not render logo in PDF header", err);
      }
    }

    // Brand Name: EduInsight (Deep navy #061C3A)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(6, 28, 58);
    doc.text("EduInsight", textStartX, 17);

    // Subtitle: System Admin Report (Muted blue-gray #5D78A3)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(93, 120, 163);
    doc.text("System Admin Report", textStartX, 22.5);

    // Selected Report Title (Primary Blue #126BFF)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(18, 107, 255);
    doc.text(reportTitle, 14, 32);

    // Generated Date & Time (Right Aligned)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(93, 120, 163);
    doc.text(`Generated on: ${dateStr}`, pageWidth - 14, 32, { align: "right" });

    // Header Divider Line (#DCE6F3)
    doc.setDrawColor(220, 230, 243);
    doc.setLineWidth(0.75);
    doc.line(14, 36, pageWidth - 14, 36);

    // Bottom Footer Line
    doc.setDrawColor(220, 230, 243);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 155, 180);
    doc.text("EduInsight Educational Analytics Platform • Confidential System Admin Document", 14, pageHeight - 10);

    const pageText = `Page ${i} of ${pageCount}`;
    doc.text(pageText, pageWidth - 14, pageHeight - 10, { align: "right" });
  }
};

export const generateReportPdf = async (
  filterState: ReportFilterState,
  data: {
    users: UserItem[];
    classes: ClassItem[];
    lessons: LessonItem[];
    terms: TermItem[];
    activities?: ActivityItem[];
  }
) => {
  const { selectedReport, filterTerm, filterClass, filterStatus, searchTerm } = filterState;
  const doc = new jsPDF("p", "mm", "a4");

  const logoBase64 = await loadLogoAsBase64();

  const teachers = data.users.filter((u) => {
    const r = typeof u.role === "string" ? u.role : (u.role as any)?.role_name || "";
    return r.toUpperCase() === "TEACHER" || r.toUpperCase() === "ROLE_TEACHER";
  });

  const students = data.users.filter((u) => {
    const r = typeof u.role === "string" ? u.role : (u.role as any)?.role_name || "";
    return r.toUpperCase() === "STUDENT" || r.toUpperCase() === "ROLE_STUDENT";
  });

  let reportTitle = "System Admin Report";
  let fileName = `EduInsight_Report_${getFileDateStr()}.pdf`;

  switch (selectedReport) {
    case "system": {
      reportTitle = "System Summary & User Roles Distribution";
      fileName = `EduInsight_User_Roles_Distribution_${getFileDateStr()}.pdf`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 31, 58);
      doc.text("1. User Roles Distribution (Teachers + Students)", 14, 44);

      const totalNonAdmin = teachers.length + students.length;
      const teacherPct = totalNonAdmin > 0 ? ((teachers.length / totalNonAdmin) * 100).toFixed(1) + "%" : "0%";
      const studentPct = totalNonAdmin > 0 ? ((students.length / totalNonAdmin) * 100).toFixed(1) + "%" : "0%";

      const roleTableData = [
        ["Teachers", String(teachers.length), teacherPct],
        ["Students", String(students.length), studentPct],
        ["Total Users (Non-Admin)", String(totalNonAdmin), "100%"],
      ];

      autoTable(doc, {
        startY: 48,
        head: [["User Role", "Account Count", "Percentage Distribution"]],
        body: roleTableData,
        headStyles: { fillColor: [18, 107, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        margin: { left: 14, right: 14 },
      });

      let currentY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 135, 160);
      doc.text("* Administrative accounts (Admin / System Admin) are excluded from user distribution statistics.", 14, currentY);

      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 31, 58);
      doc.text("2. Overall System Statistics", 14, currentY);

      const systemStatsData = [
        ["Total Active Teachers", String(teachers.filter((t) => t.is_active).length)],
        ["Total Active Students", String(students.filter((s) => s.is_active).length)],
        ["Configured Classrooms", String(data.classes.length)],
        ["Syllabus Lessons", String(data.lessons.length)],
        ["Academic Terms", String(data.terms.length)],
      ];

      autoTable(doc, {
        startY: currentY + 4,
        head: [["System Metric", "Current Value"]],
        body: systemStatsData,
        headStyles: { fillColor: [6, 28, 58], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        margin: { left: 14, right: 14 },
      });

      break;
    }

    case "teacher": {
      reportTitle = "Teacher Directory Report";
      fileName = `EduInsight_Teacher_Report_${getFileDateStr()}.pdf`;

      const filteredTeachers = teachers.filter((t) => {
        if (filterStatus === "Active" && !t.is_active) return false;
        if (filterStatus === "Inactive" && t.is_active) return false;
        if (searchTerm) {
          const full = `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase();
          if (!full.includes(searchTerm.toLowerCase())) return false;
        }
        return true;
      });

      let currentY = 44;

      // Filter Criteria Logic: Only render if non-default specific filters exist
      const activeFilters: { label: string; value: string }[] = [];
      if (!isDefaultFilterValue(filterStatus)) {
        activeFilters.push({ label: "Status", value: filterStatus });
      }
      if (searchTerm && searchTerm.trim() !== "") {
        activeFilters.push({ label: "Search", value: `"${searchTerm.trim()}"` });
      }

      if (activeFilters.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(11, 31, 58);
        doc.text("Filter Criteria:", 14, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(93, 120, 163);

        const filterStr = activeFilters.map((f) => `${f.label}: ${f.value}`).join("  |  ");
        doc.text(filterStr, 14, currentY);
        currentY += 8;
      }

      const summaryData = [
        ["Total Teachers", String(teachers.length)],
        ["Active Teachers", String(teachers.filter((t) => t.is_active).length)],
        ["Inactive Teachers", String(teachers.filter((t) => !t.is_active).length)],
        ["Matching Filter", String(filteredTeachers.length)],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Count"]],
        body: summaryData,
        headStyles: { fillColor: [18, 107, 255], textColor: 255, fontStyle: "bold" },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 31, 58);
      doc.text("Teacher Records Directory", 14, currentY);

      if (filteredTeachers.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(120, 135, 160);
        doc.text("No teacher records found matching the selected filters.", 14, currentY + 7);
      } else {
        const tableBody = filteredTeachers.map((t) => {
          const subjects = t.teacher_profile?.subjects?.join(", ") || "General";
          return [
            `${t.first_name} ${t.last_name}`.trim() || t.username,
            t.email,
            subjects,
            t.is_active ? "Active" : "Inactive",
          ];
        });

        autoTable(doc, {
          startY: currentY + 4,
          head: [["Teacher Name", "Email Address", "Subjects / Assignments", "Status"]],
          body: tableBody,
          headStyles: { fillColor: [6, 28, 58], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          margin: { left: 14, right: 14 },
        });
      }

      break;
    }

    case "student": {
      reportTitle = "Student Directory Report";
      fileName = `EduInsight_Student_Report_${getFileDateStr()}.pdf`;

      const filteredStudents = students.filter((s) => {
        if (filterStatus === "Active" && !s.is_active) return false;
        if (filterStatus === "Inactive" && s.is_active) return false;
        if (filterClass !== "All" && s.student_profile?.class_name !== filterClass) return false;
        if (searchTerm) {
          const full = `${s.first_name} ${s.last_name} ${s.email} ${s.student_profile?.index_no || ""}`.toLowerCase();
          if (!full.includes(searchTerm.toLowerCase())) return false;
        }
        return true;
      });

      let currentY = 44;

      // Filter Criteria Logic: Only render if non-default specific filters exist
      const activeFilters: { label: string; value: string }[] = [];
      if (!isDefaultFilterValue(filterClass)) {
        activeFilters.push({ label: "Class", value: filterClass });
      }
      if (!isDefaultFilterValue(filterStatus)) {
        activeFilters.push({ label: "Status", value: filterStatus });
      }
      if (searchTerm && searchTerm.trim() !== "") {
        activeFilters.push({ label: "Search", value: `"${searchTerm.trim()}"` });
      }

      if (activeFilters.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(11, 31, 58);
        doc.text("Filter Criteria:", 14, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(93, 120, 163);

        const filterStr = activeFilters.map((f) => `${f.label}: ${f.value}`).join("  |  ");
        doc.text(filterStr, 14, currentY);
        currentY += 8;
      }

      const summaryData = [
        ["Total Students", String(students.length)],
        ["Active Students", String(students.filter((s) => s.is_active).length)],
        ["Inactive Students", String(students.filter((s) => !s.is_active).length)],
        ["Matching Filter", String(filteredStudents.length)],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Count"]],
        body: summaryData,
        headStyles: { fillColor: [18, 107, 255], textColor: 255, fontStyle: "bold" },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 31, 58);
      doc.text("Student Records Directory", 14, currentY);

      if (filteredStudents.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(120, 135, 160);
        doc.text("No student records found matching the selected filters.", 14, currentY + 7);
      } else {
        const tableBody = filteredStudents.map((s) => [
          `${s.first_name} ${s.last_name}`.trim() || s.username,
          s.student_profile?.index_no || "-",
          s.student_profile?.class_name || "Unassigned",
          s.is_active ? "Active" : "Inactive",
        ]);

        autoTable(doc, {
          startY: currentY + 4,
          head: [["Student Name", "Index No", "Class Assignment", "Status"]],
          body: tableBody,
          headStyles: { fillColor: [6, 28, 58], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          margin: { left: 14, right: 14 },
        });
      }

      break;
    }

    case "class": {
      reportTitle = "Classroom Structure Report";
      fileName = `EduInsight_Class_Report_${getFileDateStr()}.pdf`;

      const filteredClasses = data.classes.filter((c) => {
        if (filterClass !== "All" && c.name !== filterClass) return false;
        if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });

      let currentY = 44;

      const activeFilters: { label: string; value: string }[] = [];
      if (!isDefaultFilterValue(filterClass)) {
        activeFilters.push({ label: "Class", value: filterClass });
      }
      if (searchTerm && searchTerm.trim() !== "") {
        activeFilters.push({ label: "Search", value: `"${searchTerm.trim()}"` });
      }

      if (activeFilters.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(11, 31, 58);
        doc.text("Filter Criteria:", 14, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(93, 120, 163);

        const filterStr = activeFilters.map((f) => `${f.label}: ${f.value}`).join("  |  ");
        doc.text(filterStr, 14, currentY);
        currentY += 8;
      }

      const tableBody = filteredClasses.map((c) => {
        const enrolledCount = students.filter((s) => s.student_profile?.class_name === c.name).length;
        return [c.name, `${enrolledCount} Enrolled Students`, "Active"];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Classroom Name", "Student Enrolment", "Status"]],
        body: tableBody,
        headStyles: { fillColor: [18, 107, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        margin: { left: 14, right: 14 },
      });

      break;
    }

    case "lesson": {
      reportTitle = "Syllabus Lessons & Skills Report";
      fileName = `EduInsight_Lesson_Report_${getFileDateStr()}.pdf`;

      const filteredLessons = data.lessons.filter((l) => {
        if (filterTerm !== "All") {
          const termObj = data.terms.find((t) => t.name === filterTerm);
          if (termObj && l.term !== termObj.id) return false;
        }
        if (searchTerm && !l.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });

      let currentY = 44;

      const activeFilters: { label: string; value: string }[] = [];
      if (!isDefaultFilterValue(filterTerm)) {
        activeFilters.push({ label: "Term", value: filterTerm });
      }
      if (searchTerm && searchTerm.trim() !== "") {
        activeFilters.push({ label: "Search", value: `"${searchTerm.trim()}"` });
      }

      if (activeFilters.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(11, 31, 58);
        doc.text("Filter Criteria:", 14, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(93, 120, 163);

        const filterStr = activeFilters.map((f) => `${f.label}: ${f.value}`).join("  |  ");
        doc.text(filterStr, 14, currentY);
        currentY += 8;
      }

      const tableBody = filteredLessons.map((l) => {
        const termObj = data.terms.find((t) => t.id === l.term);
        return [
          l.title,
          termObj?.name || "Term 1",
          typeof l.skills_count === "number" ? `${l.skills_count} Skills` : "Lesson → Skills",
          "Published",
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Lesson Title", "Academic Term", "Structure", "Status"]],
        body: tableBody,
        headStyles: { fillColor: [18, 107, 255], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        margin: { left: 14, right: 14 },
      });

      break;
    }

    default: {
      reportTitle = "System Admin Audit Report";
      fileName = `EduInsight_Report_${getFileDateStr()}.pdf`;
      break;
    }
  }

  // Add official logo, header titles, and footer page numbering
  addHeaderAndFooter(doc, reportTitle, logoBase64);

  // Download PDF
  doc.save(fileName);
};

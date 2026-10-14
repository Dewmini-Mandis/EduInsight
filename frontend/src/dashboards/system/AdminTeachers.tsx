import React, { useState } from "react";
import TeachersPage from "../../pages/admin/TeachersPage";
import CreateTeacherPage from "../../pages/admin/CreateTeacherPage";
import EditTeacherPage from "../../pages/admin/EditTeacherPage";
import { TeacherData } from "../../components/teachers/TeacherRow";

type ViewMode = "list" | "create" | "edit";

const AdminTeachers: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);

  const handleNavigateCreate = () => {
    setMode("create");
  };

  const handleNavigateEdit = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setMode("edit");
  };

  const handleBackToList = () => {
    setSelectedTeacher(null);
    setMode("list");
  };

  if (mode === "create") {
    return (
      <CreateTeacherPage
        onBack={handleBackToList}
        onCreated={handleBackToList}
      />
    );
  }

  if (mode === "edit") {
    return (
      <EditTeacherPage
        teacherData={selectedTeacher}
        onBack={handleBackToList}
        onUpdated={handleBackToList}
        onDeleted={handleBackToList}
      />
    );
  }

  return (
    <TeachersPage
      onNavigateCreate={handleNavigateCreate}
      onNavigateEdit={handleNavigateEdit}
    />
  );
};

export default AdminTeachers;

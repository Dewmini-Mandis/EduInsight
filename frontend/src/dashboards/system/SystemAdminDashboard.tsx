import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type SystemUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role?: string | null;
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
};

type School = {
  id: number;
  name: string;
  location: string;
  address: string;
  province: string;
  district: string;
  zone: string;
  educational_zone: string;
  created_by?: number | null;
  created_at?: string;
};

type CurrentUser = {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const SystemAdminDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser() as CurrentUser | null;
  
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsCount, setSchoolsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'schools'>('dashboard');
  const [actionLoading, setActionLoading] = useState(false);

  // User filter states
  const [filterQuery, setFilterQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // School filter states
  const [schoolsQuery, setSchoolsQuery] = useState("");
  const [schoolsProvince, setSchoolsProvince] = useState("all");

  // User modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  // School modal states
  const [showSchoolCreateModal, setShowSchoolCreateModal] = useState(false);
  const [showSchoolEditModal, setShowSchoolEditModal] = useState(false);
  const [showSchoolDeleteModal, setShowSchoolDeleteModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolDeleteTarget, setSchoolDeleteTarget] = useState<School | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "NATIONAL_ADMIN",
    schoolId: "",
    indexNo: "",
    grade: "",
    className: "",
    subjects: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "",
    schoolId: "",
    indexNo: "",
    grade: "",
    className: "",
    subjects: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [schoolCreateForm, setSchoolCreateForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    zone: "",
    educationalZone: "",
  });
  const [schoolCreateErrors, setSchoolCreateErrors] = useState<Record<string, string>>({});

  const [schoolEditForm, setSchoolEditForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    zone: "",
    educationalZone: "",
  });
  const [schoolEditErrors, setSchoolEditErrors] = useState<Record<string, string>>({});

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const mapFieldKey = (key: string) => {
    if (key === "first_name") return "firstName";
    if (key === "last_name") return "lastName";
    if (key === "school_id") return "schoolId";
    if (key === "educational_zone") return "educationalZone";
    return key;
  };

  const extractFieldErrors = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return {} as Record<string, string>;
    const nextErrors: Record<string, string> = {};
    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "detail" || key === "non_field_errors") return;
      const mappedKey = mapFieldKey(key);
      if (Array.isArray(value)) {
        nextErrors[mappedKey] = value.join(" ");
      } else if (typeof value === "string") {
        nextErrors[mappedKey] = value;
      }
    });
    return nextErrors;
  };

  const extractDetailMessage = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.non_field_errors)) {
      return record.non_field_errors.join(" ");
    }
    return "";
  };

  const loadData = async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const [usersResult, schoolsResult] = await Promise.allSettled([
        fetch("/api/accounts/users/", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/schools/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      let nextError = "";

      if (usersResult.status === "fulfilled") {
        if (!usersResult.value.ok) {
          nextError = "Failed to load users";
        } else {
          const usersData = (await usersResult.value.json()) as SystemUser[];
          setUsers(usersData);
        }
      } else {
        nextError = "Failed to load users";
      }

      if (schoolsResult.status === "fulfilled") {
        if (schoolsResult.value.ok) {
          const schoolsData = (await schoolsResult.value.json()) as School[];
          setSchools(schoolsData);
          setSchoolsCount(Array.isArray(schoolsData) ? schoolsData.length : 0);
        } else {
          setSchools([]);
          setSchoolsCount(0);
          if (!nextError) nextError = "Failed to load schools";
        }
      } else {
        setSchools([]);
        setSchoolsCount(0);
        if (!nextError) nextError = "Failed to load schools";
      }

      if (nextError) setError(nextError);
    } catch (err: any) {
      setError(err?.message || "Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      setLoading(false);
      return;
    }

    loadData(token);
  }, []);

  // Sorted users & schools
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.id - b.id);
  }, [users]);

  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.id - b.id);
  }, [schools]);

  const formatRole = (role?: string | null) => {
    if (!role) return "Unknown";
    return role
      .toLowerCase()
      .split("_")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  };

  const getInitials = (user: SystemUser) => {
    const source = user.full_name || `${user.first_name} ${user.last_name}`.trim();
    if (source) {
      return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return (user.username || user.email || "U").slice(0, 2).toUpperCase();
  };

  const currentInitials = useMemo(() => {
    if (!currentUser) return "NA";
    const source = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    if (source) {
      return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return (currentUser.username || currentUser.email || "U").slice(0, 2).toUpperCase();
  }, [currentUser]);

  const currentDisplayName = useMemo(() => {
    if (!currentUser) return "System Admin";
    const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    return fullName || "System Admin";
  }, [currentUser]);

  // Form Changes
  const handleCreateChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSchoolCreateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSchoolCreateErrors((prev) => ({ ...prev, [name]: "" }));
    setSchoolCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSchoolEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSchoolEditErrors((prev) => ({ ...prev, [name]: "" }));
    setSchoolEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Validations
  const validateCreateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!createForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!createForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!createForm.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!createForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (createForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(createForm.role) && !createForm.schoolId) {
      nextErrors.schoolId = "School assignment is required.";
    }
    if (createForm.role === "STUDENT") {
      if (!createForm.indexNo.trim()) nextErrors.indexNo = "Index number is required.";
      if (!createForm.grade.trim()) nextErrors.grade = "Grade is required.";
      if (!createForm.className.trim()) nextErrors.className = "Class name is required.";
    }
    if (createForm.role === "TEACHER") {
      if (!createForm.subjects.trim()) nextErrors.subjects = "Subjects are required.";
    }
    setCreateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!editForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(editForm.role) && !editForm.schoolId) {
      nextErrors.schoolId = "School assignment is required.";
    }
    if (editForm.role === "STUDENT") {
      if (!editForm.indexNo.trim()) nextErrors.indexNo = "Index number is required.";
      if (!editForm.grade.trim()) nextErrors.grade = "Grade is required.";
      if (!editForm.className.trim()) nextErrors.className = "Class name is required.";
    }
    if (editForm.role === "TEACHER") {
      if (!editForm.subjects.trim()) nextErrors.subjects = "Subjects are required.";
    }
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSchoolCreateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!schoolCreateForm.name.trim()) nextErrors.name = "School name is required.";
    if (!schoolCreateForm.address.trim()) nextErrors.address = "Address is required.";
    if (!schoolCreateForm.province.trim()) nextErrors.province = "Province is required.";
    if (!schoolCreateForm.district.trim()) nextErrors.district = "District is required.";
    if (!schoolCreateForm.zone.trim()) nextErrors.zone = "Zone is required.";
    if (!schoolCreateForm.educationalZone.trim()) nextErrors.educationalZone = "Educational zone is required.";
    setSchoolCreateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSchoolEditForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!schoolEditForm.name.trim()) nextErrors.name = "School name is required.";
    if (!schoolEditForm.address.trim()) nextErrors.address = "Address is required.";
    if (!schoolEditForm.province.trim()) nextErrors.province = "Province is required.";
    if (!schoolEditForm.district.trim()) nextErrors.district = "District is required.";
    if (!schoolEditForm.zone.trim()) nextErrors.zone = "Zone is required.";
    if (!schoolEditForm.educationalZone.trim()) nextErrors.educationalZone = "Educational zone is required.";
    setSchoolEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // User Actions
  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateCreateForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);
    
    const payload: any = {
      first_name: createForm.firstName.trim(),
      last_name: createForm.lastName.trim(),
      email: createForm.email.trim(),
      username: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
    };
    if (["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(createForm.role)) {
      payload.school_id = createForm.schoolId ? Number(createForm.schoolId) : null;
    }
    if (createForm.role === "STUDENT") {
      payload.index_no = createForm.indexNo.trim();
      payload.grade = createForm.grade.trim();
      payload.class_name = createForm.className.trim();
    }
    if (createForm.role === "TEACHER") {
      payload.subjects = createForm.subjects.split(",").map(s => s.trim()).filter(Boolean);
    }

    try {
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payloadErr = await res.json().catch(() => ({}));
        const nextErrors = extractFieldErrors(payloadErr);
        if (Object.keys(nextErrors).length > 0) {
          setCreateErrors(nextErrors);
        }
        throw new Error(extractDetailMessage(payloadErr) || "Unable to create user");
      }

      const createdUser = (await res.json()) as SystemUser;
      // Update local state immediately
      setUsers((prev) => [...prev, createdUser]);
      
      setShowCreateModal(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "NATIONAL_ADMIN",
        schoolId: "",
        indexNo: "",
        grade: "",
        className: "",
        subjects: "",
      });
      setActionLoading(false);
      setSuccessMessage("User created successfully.");
      
      // Sync list
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      role: user.role || "SYSTEM_ADMIN",
      schoolId: user.school_id ? String(user.school_id) : "",
      indexNo: user.student_profile?.index_no || "",
      grade: user.student_profile?.grade || "",
      className: user.student_profile?.class_name || "",
      subjects: user.teacher_profile?.subjects?.join(", ") || "",
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;
    setError("");
    setSuccessMessage("");
    if (!validateEditForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);

    const payload: any = {
      first_name: editForm.firstName.trim(),
      last_name: editForm.lastName.trim(),
      role: editForm.role,
    };
    if (["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(editForm.role)) {
      payload.school_id = editForm.schoolId ? Number(editForm.schoolId) : null;
    } else {
      payload.school_id = null;
    }
    if (editForm.role === "STUDENT") {
      payload.index_no = editForm.indexNo.trim();
      payload.grade = editForm.grade.trim();
      payload.class_name = editForm.className.trim();
    }
    if (editForm.role === "TEACHER") {
      payload.subjects = editForm.subjects.split(",").map(s => s.trim()).filter(Boolean);
    }

    try {
      const res = await fetch(`/api/accounts/users/${selectedUser.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payloadErr = await res.json().catch(() => ({}));
        const nextErrors = extractFieldErrors(payloadErr);
        if (Object.keys(nextErrors).length > 0) {
          setEditErrors(nextErrors);
        }
        throw new Error(extractDetailMessage(payloadErr) || "Unable to update user");
      }

      const updatedUser = (await res.json().catch(() => null)) as SystemUser | null;
      if (updatedUser) {
        setUsers((prev) =>
          prev.map((item) => (item.id === updatedUser.id ? { ...item, ...updatedUser } : item))
        );
      }
      setShowEditModal(false);
      setSelectedUser(null);
      setActionLoading(false);
      setSuccessMessage("User updated successfully.");
      
      // Sync list
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUser = async (user: SystemUser) => {
    setError("");
    setSuccessMessage("");
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);
    
    // Update local state instantly
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, is_active: !item.is_active } : item
      )
    );

    try {
      const res = await fetch(`/api/accounts/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        // Revert local state on error
        setUsers((prev) =>
          prev.map((item) =>
            item.id === user.id ? { ...item, is_active: user.is_active } : item
          )
        );
        throw new Error(extractDetailMessage(payload) || "Unable to update status");
      }
      setActionLoading(false);
      setSuccessMessage("User status updated successfully.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (user: SystemUser) => {
    setDeleteTarget(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setError("");
    setSuccessMessage("");
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);
    
    // Update local state instantly
    setUsers((prev) => prev.filter((item) => item.id !== targetId));
    setShowDeleteModal(false);
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/accounts/users/${targetId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        // Revert on failure by reloading
        await loadData(token);
        throw new Error(extractDetailMessage(payload) || "Unable to delete user");
      }
      setActionLoading(false);
      setSuccessMessage("User deleted successfully.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  // School Actions
  const handleOpenSchoolCreateModal = () => {
    setSchoolCreateForm({
      name: "",
      address: "",
      province: "",
      district: "",
      zone: "",
      educationalZone: "",
    });
    setSchoolCreateErrors({});
    setShowSchoolCreateModal(true);
  };

  const handleCreateSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateSchoolCreateForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);

    const payload = {
      name: schoolCreateForm.name.trim(),
      location: schoolCreateForm.address.trim() || schoolCreateForm.name.trim(),
      address: schoolCreateForm.address.trim(),
      province: schoolCreateForm.province.trim(),
      district: schoolCreateForm.district.trim(),
      zone: schoolCreateForm.zone.trim(),
      educational_zone: schoolCreateForm.educationalZone.trim(),
    };

    try {
      const res = await fetch("/api/schools/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payloadErr = await res.json().catch(() => ({}));
        const nextErrors = extractFieldErrors(payloadErr);
        if (Object.keys(nextErrors).length > 0) {
          setSchoolCreateErrors(nextErrors);
        }
        throw new Error(extractDetailMessage(payloadErr) || "Unable to create school");
      }

      const createdSchool = (await res.json()) as School;
      // Update local state instantly
      setSchools((prev) => [...prev, createdSchool]);
      setSchoolsCount((c) => c + 1);

      setShowSchoolCreateModal(false);
      setActionLoading(false);
      setSuccessMessage("School created successfully.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to create school");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSchoolEditModal = (school: School) => {
    setSelectedSchool(school);
    setSchoolEditForm({
      name: school.name || "",
      address: school.address || "",
      province: school.province || "",
      district: school.district || "",
      zone: school.zone || "",
      educationalZone: school.educational_zone || "",
    });
    setSchoolEditErrors({});
    setShowSchoolEditModal(true);
  };

  const handleEditSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSchool) return;
    setError("");
    setSuccessMessage("");
    if (!validateSchoolEditForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);

    const payload = {
      name: schoolEditForm.name.trim(),
      location: schoolEditForm.address.trim() || schoolEditForm.name.trim(),
      address: schoolEditForm.address.trim(),
      province: schoolEditForm.province.trim(),
      district: schoolEditForm.district.trim(),
      zone: schoolEditForm.zone.trim(),
      educational_zone: schoolEditForm.educationalZone.trim(),
    };

    try {
      const res = await fetch(`/api/schools/${selectedSchool.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payloadErr = await res.json().catch(() => ({}));
        const nextErrors = extractFieldErrors(payloadErr);
        if (Object.keys(nextErrors).length > 0) {
          setSchoolEditErrors(nextErrors);
        }
        throw new Error(extractDetailMessage(payloadErr) || "Unable to update school");
      }

      const updatedSchool = (await res.json()) as School;
      // Update local state instantly
      setSchools((prev) =>
        prev.map((item) => (item.id === updatedSchool.id ? { ...item, ...updatedSchool } : item))
      );

      setShowSchoolEditModal(false);
      setSelectedSchool(null);
      setActionLoading(false);
      setSuccessMessage("School updated successfully.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to update school");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSchoolDeleteModal = (school: School) => {
    setSchoolDeleteTarget(school);
    setShowSchoolDeleteModal(true);
  };

  const handleConfirmSchoolDelete = async () => {
    if (!schoolDeleteTarget) return;
    const targetId = schoolDeleteTarget.id;
    setError("");
    setSuccessMessage("");
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    setActionLoading(true);

    // Update local state instantly
    setSchools((prev) => prev.filter((item) => item.id !== targetId));
    setSchoolsCount((c) => Math.max(0, c - 1));
    setShowSchoolDeleteModal(false);
    setSchoolDeleteTarget(null);

    try {
      const res = await fetch(`/api/schools/${targetId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        await loadData(token);
        throw new Error(extractDetailMessage(payload) || "Unable to delete school");
      }

      setActionLoading(false);
      setSuccessMessage("School deleted successfully.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Unable to delete school");
    } finally {
      setActionLoading(false);
    }
  };

  // Memoized Filtered Computations
  const filteredUsers = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return sortedUsers.filter((user) => {
      const roleValue = (user.role || "unknown").toLowerCase();
      const statusValue = user.is_active ? "active" : "inactive";
      const fullName = user.full_name || `${user.first_name} ${user.last_name}`.trim();
      const matchesQuery =
        !query ||
        [user.username, user.email, fullName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesRole = filterRole === "all" || roleValue === filterRole.toLowerCase();
      const matchesStatus = filterStatus === "all" || statusValue === filterStatus;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [filterQuery, filterRole, filterStatus, sortedUsers]);

  const filteredSchools = useMemo(() => {
    const query = schoolsQuery.trim().toLowerCase();
    return sortedSchools.filter((school) => {
      const matchesQuery =
        !query ||
        [school.name, school.address, school.province, school.district, school.zone, school.educational_zone]
          .filter(Boolean)
          .some((val) => val.toLowerCase().includes(query));
      const matchesProvince =
        schoolsProvince === "all" ||
        (school.province || "").toLowerCase() === schoolsProvince.toLowerCase();
      return matchesQuery && matchesProvince;
    });
  }, [schoolsQuery, schoolsProvince, sortedSchools]);

  const provinceOptions = useMemo(() => {
    const provinces = new Set<string>();
    schools.forEach((school) => {
      if (school.province?.trim()) {
        provinces.add(school.province.trim());
      }
    });
    return Array.from(provinces).sort();
  }, [schools]);

  const userRoleOptions = ["SYSTEM_ADMIN", "NATIONAL_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"];

  const activeUsers = users.filter((user) => user.is_active).length;

  const nationalAdmins = useMemo(() => {
    return sortedUsers.filter((user) => user.role?.toUpperCase() === "NATIONAL_ADMIN");
  }, [sortedUsers]);

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div>
              <div className="admin-brand-title">EduInsight</div>
              <div className="admin-brand-sub">SYSTEM ADMIN</div>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("users")}
            >
              Users
            </button>
            <button
              className={`admin-nav-item ${activeTab === "schools" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("schools")}
            >
              Schools
            </button>
            <button className="admin-nav-item" type="button">
              Security
            </button>
            <button className="admin-nav-item" type="button">
              Settings
            </button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{currentInitials}</div>
            <div>
              <div className="admin-user-name">{currentDisplayName}</div>
              <div className="admin-user-email">
                {currentUser?.email || "sysadmin@eduinsight.local"}
              </div>
            </div>
          </div>
          <button className="admin-ghost-btn" type="button" onClick={() => navigate("/logout")}>Sign Out</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <div className="admin-title">
              {activeTab === "dashboard" ? "System Administration" : activeTab === "users" ? "User Management" : "Schools Management"}
            </div>
            <div className="admin-subtitle">
              {activeTab === "dashboard"
                ? "Overview of national system operations"
                : activeTab === "users"
                ? "Manage credentials and access levels across all roles"
                : "Manage registered educational institutions"}
            </div>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-profile">
              <div className="admin-profile-avatar" />
              <div>
                <div className="admin-user-name">Admin Panel</div>
                <div className="admin-profile-meta">System Administrator</div>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "dashboard" && (
          <>
            <section className="admin-metrics-grid admin-metrics-grid--three">
              <div className="metric-card">
                <div className="metric-title">TOTAL USERS</div>
                <div className="metric-value">{users.length}</div>
                <div className="metric-badge">All roles</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">ACTIVE USERS</div>
                <div className="metric-value">{activeUsers}</div>
                <div className="metric-badge">Currently enabled</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">SCHOOLS</div>
                <div className="metric-value">{schoolsCount}</div>
                <div className="metric-badge">Registered schools</div>
              </div>
            </section>

            <section className="admin-content-grid admin-content-grid--single">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">National Administrators</div>
                    <div className="admin-card-subtitle">Overview of national administrators in the system</div>
                  </div>
                </div>
                {error && <div className="admin-error">{error}</div>}
                {successMessage && <div className="admin-success">{successMessage}</div>}
                <div className="admin-table">
                  <div className="admin-table-header">
                    <span>User</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Last Login</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading users...</div>}
                  {!loading && nationalAdmins.length === 0 && (
                    <div className="admin-empty">No national administrators found.</div>
                  )}
                  {nationalAdmins.map((user) => {
                    const isSelf = user.username === currentUser?.username || user.email === currentUser?.email;
                    return (
                      <div className="admin-table-row" key={user.id}>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">{getInitials(user)}</div>
                          <div>
                            <div className="user-name">
                              {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username}
                            </div>
                            <div className="user-meta">{user.email}</div>
                          </div>
                        </div>
                        <div className="user-meta">{formatRole(user.role)}</div>
                        <div>
                          <span className={`status-pill ${user.is_active ? "status-active" : "status-suspended"}`}>
                            {user.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <div className="user-meta">—</div>
                        <div className="admin-action-group">
                          <button
                            className="admin-action-btn"
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                          >
                            Edit
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                className="admin-action-btn warning"
                                type="button"
                                onClick={() => handleToggleUser(user)}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="admin-action-btn danger"
                                type="button"
                                onClick={() => handleOpenDeleteModal(user)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {isSelf && <span className="user-meta" style={{ marginLeft: "12px" }}>(You)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="admin-card admin-logs">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-title">System Access Logs</div>
                  <div className="admin-card-subtitle">Real-time monitoring of administrative activity</div>
                </div>
                <button className="admin-secondary-btn" type="button">DOWNLOAD FULL AUDIT LOG (CSV)</button>
              </div>
              <div className="admin-log-item">
                <div>
                  <div className="user-name">Admin Panel logged in from 192.168.1.45</div>
                  <div className="admin-log-meta">October 14, 2023 - 09:42:12</div>
                </div>
                <div className="admin-log-status success">SUCCESS</div>
              </div>
              <div className="admin-log-item">
                <div>
                  <div className="user-name">Unauthorized Access Attempt on API Endpoint /v1/students</div>
                  <div className="admin-log-meta">October 14, 2023 - 09:38:05</div>
                </div>
                <div className="admin-log-status blocked">BLOCKED</div>
              </div>
              <div className="admin-log-item">
                <div>
                  <div className="user-name">System configuration updated by Amila Samarakoon</div>
                  <div className="admin-log-meta">October 14, 2023 - 08:15:33</div>
                </div>
                <div className="admin-log-status">COMPLETED</div>
              </div>
            </section>
          </>
        )}

        {activeTab === "users" && (
          <>
            <div className="admin-user-toolbar">
              <div className="admin-user-filters">
                <input
                  className="admin-filter-input"
                  placeholder="Search users by name or email"
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                />
                <select
                  className="admin-filter-select"
                  value={filterRole}
                  onChange={(event) => setFilterRole(event.target.value)}
                >
                  <option value="all">All roles</option>
                  {userRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-filter-select"
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button className="admin-login-btn" type="button" onClick={() => setShowCreateModal(true)}>
                Add User
              </button>
            </div>

            <section className="admin-content-grid admin-content-grid--single">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">User Management</div>
                    <div className="admin-card-subtitle">Manage credentials and access levels across all roles</div>
                  </div>
                </div>
                {error && <div className="admin-error">{error}</div>}
                {successMessage && <div className="admin-success">{successMessage}</div>}
                <div className="admin-table">
                  <div className="admin-table-header">
                    <span>User</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Last Login</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading users...</div>}
                  {!loading && filteredUsers.length === 0 && (
                    <div className="admin-empty">No users found.</div>
                  )}
                  {filteredUsers.map((user) => {
                    const isSelf = user.username === currentUser?.username || user.email === currentUser?.email;
                    return (
                      <div className="admin-table-row" key={user.id}>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">{getInitials(user)}</div>
                          <div>
                            <div className="user-name">
                              {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username}
                            </div>
                            <div className="user-meta">{user.email}</div>
                          </div>
                        </div>
                        <div className="user-meta">{formatRole(user.role)}</div>
                        <div>
                          <span className={`status-pill ${user.is_active ? "status-active" : "status-suspended"}`}>
                            {user.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <div className="user-meta">—</div>
                        <div className="admin-action-group">
                          <button
                            className="admin-action-btn"
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                          >
                            Edit
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                className="admin-action-btn warning"
                                type="button"
                                onClick={() => handleToggleUser(user)}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="admin-action-btn danger"
                                type="button"
                                onClick={() => handleOpenDeleteModal(user)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {isSelf && <span className="user-meta" style={{ marginLeft: "12px" }}>(You)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "schools" && (
          <>
            <div className="admin-user-toolbar">
              <div className="admin-user-filters">
                <input
                  className="admin-filter-input"
                  placeholder="Search schools by name or zone..."
                  value={schoolsQuery}
                  onChange={(event) => setSchoolsQuery(event.target.value)}
                />
                <select
                  className="admin-filter-select"
                  value={schoolsProvince}
                  onChange={(event) => setSchoolsProvince(event.target.value)}
                >
                  <option value="all">All Provinces</option>
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <button className="admin-login-btn" type="button" onClick={handleOpenSchoolCreateModal}>
                Add School
              </button>
            </div>

            <section className="admin-content-grid admin-content-grid--single">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">Schools Directory</div>
                    <div className="admin-card-subtitle">Manage registered educational institutions</div>
                  </div>
                </div>
                {error && <div className="admin-error">{error}</div>}
                {successMessage && <div className="admin-success">{successMessage}</div>}
                <div className="admin-table">
                  <div className="admin-table-header" style={{ gridTemplateColumns: "1.2fr 1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                    <span>School Name</span>
                    <span>Address</span>
                    <span>Province</span>
                    <span>District</span>
                    <span>Educational Zone</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading schools...</div>}
                  {!loading && filteredSchools.length === 0 && (
                    <div className="admin-empty">No schools found.</div>
                  )}
                  {filteredSchools.map((school) => (
                    <div className="admin-table-row" key={school.id} style={{ gridTemplateColumns: "1.2fr 1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                      <div>
                        <strong className="user-name">{school.name}</strong>
                      </div>
                      <div className="user-meta">{school.address || school.location || "—"}</div>
                      <div className="user-meta">{school.province || "—"}</div>
                      <div className="user-meta">{school.district || "—"}</div>
                      <div className="user-meta">{school.educational_zone || "—"}</div>
                      <div className="admin-action-group">
                        <button
                          className="admin-action-btn"
                          type="button"
                          onClick={() => handleOpenSchoolEditModal(school)}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn danger"
                          type="button"
                          onClick={() => handleOpenSchoolDeleteModal(school)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* User Creation Modal */}
        {showCreateModal && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Create New User</div>
                  <div className="admin-card-subtitle">
                    Add a new user account to the system.
                  </div>
                </div>
              </div>
              <form className="admin-form" onSubmit={handleCreateUser}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>First Name *</label>
                    <input
                      name="firstName"
                      value={createForm.firstName}
                      onChange={handleCreateChange}
                    />
                    {createErrors.firstName && (
                      <div className="admin-error">{createErrors.firstName}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Last Name *</label>
                    <input
                      name="lastName"
                      value={createForm.lastName}
                      onChange={handleCreateChange}
                    />
                    {createErrors.lastName && (
                      <div className="admin-error">{createErrors.lastName}</div>
                    )}
                  </div>
                </div>
                
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Email *</label>
                    <input
                      name="email"
                      type="email"
                      value={createForm.email}
                      onChange={handleCreateChange}
                    />
                    {createErrors.email && (
                      <div className="admin-error">{createErrors.email}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Password *</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        name="password"
                        type={showCreatePassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={handleCreateChange}
                        style={{ paddingRight: "40px", width: "100%" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          zIndex: 10
                        }}
                        aria-label={showCreatePassword ? "Hide password" : "Show password"}
                      >
                        {showCreatePassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    {createErrors.password && (
                      <div className="admin-error">{createErrors.password}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Role *</label>
                    <select
                      name="role"
                      className="admin-filter-select"
                      style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                      value={createForm.role}
                      onChange={handleCreateChange}
                    >
                      {userRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {formatRole(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(createForm.role) && (
                    <div className="admin-field">
                      <label>School Assignment *</label>
                      <select
                        name="schoolId"
                        className="admin-filter-select"
                        style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                        value={createForm.schoolId}
                        onChange={handleCreateChange}
                      >
                        <option value="">Select a School...</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                      {createErrors.schoolId && (
                        <div className="admin-error">{createErrors.schoolId}</div>
                      )}
                    </div>
                  )}
                </div>

                {createForm.role === "STUDENT" && (
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label>Index No *</label>
                      <input
                        name="indexNo"
                        value={createForm.indexNo}
                        onChange={handleCreateChange}
                      />
                      {createErrors.indexNo && (
                        <div className="admin-error">{createErrors.indexNo}</div>
                      )}
                    </div>
                    <div className="admin-field">
                      <label>Grade *</label>
                      <input
                        name="grade"
                        value={createForm.grade}
                        onChange={handleCreateChange}
                      />
                      {createErrors.grade && (
                        <div className="admin-error">{createErrors.grade}</div>
                      )}
                    </div>
                    <div className="admin-field">
                      <label>Class *</label>
                      <input
                        name="className"
                        value={createForm.className}
                        onChange={handleCreateChange}
                      />
                      {createErrors.className && (
                        <div className="admin-error">{createErrors.className}</div>
                      )}
                    </div>
                  </div>
                )}

                {createForm.role === "TEACHER" && (
                  <div className="admin-field">
                    <label>Subjects (comma separated) *</label>
                    <input
                      name="subjects"
                      placeholder="e.g. Mathematics, Science"
                      value={createForm.subjects}
                      onChange={handleCreateChange}
                    />
                    {createErrors.subjects && (
                      <div className="admin-error">{createErrors.subjects}</div>
                    )}
                  </div>
                )}

                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-secondary-btn"
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Close
                  </button>
                  <button className="admin-primary-btn" type="submit">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Edit User</div>
                  <div className="admin-card-subtitle">
                    Update user details.
                  </div>
                </div>
              </div>
              <form className="admin-form" onSubmit={handleEditUser}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>First Name *</label>
                    <input
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleEditChange}
                    />
                    {editErrors.firstName && (
                      <div className="admin-error">{editErrors.firstName}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Last Name *</label>
                    <input
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleEditChange}
                    />
                    {editErrors.lastName && (
                      <div className="admin-error">{editErrors.lastName}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Role *</label>
                    <select
                      name="role"
                      className="admin-filter-select"
                      style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                      value={editForm.role}
                      onChange={handleEditChange}
                    >
                      {userRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {formatRole(role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {["SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(editForm.role) && (
                    <div className="admin-field">
                      <label>School Assignment *</label>
                      <select
                        name="schoolId"
                        className="admin-filter-select"
                        style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                        value={editForm.schoolId}
                        onChange={handleEditChange}
                      >
                        <option value="">Select a School...</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                      {editErrors.schoolId && (
                        <div className="admin-error">{editErrors.schoolId}</div>
                      )}
                    </div>
                  )}
                </div>

                {editForm.role === "STUDENT" && (
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label>Index No *</label>
                      <input
                        name="indexNo"
                        value={editForm.indexNo}
                        onChange={handleEditChange}
                      />
                      {editErrors.indexNo && (
                        <div className="admin-error">{editErrors.indexNo}</div>
                      )}
                    </div>
                    <div className="admin-field">
                      <label>Grade *</label>
                      <input
                        name="grade"
                        value={editForm.grade}
                        onChange={handleEditChange}
                      />
                      {editErrors.grade && (
                        <div className="admin-error">{editErrors.grade}</div>
                      )}
                    </div>
                    <div className="admin-field">
                      <label>Class *</label>
                      <input
                        name="className"
                        value={editForm.className}
                        onChange={handleEditChange}
                      />
                      {editErrors.className && (
                        <div className="admin-error">{editErrors.className}</div>
                      )}
                    </div>
                  </div>
                )}

                {editForm.role === "TEACHER" && (
                  <div className="admin-field">
                    <label>Subjects (comma separated) *</label>
                    <input
                      name="subjects"
                      placeholder="e.g. Mathematics, Science"
                      value={editForm.subjects}
                      onChange={handleEditChange}
                    />
                    {editErrors.subjects && (
                      <div className="admin-error">{editErrors.subjects}</div>
                    )}
                  </div>
                )}

                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-secondary-btn"
                    type="button"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="admin-primary-btn" type="submit">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Delete Modal */}
        {showDeleteModal && deleteTarget && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Delete User</div>
                  <div className="admin-card-subtitle">
                    This action cannot be undone.
                  </div>
                </div>
              </div>
              <div className="admin-delete-message">
                Are you sure you want to delete
                <strong>
                  {` ${deleteTarget.first_name || ""} ${deleteTarget.last_name || ""}`.trim() ||
                    deleteTarget.username}
                </strong>
                ?
              </div>
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="admin-danger-btn"
                  type="button"
                  onClick={handleConfirmDelete}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* School Create Modal */}
        {showSchoolCreateModal && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Create New School</div>
                  <div className="admin-card-subtitle">
                    Add a new school/educational institution to the system.
                  </div>
                </div>
              </div>
              <form className="admin-form" onSubmit={handleCreateSchool}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>School Name *</label>
                    <input
                      name="name"
                      value={schoolCreateForm.name}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.name && (
                      <div className="admin-error">{schoolCreateErrors.name}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Address *</label>
                    <input
                      name="address"
                      value={schoolCreateForm.address}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.address && (
                      <div className="admin-error">{schoolCreateErrors.address}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Province *</label>
                    <input
                      name="province"
                      value={schoolCreateForm.province}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.province && (
                      <div className="admin-error">{schoolCreateErrors.province}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>District *</label>
                    <input
                      name="district"
                      value={schoolCreateForm.district}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.district && (
                      <div className="admin-error">{schoolCreateErrors.district}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Zone *</label>
                    <input
                      name="zone"
                      value={schoolCreateForm.zone}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.zone && (
                      <div className="admin-error">{schoolCreateErrors.zone}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Educational Zone *</label>
                    <input
                      name="educationalZone"
                      value={schoolCreateForm.educationalZone}
                      onChange={handleSchoolCreateChange}
                    />
                    {schoolCreateErrors.educationalZone && (
                      <div className="admin-error">{schoolCreateErrors.educationalZone}</div>
                    )}
                  </div>
                </div>

                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-secondary-btn"
                    type="button"
                    onClick={() => setShowSchoolCreateModal(false)}
                  >
                    Close
                  </button>
                  <button className="admin-primary-btn" type="submit">
                    Create School
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* School Edit Modal */}
        {showSchoolEditModal && selectedSchool && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Edit School</div>
                  <div className="admin-card-subtitle">
                    Update school details.
                  </div>
                </div>
              </div>
              <form className="admin-form" onSubmit={handleEditSchool}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>School Name *</label>
                    <input
                      name="name"
                      value={schoolEditForm.name}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.name && (
                      <div className="admin-error">{schoolEditErrors.name}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Address *</label>
                    <input
                      name="address"
                      value={schoolEditForm.address}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.address && (
                      <div className="admin-error">{schoolEditErrors.address}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Province *</label>
                    <input
                      name="province"
                      value={schoolEditForm.province}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.province && (
                      <div className="admin-error">{schoolEditErrors.province}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>District *</label>
                    <input
                      name="district"
                      value={schoolEditForm.district}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.district && (
                      <div className="admin-error">{schoolEditErrors.district}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Zone *</label>
                    <input
                      name="zone"
                      value={schoolEditForm.zone}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.zone && (
                      <div className="admin-error">{schoolEditErrors.zone}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Educational Zone *</label>
                    <input
                      name="educationalZone"
                      value={schoolEditForm.educationalZone}
                      onChange={handleSchoolEditChange}
                    />
                    {schoolEditErrors.educationalZone && (
                      <div className="admin-error">{schoolEditErrors.educationalZone}</div>
                    )}
                  </div>
                </div>

                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-secondary-btn"
                    type="button"
                    onClick={() => setShowSchoolEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="admin-primary-btn" type="submit">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* School Delete Modal */}
        {showSchoolDeleteModal && schoolDeleteTarget && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Delete School</div>
                  <div className="admin-card-subtitle">
                    This action cannot be undone and will affect associated users.
                  </div>
                </div>
              </div>
              <div className="admin-delete-message">
                Are you sure you want to delete school
                <strong> {schoolDeleteTarget.name}</strong>?
              </div>
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowSchoolDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="admin-danger-btn"
                  type="button"
                  onClick={handleConfirmSchoolDelete}
                >
                  Delete School
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen processing loader */}
        {actionLoading && (
          <div className="admin-loading-overlay">
            <div className="admin-spinner-container">
              <div className="admin-spinner"></div>
              <div className="admin-loading-text">processing</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SystemAdminDashboard;

import React, { useMemo, useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";

export interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  indexNo: string;
  assignedTeacherId: string;
  classRoomId: string;
  isActive: boolean;
}

export interface TeacherOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  teacher_profile?: {
    classrooms?: { id: number; name: string; grade?: string }[];
  };
}

export interface ClassroomOption {
  id: number;
  name: string;
  grade?: string;
  school?: number;
}

interface StudentFormProps {
  mode: "create" | "edit";
  formData: StudentFormData;
  setFormData: React.Dispatch<React.SetStateAction<StudentFormData>>;
  teachers: TeacherOption[];
  classrooms: ClassroomOption[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  isLoadingOptions?: boolean;
  error?: string;
  success?: string;
  submitButtonText?: string;
  backendFieldErrors?: Record<string, string>;
}

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const StudentForm: React.FC<StudentFormProps> = ({
  mode,
  formData,
  setFormData,
  teachers,
  classrooms,
  onSubmit,
  onCancel,
  loading,
  isLoadingOptions = false,
  error,
  success,
  submitButtonText,
  backendFieldErrors,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const teacherSelectRef = useRef<HTMLSelectElement>(null);
  const classroomSelectRef = useRef<HTMLSelectElement>(null);

  // Sync backend field errors when passed
  useEffect(() => {
    if (backendFieldErrors && Object.keys(backendFieldErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
      setTouched((prev) => {
        const nextTouched = { ...prev };
        Object.keys(backendFieldErrors).forEach((key) => {
          nextTouched[key] = true;
        });
        return nextTouched;
      });
    }
  }, [backendFieldErrors]);

  // Find currently selected teacher object
  const selectedTeacher = useMemo(() => {
    if (!formData.assignedTeacherId) return null;
    return teachers.find((t) => t.id.toString() === formData.assignedTeacherId) || null;
  }, [teachers, formData.assignedTeacherId]);

  // Derive ONLY classrooms assigned to the selected teacher
  const teacherClassrooms = useMemo(() => {
    if (!selectedTeacher) return [];
    const tClassrooms = selectedTeacher.teacher_profile?.classrooms || [];
    if (tClassrooms.length > 0) {
      const classIdSet = new Set(tClassrooms.map((c) => c.id));
      const classNameSet = new Set(tClassrooms.map((c) => c.name.toLowerCase()));

      const matchedFromProp = classrooms.filter(
        (c) => classIdSet.has(c.id) || classNameSet.has(c.name.toLowerCase())
      );
      if (matchedFromProp.length > 0) return matchedFromProp;

      return tClassrooms.map((tc) => ({ id: tc.id, name: tc.name, grade: tc.grade }));
    }
    return [];
  }, [selectedTeacher, classrooms]);

  // Determine classroom validation message & state
  const isTeacherSelected = Boolean(formData.assignedTeacherId);
  const teacherHasNoClasses = isTeacherSelected && teacherClassrooms.length === 0;

  let classroomError = "";
  if (teacherHasNoClasses) {
    classroomError = "Assign classes first for the selected teacher.";
  } else if (
    isTeacherSelected &&
    formData.classRoomId &&
    !teacherClassrooms.some((c) => c.id.toString() === formData.classRoomId)
  ) {
    classroomError = "The selected class is not assigned to this teacher.";
  }

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "firstName":
        if (!value.trim()) return "First name is required.";
        return "";
      case "lastName":
        if (!value.trim()) return "Last name is required.";
        return "";
      case "email":
        if (!value.trim()) return "Email address is required.";
        if (!isValidEmail(value)) return "Enter a valid email address.";
        return "";
      case "password":
        if (mode === "create") {
          if (!value) return "Password is required.";
          if (value.length < 8) return "Password must be at least 8 characters long.";
        } else if (value && value.length < 8) {
          return "Password must be at least 8 characters long.";
        }
        return "";
      case "assignedTeacherId":
        if (!value) return "Assigned teacher is required.";
        return "";
      case "classRoomId":
        if (!value) return "Class assignment is required.";
        if (classroomError) return classroomError;
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = (formData as any)[field] || "";
    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeacherId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      assignedTeacherId: newTeacherId,
      classRoomId: "",
    }));

    setTouched((prev) => ({ ...prev, assignedTeacherId: true }));
    const err = validateField("assignedTeacherId", newTeacherId);
    setFieldErrors((prev) => ({ ...prev, assignedTeacherId: err, classRoomId: "" }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password || ""),
      assignedTeacherId: validateField("assignedTeacherId", formData.assignedTeacherId),
      classRoomId: validateField("classRoomId", formData.classRoomId),
    };

    setFieldErrors(errors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      assignedTeacherId: true,
      classRoomId: true,
    });

    // Check first invalid field and scroll/focus
    if (errors.firstName) {
      firstNameRef.current?.focus();
      return;
    }
    if (errors.lastName) {
      lastNameRef.current?.focus();
      return;
    }
    if (errors.email) {
      emailRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }
    if (errors.assignedTeacherId) {
      teacherSelectRef.current?.focus();
      return;
    }
    if (errors.classRoomId || classroomError) {
      classroomSelectRef.current?.focus();
      return;
    }

    onSubmit(e);
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Student Information</h2>
        <p className="admin-card-subtitle">
          {mode === "create"
            ? "Enter the student’s details to create a new account."
            : "Update the student’s personal information and account details."}
        </p>
      </div>

      {error && (
        <div className="admin-alert-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert-success" style={{ marginBottom: "20px" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate style={{ width: "100%" }}>
        <div className="admin-form-grid">
          {/* FIELD 1: First Name */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-firstName">
              First Name <span className="admin-required-star">*</span>
            </label>
            <input
              id="student-firstName"
              ref={firstNameRef}
              type="text"
              aria-required="true"
              aria-invalid={Boolean(touched.firstName && fieldErrors.firstName)}
              aria-describedby={touched.firstName && fieldErrors.firstName ? "firstName-error" : undefined}
              className={`admin-form-input ${touched.firstName && fieldErrors.firstName ? "is-invalid" : ""}`}
              placeholder="e.g. Alexander"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              onBlur={() => handleBlur("firstName")}
            />
            {touched.firstName && fieldErrors.firstName && (
              <div id="firstName-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.firstName}</span>
              </div>
            )}
          </div>

          {/* FIELD 2: Last Name */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-lastName">
              Last Name <span className="admin-required-star">*</span>
            </label>
            <input
              id="student-lastName"
              ref={lastNameRef}
              type="text"
              aria-required="true"
              aria-invalid={Boolean(touched.lastName && fieldErrors.lastName)}
              aria-describedby={touched.lastName && fieldErrors.lastName ? "lastName-error" : undefined}
              className={`admin-form-input ${touched.lastName && fieldErrors.lastName ? "is-invalid" : ""}`}
              placeholder="e.g. Wright"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              onBlur={() => handleBlur("lastName")}
            />
            {touched.lastName && fieldErrors.lastName && (
              <div id="lastName-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.lastName}</span>
              </div>
            )}
          </div>

          {/* FIELD 3: Email Address */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-email">
              Email Address <span className="admin-required-star">*</span>
            </label>
            <input
              id="student-email"
              ref={emailRef}
              type="email"
              aria-required="true"
              aria-invalid={Boolean(touched.email && fieldErrors.email)}
              aria-describedby={touched.email && fieldErrors.email ? "email-error" : undefined}
              disabled={mode === "edit"}
              className={`admin-form-input ${touched.email && fieldErrors.email ? "is-invalid" : ""}`}
              placeholder="student@eduinsight.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
            />
            {touched.email && fieldErrors.email && (
              <div id="email-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.email}</span>
              </div>
            )}
          </div>

          {/* FIELD 4: Password */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-password">
              Password {mode === "create" ? <span className="admin-required-star">*</span> : "(Optional)"}
            </label>
            <input
              id="student-password"
              ref={passwordRef}
              type="password"
              aria-required={mode === "create" ? "true" : "false"}
              aria-invalid={Boolean(touched.password && fieldErrors.password)}
              aria-describedby={touched.password && fieldErrors.password ? "password-error" : undefined}
              className={`admin-form-input ${touched.password && fieldErrors.password ? "is-invalid" : ""}`}
              placeholder={mode === "create" ? "••••••••" : "Leave blank to keep unchanged"}
              value={formData.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
            />
            {touched.password && fieldErrors.password && (
              <div id="password-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.password}</span>
              </div>
            )}
          </div>

          {/* FIELD 5: Index Number */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-indexNo">
              Index Number
            </label>
            <input
              id="student-indexNo"
              type="text"
              className="admin-form-input"
              placeholder="e.g. STU-2026-042"
              value={formData.indexNo}
              onChange={(e) => handleChange("indexNo", e.target.value)}
            />
          </div>

          {/* FIELD 6: Assigned Teacher (Select Teacher First) */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="student-teacher">
              Assigned Teacher <span className="admin-required-star">*</span>
            </label>
            <select
              id="student-teacher"
              ref={teacherSelectRef}
              aria-required="true"
              aria-invalid={Boolean(touched.assignedTeacherId && fieldErrors.assignedTeacherId)}
              aria-describedby={touched.assignedTeacherId && fieldErrors.assignedTeacherId ? "teacher-error" : undefined}
              className={`admin-form-select ${touched.assignedTeacherId && fieldErrors.assignedTeacherId ? "is-invalid" : ""}`}
              value={formData.assignedTeacherId}
              onChange={handleTeacherChange}
              onBlur={() => handleBlur("assignedTeacherId")}
            >
              <option value="">Select an assigned teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id.toString()}>
                  {t.first_name} {t.last_name} ({t.email})
                </option>
              ))}
            </select>
            {touched.assignedTeacherId && fieldErrors.assignedTeacherId && (
              <div id="teacher-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.assignedTeacherId}</span>
              </div>
            )}
          </div>

          {/* FIELD 7: Class Assignment (Dependent Dropdown) */}
          <div className="admin-form-group admin-form-full-width">
            <label className="admin-form-label" htmlFor="student-classroom">
              Class Assignment <span className="admin-required-star">*</span>
            </label>
            <select
              id="student-classroom"
              ref={classroomSelectRef}
              aria-required="true"
              aria-invalid={Boolean((touched.classRoomId && fieldErrors.classRoomId) || classroomError)}
              aria-describedby={
                (touched.classRoomId && fieldErrors.classRoomId) || classroomError ? "classroom-error" : undefined
              }
              disabled={!isTeacherSelected || teacherHasNoClasses || isLoadingOptions}
              className={`admin-form-select ${
                (touched.classRoomId && fieldErrors.classRoomId) || classroomError ? "is-invalid" : ""
              }`}
              value={formData.classRoomId}
              onChange={(e) => handleChange("classRoomId", e.target.value)}
              onBlur={() => handleBlur("classRoomId")}
            >
              <option value="">
                {isLoadingOptions
                  ? "Loading assigned classes..."
                  : !isTeacherSelected
                  ? "Select a teacher first"
                  : teacherHasNoClasses
                  ? "No classes assigned"
                  : "Select a class assignment"}
              </option>
              {teacherClassrooms.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name} {c.grade ? `(Grade ${c.grade})` : ""}
                </option>
              ))}
            </select>

            {/* Inline Error Message */}
            {((touched.classRoomId && fieldErrors.classRoomId) || classroomError) && (
              <div id="classroom-error" className="admin-field-error">
                <AlertCircle size={14} />
                <span>{fieldErrors.classRoomId || classroomError}</span>
              </div>
            )}
          </div>

          {/* FIELD 8: Active Account Toggle */}
          <div className="admin-form-group admin-form-full-width">
            <label className="admin-checkbox-control">
              <input
                type="checkbox"
                className="admin-checkbox-input"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <div className="admin-checkbox-label-group">
                <span className="admin-checkbox-label">Active Account</span>
                <span className="admin-checkbox-helper">
                  Enables student access to the portal, quizzes, and learning materials.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Form Actions (Bottom Right) */}
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onCancel}
            style={{ borderRadius: "8px", height: "42px" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={loading || Boolean(classroomError)}
            style={{ borderRadius: "8px", height: "42px" }}
          >
            {loading
              ? "Saving..."
              : submitButtonText || (mode === "create" ? "Create Student" : "Save Changes")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;

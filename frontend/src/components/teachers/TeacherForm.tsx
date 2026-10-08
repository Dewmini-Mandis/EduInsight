import React, { useState, useRef, useEffect } from "react";
import { Plus, X, AlertCircle } from "lucide-react";

export interface TeacherFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: boolean;
  classrooms: string[];
}

export interface ClassroomItem {
  id: number;
  name: string;
  grade?: string;
}

interface TeacherFormProps {
  mode: "create" | "edit";
  formData: TeacherFormData;
  setFormData: React.Dispatch<React.SetStateAction<TeacherFormData>>;
  availableClassrooms?: ClassroomItem[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
  success?: string;
  backendFieldErrors?: Record<string, string>;
}

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const TeacherForm: React.FC<TeacherFormProps> = ({
  mode,
  formData,
  setFormData,
  availableClassrooms,
  onSubmit,
  onCancel,
  loading,
  error,
  success,
  backendFieldErrors,
}) => {
  const [classInput, setClassInput] = useState("");
  const [classError, setClassError] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const classInputRef = useRef<HTMLInputElement>(null);

  const title = "Teacher Information";
  const subtitle =
    mode === "create"
      ? "Enter the teacher’s details to create a new account."
      : "Update the teacher’s personal information and account details.";

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

  const normalizeClassName = (value: string) => {
    return value.trim().toLowerCase();
  };

  const handleAddClass = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmed = classInput.trim();

    if (!trimmed) {
      setClassError("Enter a class name first.");
      return;
    }

    const normalized = normalizeClassName(trimmed);
    const isDuplicate = formData.classrooms.some(
      (item) => normalizeClassName(String(item)) === normalized
    );

    if (isDuplicate) {
      setClassError("This class has already been added.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      classrooms: [...prev.classrooms, trimmed],
    }));

    setClassInput("");
    setClassError("");

    setTimeout(() => {
      classInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveClass = (className: string) => {
    setFormData((prev) => ({
      ...prev,
      classrooms: prev.classrooms.filter((item) => item !== className),
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };

    setFieldErrors(errors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
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

    onSubmit(e);
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">{title}</h2>
        <p className="admin-card-subtitle">{subtitle}</p>
      </div>

      {success && (
        <div className="admin-alert-success" style={{ marginBottom: "20px" }}>
          {success}
        </div>
      )}

      {error && (
        <div className="admin-alert-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate>
        <div className="admin-form-grid">
          {/* FIELD 1: First Name */}
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="firstName">
              First Name <span className="admin-required-star">*</span>
            </label>
            <input
              id="firstName"
              ref={firstNameRef}
              type="text"
              aria-required="true"
              aria-invalid={Boolean(touched.firstName && fieldErrors.firstName)}
              aria-describedby={touched.firstName && fieldErrors.firstName ? "firstName-error" : undefined}
              className={`admin-form-input ${touched.firstName && fieldErrors.firstName ? "is-invalid" : ""}`}
              placeholder="e.g. Suranga"
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
            <label className="admin-form-label" htmlFor="lastName">
              Last Name <span className="admin-required-star">*</span>
            </label>
            <input
              id="lastName"
              ref={lastNameRef}
              type="text"
              aria-required="true"
              aria-invalid={Boolean(touched.lastName && fieldErrors.lastName)}
              aria-describedby={touched.lastName && fieldErrors.lastName ? "lastName-error" : undefined}
              className={`admin-form-input ${touched.lastName && fieldErrors.lastName ? "is-invalid" : ""}`}
              placeholder="e.g. Fernando"
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
            <label className="admin-form-label" htmlFor="email">
              Email Address <span className="admin-required-star">*</span>
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              aria-required="true"
              aria-invalid={Boolean(touched.email && fieldErrors.email)}
              aria-describedby={touched.email && fieldErrors.email ? "email-error" : undefined}
              className={`admin-form-input ${touched.email && fieldErrors.email ? "is-invalid" : ""}`}
              placeholder="e.g. suranga@gmail.com"
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
            <label className="admin-form-label" htmlFor="password">
              Password {mode === "create" ? <span className="admin-required-star">*</span> : "(Optional)"}
            </label>
            <input
              id="password"
              ref={passwordRef}
              type="password"
              aria-required={mode === "create" ? "true" : "false"}
              aria-invalid={Boolean(touched.password && fieldErrors.password)}
              aria-describedby={touched.password && fieldErrors.password ? "password-error" : undefined}
              className={`admin-form-input ${touched.password && fieldErrors.password ? "is-invalid" : ""}`}
              placeholder={
                mode === "edit"
                  ? "Leave blank to keep current password"
                  : "At least 8 characters"
              }
              value={formData.password}
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

          {/* FIELD 5: Class Assignment (Input + Add Class Button + Pills Below) */}
          <div className="admin-form-group admin-form-full-width">
            <label className="admin-form-label">
              Class Assignment
            </label>

            <div className="class-input-row">
              <div className="class-input-row-field">
                <input
                  ref={classInputRef}
                  type="text"
                  list="available-classrooms-datalist"
                  className="admin-form-input"
                  placeholder="Select or enter class name (e.g. Grade 6A)"
                  value={classInput}
                  onChange={(e) => {
                    setClassInput(e.target.value);
                    if (classError) setClassError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddClass();
                    }
                  }}
                />
                <datalist id="available-classrooms-datalist">
                  {availableClassrooms?.map((cls: ClassroomItem) => (
                    <option key={cls.id} value={cls.name} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                className="admin-btn-add-class"
                onClick={handleAddClass}
              >
                <Plus size={16} />
                Add Class
              </button>
            </div>

            {/* Inline Error Message */}
            {classError && (
              <div className="admin-field-error">
                <AlertCircle size={14} />
                <span>{classError}</span>
              </div>
            )}

            {/* Class Pills Below Row */}
            {formData.classrooms.length > 0 && (
              <div className="class-pill-list" aria-label="Assigned Classes">
                {formData.classrooms.map((className) => (
                  <span key={className} className="admin-pill-tag">
                    <span>{className}</span>
                    <button
                      type="button"
                      className="admin-pill-remove-btn"
                      aria-label={`Remove ${className}`}
                      onClick={() => handleRemoveClass(className)}
                      title={`Remove ${className}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* FIELD 6: Active Account Control */}
          <div className="admin-form-group admin-form-full-width">
            <label className="admin-checkbox-control">
              <input
                type="checkbox"
                className="admin-checkbox-input"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span className="admin-checkbox-label-group">
                <span className="admin-checkbox-label">Active Account</span>
                <span className="admin-checkbox-helper">
                  Allow this teacher to access the system and manage assigned classes.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : mode === "create"
              ? "Create Teacher"
              : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherForm;

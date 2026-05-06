import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

const Register = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "STUDENT",
    school_id: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/accounts/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          school_id: form.school_id ? Number(form.school_id) : null,
        }),
      });
      if (!res.ok) throw new Error("Registration failed");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange} required />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>
          <div className="auth-field">
            <label>First Name</label>
            <input name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="auth-field">
            <label>Last Name</label>
            <input name="last_name" value={form.last_name} onChange={handleChange} required />
          </div>
          <div className="auth-field">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange} required>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="NATIONAL_ADMIN">National Admin</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
            </select>
          </div>
          <div className="auth-field">
            <label>School ID (if applicable)</label>
            <input name="school_id" value={form.school_id} onChange={handleChange} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit">Register</button>
        </form>
      </div>
    </div>
  );
};

export default Register;

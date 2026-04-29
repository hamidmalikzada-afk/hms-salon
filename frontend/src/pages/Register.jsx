import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { roleLabel } from "../lib/auth";

const roles = ["super_admin", "manager", "cashier"];

export default function Register({ auth, onAuthChange }) {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "cashier",
    branch_ids: [],
    can_view_reports: false,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadBranches = async () => {
      if (!auth?.token) {
        return;
      }

      try {
        const response = await api.get("/branches");
        setBranches(response.data);
      } catch {
        setBranches([]);
      }
    };

    void loadBranches();
  }, [auth?.token]);

  const handleChange = (event) => {
    if (event.target.name === "can_view_reports") {
      setFormData((current) => ({
        ...current,
        can_view_reports: event.target.checked,
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleBranchToggle = (branchId, checked) => {
    setFormData((current) => ({
      ...current,
      branch_ids: checked
        ? [...current.branch_ids, branchId]
        : current.branch_ids.filter((id) => id !== branchId),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        ...formData,
        branch_ids: formData.branch_ids.map(Number),
      };

      const response = await api.post("/auth/register", payload);
      setMessage("User registered successfully.");

      if (!auth?.token && response.data?.user?.role === "super_admin") {
        const loginResponse = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        onAuthChange({
          token: loginResponse.data.token,
          user: loginResponse.data.user,
        });

        navigate("/", { replace: true });
        return;
      }

      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "cashier",
        branch_ids: [],
        can_view_reports: false,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">HMS | Hamid Malikzada Software</p>
        <h1>Register User</h1>
        <p className="page-description">
          First registration creates the first super admin. After that, only super
          admin can register more users.
        </p>

        {message ? <div className="feedback success">{message}</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Staff full name"
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
            </div>
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="register-role">Role</label>
              <select
                id="register-role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="field">
            <label>Branch access</label>
            <div className="checkbox-grid">
              {branches.map((branch) => (
                <label className="checkbox-item" key={branch.id}>
                  <input
                    type="checkbox"
                    checked={formData.branch_ids.includes(branch.id)}
                    onChange={(event) =>
                      handleBranchToggle(branch.id, event.target.checked)
                    }
                  />
                  <span>{branch.name}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="checkbox-item">
            <input
              type="checkbox"
              name="can_view_reports"
              checked={formData.can_view_reports}
              onChange={handleChange}
            />
            <span>Allow this user to view reports</span>
          </label>

          <button type="submit">Register user</button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}

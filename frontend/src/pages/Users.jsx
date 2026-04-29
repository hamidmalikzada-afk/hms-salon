import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { isSuperAdmin, roleLabel } from "../lib/auth";

export default function Users({ auth }) {
  const availableRoles = isSuperAdmin(auth?.user)
    ? ["super_admin", "manager", "cashier"]
    : ["cashier"];
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: availableRoles[0],
    can_view_reports: false,
    is_active: true,
    branch_ids: [],
  });

  const fetchPageData = async () => {
    try {
      const [usersResponse, branchesResponse] = await Promise.all([
        api.get("/users"),
        api.get("/branches"),
      ]);
      setUsers(usersResponse.data);
      setBranches(branchesResponse.data);
      setError("");
    } catch (requestError) {
      console.error("Error fetching users page data:", requestError);
      setError(requestError.response?.data?.error || "Unable to load users.");
    }
  };

  useEffect(() => {
    const loadUsersPage = async () => {
      await fetchPageData();
    };

    void loadUsersPage();
  }, []);

  const updateUserField = (userId, field, value) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              [field]: value,
            }
          : user
      )
    );
  };

  const updateUserBranches = (userId, branchId, checked) => {
    setUsers((current) =>
      current.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        const allowedBranches = Array.isArray(user.allowed_branches)
          ? [...user.allowed_branches]
          : [];

        if (checked) {
          if (!allowedBranches.find((branch) => Number(branch.id) === Number(branchId))) {
            const branch = branches.find((item) => Number(item.id) === Number(branchId));
            if (branch) {
              allowedBranches.push({ id: branch.id, name: branch.name });
            }
          }
        } else {
          return {
            ...user,
            allowed_branches: allowedBranches.filter(
              (branch) => Number(branch.id) !== Number(branchId)
            ),
          };
        }

        return {
          ...user,
          allowed_branches: allowedBranches,
        };
      })
    );
  };

  const handleSave = async (user) => {
    setError("");
    setMessage("");

    try {
      await api.put(`/users/${user.id}/access`, {
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        password: user.password || "",
        is_active: user.is_active,
        can_view_reports: user.can_view_reports,
        branch_ids: (user.allowed_branches || []).map((branch) => Number(branch.id)),
      });
      setMessage(`Access updated for ${user.full_name}.`);
      await fetchPageData();
    } catch (requestError) {
      console.error("Error updating user:", requestError);
      setError(requestError.response?.data?.error || "Unable to update user.");
    }
  };

  const updateCreateField = (field, value) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleCreateBranch = (branchId, checked) => {
    setCreateForm((current) => {
      const nextIds = checked
        ? [...new Set([...current.branch_ids, Number(branchId)])]
        : current.branch_ids.filter((id) => Number(id) !== Number(branchId));

      return {
        ...current,
        branch_ids: nextIds,
      };
    });
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/users", {
        ...createForm,
        branch_ids: createForm.branch_ids,
      });
      setCreateForm({
        full_name: "",
        email: "",
        password: "",
        role: availableRoles[0],
        can_view_reports: false,
        is_active: true,
        branch_ids: [],
      });
      setMessage("User created successfully.");
      await fetchPageData();
    } catch (requestError) {
      console.error("Error creating user:", requestError);
      setError(requestError.response?.data?.error || "Unable to create user.");
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Delete ${user.full_name}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.delete(`/users/${user.id}`);
      setMessage(`${user.full_name} deleted successfully.`);
      await fetchPageData();
    } catch (requestError) {
      console.error("Error deleting user:", requestError);
      setError(requestError.response?.data?.error || "Unable to delete user.");
    }
  };

  return (
    <PageLayout
      title="Users & Access"
      description="Assign users to one or many branches, control report visibility, and manage who can work inside each part of the salon system."
      actions={<span className="badge">{users.length} users</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add User</h2>
              <p className="panel-subtitle">
                {isSuperAdmin(auth?.user)
                  ? "Create a new manager, cashier, or super admin directly from this page."
                  : "Managers can create receptionist/cashier users for their own branches."}
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreateUser}>
            <div className="field-grid">
              <div className="field">
                <label>Full name</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(event) =>
                    updateCreateField("full_name", event.target.value)
                  }
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => updateCreateField("email", event.target.value)}
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    updateCreateField("password", event.target.value)
                  }
                />
              </div>

              <div className="field">
                <label>Role</label>
                <select
                  value={createForm.role}
                  onChange={(event) => updateCreateField("role", event.target.value)}
                >
                  {availableRoles.map((role) => (
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
                  <label className="checkbox-item" key={`create-${branch.id}`}>
                    <input
                      type="checkbox"
                      checked={createForm.branch_ids.includes(Number(branch.id))}
                      onChange={(event) =>
                        toggleCreateBranch(branch.id, event.target.checked)
                      }
                    />
                    <span>{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field-grid">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={Boolean(createForm.can_view_reports)}
                  disabled={!isSuperAdmin(auth?.user)}
                  onChange={(event) =>
                    updateCreateField("can_view_reports", event.target.checked)
                  }
                />
                <span>Can view reports</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={Boolean(createForm.is_active)}
                  onChange={(event) =>
                    updateCreateField("is_active", event.target.checked)
                  }
                />
                <span>Active user</span>
              </label>
            </div>

            <div className="button-row">
              <button type="submit">Create user</button>
            </div>
          </form>
        </section>

        <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Access Control</h2>
            <p className="panel-subtitle">
              Super admin can give one user one branch, multiple branches, and optional report access.
            </p>
          </div>
        </div>

        <div className="user-grid">
          {users.map((user) => (
            <article className="panel user-card" key={user.id}>
              <div className="panel-header">
                <div>
                  <h3>{user.full_name}</h3>
                  <p className="panel-subtitle">{user.email}</p>
                </div>
                <span className="badge">{roleLabel(user.role)}</span>
              </div>

              <div className="form-grid">
                <div className="field-grid">
                  <div className="field">
                    <label>Full name</label>
                    <input
                      type="text"
                      value={user.full_name || ""}
                      onChange={(event) =>
                        updateUserField(user.id, "full_name", event.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user.email || ""}
                      onChange={(event) =>
                        updateUserField(user.id, "email", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label>Role</label>
                    <select
                      value={user.role}
                      disabled={!isSuperAdmin(auth?.user)}
                      onChange={(event) =>
                        updateUserField(user.id, "role", event.target.value)
                      }
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Reset password</label>
                    <input
                      type="password"
                      value={user.password || ""}
                      onChange={(event) =>
                        updateUserField(user.id, "password", event.target.value)
                      }
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Branch access</label>
                  <div className="checkbox-grid">
                    {branches.map((branch) => (
                      <label className="checkbox-item" key={`${user.id}-${branch.id}`}>
                        <input
                          type="checkbox"
                          checked={(user.allowed_branches || []).some(
                            (item) => Number(item.id) === Number(branch.id)
                          )}
                          onChange={(event) =>
                            updateUserBranches(user.id, branch.id, event.target.checked)
                          }
                        />
                        <span>{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field-grid">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(user.can_view_reports)}
                      disabled={!isSuperAdmin(auth?.user)}
                      onChange={(event) =>
                        updateUserField(user.id, "can_view_reports", event.target.checked)
                      }
                    />
                    <span>Can view reports</span>
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(user.is_active)}
                      onChange={(event) =>
                        updateUserField(user.id, "is_active", event.target.checked)
                      }
                    />
                    <span>Active user</span>
                  </label>
                </div>

                <div className="button-row">
                  <button type="button" onClick={() => handleSave(user)}>
                    Save access
                  </button>
                  {isSuperAdmin(auth?.user) ? (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => handleDeleteUser(user)}
                    >
                      Delete user
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        </section>
      </div>
    </PageLayout>
  );
}

import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { hasRole } from "../lib/auth";

export default function Branches({ auth }) {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canCreateBranch = hasRole(auth?.user, ["super_admin"]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data);
      setError("");
    } catch (error) {
      console.error("Error fetching branches:", error);
      setError("Unable to load branches right now.");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();

    try {
      await api.post("/branches", formData);

      setFormData({
        name: "",
        address: "",
        phone: "",
      });

      setMessage("Branch created successfully.");
      fetchBranches();
    } catch (error) {
      console.error("Error creating branch:", error);
      setMessage("");
      setError("Failed to create branch.");
    }
  };

  useEffect(() => {
    const loadBranches = async () => {
      await fetchBranches();
    };

    void loadBranches();
  }, []);

  return (
    <PageLayout
      title="Branch Management"
      description="Set up all salon locations, track operating status, and maintain clean contact details for every branch."
      actions={<span className="badge">{branches.length} branches</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        {canCreateBranch ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Add New Branch</h2>
                <p className="panel-subtitle">
                  Create a location that can later hold its own services, sales, and staff.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateBranch} className="form-grid">
              <div className="field">
                <label htmlFor="branch-name">Branch name</label>
                <input
                  id="branch-name"
                  type="text"
                  name="name"
                  placeholder="Downtown Salon"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label htmlFor="branch-address">Address</label>
                <input
                  id="branch-address"
                  type="text"
                  name="address"
                  placeholder="Street, district, city"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label htmlFor="branch-phone">Phone</label>
                <input
                  id="branch-phone"
                  type="text"
                  name="phone"
                  placeholder="+93..."
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="button-row">
                <button type="submit">Add branch</button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Branch Access</h2>
                <p className="panel-subtitle">
                  Only super admin can create new branches. Managers and cashiers can
                  view the branch directory.
                </p>
              </div>
            </div>
            <div className="empty-state">
              Branch creation is locked for your role.
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Branch Directory</h2>
              <p className="panel-subtitle">
                A live list of active and inactive salon locations.
              </p>
            </div>
          </div>

          {branches.length === 0 ? (
            <div className="empty-state">No branches found yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td>{branch.id}</td>
                      <td>{branch.name}</td>
                      <td>{branch.address || "-"}</td>
                      <td>{branch.phone || "-"}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            branch.is_active ? "status-active" : "status-waiting"
                          }`}
                        >
                          {branch.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

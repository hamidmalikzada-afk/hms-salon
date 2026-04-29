import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency } from "../lib/format";
import { hasRole } from "../lib/auth";

export default function Services({ auth }) {
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    branch_id: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManageServices = hasRole(auth?.user, ["super_admin", "manager"]);

  const fetchServices = async () => {
    try {
      const res = await api.get("/services");
      setServices(res.data);
      setError("");
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Unable to load services.");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data);
      setFormData((current) => ({
        ...current,
        branch_id: current.branch_id || String(res.data[0]?.id || ""),
      }));
    } catch (error) {
      console.error("Error fetching branches:", error);
      setError("Services need branch data before they can be created.");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateService = async (e) => {
    e.preventDefault();

    try {
      await api.post("/services", {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        branch_id: Number(formData.branch_id),
      });

      setFormData({
        name: "",
        price: "",
        duration: "",
        branch_id: formData.branch_id,
      });

      setMessage("Service created successfully.");
      fetchServices();
    } catch (error) {
      console.error("Error creating service:", error);
      setMessage("");
      setError("Failed to create service.");
    }
  };

  useEffect(() => {
    const loadServicesPage = async () => {
      await Promise.all([fetchServices(), fetchBranches()]);
    };

    void loadServicesPage();
  }, []);

  return (
    <PageLayout
      title="Service Catalog"
      description="Build the list of treatments and hair services each branch offers, with pricing and estimated duration."
      actions={<span className="badge">{services.length} services</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create Service</h2>
              <p className="panel-subtitle">
                Add a service menu item that can be used in tokens, appointments, and invoices.
              </p>
            </div>
          </div>

          {canManageServices ? (
            <form onSubmit={handleCreateService} className="form-grid">
              <div className="field">
                <label htmlFor="service-name">Service name</label>
                <input
                  id="service-name"
                  type="text"
                  name="name"
                  placeholder="Hair cut, beard trim, facial..."
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="service-price">Price</label>
                  <input
                    id="service-price"
                    type="number"
                    name="price"
                    placeholder="500"
                    value={formData.price}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="service-duration">Duration</label>
                  <input
                    id="service-duration"
                    type="number"
                    name="duration"
                    placeholder="45"
                    value={formData.duration}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="service-branch">Branch</label>
                <select
                  id="service-branch"
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="button-row">
                <button type="submit">Add service</button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              Service creation is available for super admin and manager only.
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Available Services</h2>
              <p className="panel-subtitle">Current branch-ready service menu.</p>
            </div>
          </div>

          {services.length === 0 ? (
            <div className="empty-state">No services found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.id}</td>
                      <td>{service.name}</td>
                      <td>{formatCurrency(service.price)}</td>
                      <td>{service.duration ? `${service.duration} min` : "-"}</td>
                      <td>{service.branch_name || service.branch_id}</td>
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

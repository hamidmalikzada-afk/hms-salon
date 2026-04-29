import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { titleCase } from "../lib/format";

export default function Tokens() {
  const [tokens, setTokens] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: "",
    service_id: "",
    barber_id: "",
    barber_name: "",
    auto_assign: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchTokens = async () => {
    try {
      const res = await api.get("/tokens");
      setTokens(res.data);
      setError("");
    } catch (error) {
      console.error("Error fetching tokens:", error);
      setError("Unable to load queue tokens.");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get("/services");
      setServices(res.data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchBarbers = async () => {
    try {
      const res = await api.get("/staff");
      setBarbers(res.data);
    } catch (error) {
      console.error("Error fetching barbers:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();

    try {
      await api.post("/tokens", {
        customer_id: Number(formData.customer_id),
        service_id: Number(formData.service_id),
        barber_id: formData.barber_id ? Number(formData.barber_id) : null,
        barber_name: formData.auto_assign ? "" : formData.barber_name,
        auto_assign: formData.auto_assign,
      });

      setFormData({
        customer_id: "",
        service_id: "",
        barber_id: "",
        barber_name: "",
        auto_assign: true,
      });

      setMessage("Queue token created.");
      fetchTokens();
    } catch (error) {
      console.error("Error creating token:", error);
      setMessage("");
      setError("Failed to create token.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tokens/${id}/status`, {
        status,
      });
      setMessage(`Token marked as ${titleCase(status)}.`);
      fetchTokens();
    } catch (error) {
      console.error("Error updating token status:", error);
      setMessage("");
      setError("Failed to update token status.");
    }
  };

  useEffect(() => {
    const loadTokenPage = async () => {
      await Promise.all([
        fetchTokens(),
        fetchCustomers(),
        fetchServices(),
        fetchBarbers(),
      ]);
    };

    void loadTokenPage();
  }, []);

  const selectedService = services.find(
    (service) => Number(service.id) === Number(formData.service_id)
  );
  const filteredBarbers = selectedService
    ? barbers.filter((barber) => Number(barber.branch_id) === Number(selectedService.branch_id))
    : barbers;

  return (
    <PageLayout
      title="Queue Tokens"
      description="Handle walk-ins quickly by issuing queue tokens and pushing each client through the service workflow in real time."
      actions={<span className="badge">{tokens.length} tokens in queue</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create Token</h2>
              <p className="panel-subtitle">
                Best for walk-in traffic and front-desk check-ins.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateToken} className="form-grid">
            <div className="field">
              <label htmlFor="token-customer">Customer</label>
              <select
                id="token-customer"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="token-service">Service</label>
              <select
                id="token-service"
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.price} AFN
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="checkbox-item" htmlFor="token-auto-assign">
                <input
                  id="token-auto-assign"
                  type="checkbox"
                  name="auto_assign"
                  checked={formData.auto_assign}
                  onChange={handleChange}
                />
                <span>Auto assign the next available barber fairly</span>
              </label>
            </div>

            {formData.auto_assign ? (
              <div className="empty-state">
                HMS will choose the barber with the lightest current load in this branch.
              </div>
            ) : (
              <div className="field">
                <label htmlFor="token-barber">Barber</label>
                <select
                  id="token-barber"
                  name="barber_id"
                  value={formData.barber_id}
                  onChange={handleChange}
                >
                  <option value="">Select barber</option>
                  {filteredBarbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name} - {titleCase(barber.availability_status)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="button-row">
              <button type="submit">Create token</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Queue Board</h2>
              <p className="panel-subtitle">
                Reception can manage waiting, in-progress, and done tokens here.
              </p>
            </div>
          </div>

          {tokens.length === 0 ? (
            <div className="empty-state">No tokens found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Barber</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.id}>
                      <td>#{token.token_number}</td>
                      <td>{token.customer_name || "-"}</td>
                      <td>{token.service_name || "-"}</td>
                      <td>{token.assigned_barber_name || token.barber_name || "-"}</td>
                      <td>
                        <span
                          className={`status-badge status-${String(token.status).replaceAll(
                            "_",
                            "-"
                          )}`}
                        >
                          {titleCase(token.status)}
                        </span>
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            type="button"
                            onClick={() => updateStatus(token.id, "in_progress")}
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => updateStatus(token.id, "done")}
                          >
                            Done
                          </button>
                        </div>
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

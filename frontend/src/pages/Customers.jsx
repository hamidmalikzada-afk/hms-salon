import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency, formatDate, formatTime, titleCase } from "../lib/format";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loyaltyDraft, setLoyaltyDraft] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    notes: "",
    branch_id: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
      setError("");
    } catch (requestError) {
      console.error("Error fetching customers:", requestError);
      setError("Unable to load customers.");
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
    } catch (requestError) {
      console.error("Error fetching branches:", requestError);
    }
  };

  const fetchCustomerHistory = async (customerId) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/customers/history/${customerId}`);
      setCustomerHistory(res.data);
      setSelectedCustomerId(customerId);
      setLoyaltyDraft(String(res.data.summary?.loyalty_points ?? 0));
      setError("");
    } catch (requestError) {
      console.error("Error fetching customer history:", requestError);
      setError(
        requestError.response?.data?.error || "Unable to load customer history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleCreateCustomer = async (event) => {
    event.preventDefault();

    try {
      await api.post("/customers", formData);
      setFormData({
        full_name: "",
        phone: "",
        notes: "",
        branch_id: formData.branch_id,
      });
      setMessage("Customer created successfully.");
      await fetchCustomers();
    } catch (requestError) {
      console.error("Error creating customer:", requestError);
      setMessage("");
      setError(requestError.response?.data?.error || "Could not create customer.");
    }
  };

  const handleSearch = async () => {
    if (!searchPhone) {
      await fetchCustomers();
      return;
    }

    try {
      const res = await api.get(`/customers/${searchPhone}`);
      setCustomers([res.data]);
      setMessage("Customer found.");
      setError("");
      await fetchCustomerHistory(res.data.id);
    } catch (requestError) {
      console.error("Search error:", requestError);
      setMessage("");
      setError("Customer not found.");
    }
  };

  const handleLoyaltyUpdate = async () => {
    if (!selectedCustomerId) {
      return;
    }

    try {
      await api.put(`/customers/${selectedCustomerId}/loyalty`, {
        loyalty_points: Number(loyaltyDraft),
      });
      setMessage("Loyalty points updated.");
      await Promise.all([fetchCustomers(), fetchCustomerHistory(selectedCustomerId)]);
    } catch (requestError) {
      console.error("Loyalty update error:", requestError);
      setMessage("");
      setError(
        requestError.response?.data?.error || "Unable to update loyalty points."
      );
    }
  };

  const handleVipToggle = async (isVip) => {
    if (!selectedCustomerId) {
      return;
    }

    try {
      await api.put(`/customers/${selectedCustomerId}/vip`, {
        is_vip: isVip,
      });
      setMessage(isVip ? "Customer marked as VIP." : "Customer removed from VIP.");
      await Promise.all([fetchCustomers(), fetchCustomerHistory(selectedCustomerId)]);
    } catch (requestError) {
      console.error("VIP update error:", requestError);
      setMessage("");
      setError(requestError.response?.data?.error || "Unable to update VIP status.");
    }
  };

  useEffect(() => {
    const loadCustomers = async () => {
      await Promise.all([fetchCustomers(), fetchBranches()]);
    };

    void loadCustomers();
  }, []);

  const summary = customerHistory?.summary || {};

  return (
    <PageLayout
      title="Customer Desk"
      description="Register new clients, track loyalty points, and review customer history so repeat service feels personal and organized."
      actions={<span className="badge">{customers.length} visible customers</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add Customer</h2>
              <p className="panel-subtitle">
                Capture the essentials reception needs for repeat service.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCustomer} className="form-grid">
            <div className="field">
              <label htmlFor="customer-name">Full name</label>
              <input
                id="customer-name"
                type="text"
                name="full_name"
                placeholder="Customer full name"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="customer-phone">Phone number</label>
              <input
                id="customer-phone"
                type="text"
                name="phone"
                placeholder="+93..."
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="customer-notes">Notes</label>
              <input
                id="customer-notes"
                type="text"
                name="notes"
                placeholder="Preferences, allergies, loyalty notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="customer-branch">Branch</label>
              <select
                id="customer-branch"
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
              <button type="submit">Add customer</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Customer Search</h2>
              <p className="panel-subtitle">
                Find a client instantly by phone or review the full client list.
              </p>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by phone"
              value={searchPhone}
              onChange={(event) => setSearchPhone(event.target.value)}
            />
            <button type="button" onClick={handleSearch}>
              Search
            </button>
            <button type="button" className="button secondary" onClick={fetchCustomers}>
              Show all
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="empty-state">No customers found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Branch</th>
                    <th>Name</th>
                    <th>VIP</th>
                    <th>Phone</th>
                    <th>Notes</th>
                    <th>Loyalty Points</th>
                    <th>History</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.id}</td>
                      <td>{customer.branch_name || customer.branch_id}</td>
                      <td>{customer.full_name}</td>
                      <td>
                        <span
                          className={`status-badge status-${
                            customer.is_vip ? "strong" : "inactive"
                          }`}
                        >
                          {customer.is_vip ? "VIP" : "Standard"}
                        </span>
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.notes || "-"}</td>
                      <td>{customer.loyalty_points ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => fetchCustomerHistory(customer.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Customer History & Loyalty</h2>
            <p className="panel-subtitle">
              Review visits, spending, favorite services, and loyalty points for the selected customer.
            </p>
          </div>
          {selectedCustomerId ? (
            <span className="badge">Customer #{selectedCustomerId}</span>
          ) : null}
        </div>

        {historyLoading ? (
          <div className="empty-state">Loading customer history...</div>
        ) : !customerHistory ? (
          <div className="empty-state">
            Choose a customer from the table to see full visit history and loyalty details.
          </div>
        ) : (
          <div className="page">
            <section className="stats-grid">
              <article className="stat-card">
                <p className="stat-label">Loyalty points</p>
                <p className="stat-value">{summary.loyalty_points || 0}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Customer status</p>
                <p className="stat-value">{summary.is_vip ? "VIP" : "Standard"}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Total visits</p>
                <p className="stat-value">{summary.total_visits || 0}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Average spend</p>
                <p className="stat-value">{formatCurrency(summary.average_spend)}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Total spent</p>
                <p className="stat-value">{formatCurrency(summary.total_spent)}</p>
              </article>
            </section>

            <div className="content-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Customer Profile</h3>
                    <p className="panel-subtitle">
                      Favorite barber, favorite service, and manual loyalty control.
                    </p>
                  </div>
                </div>

                <div className="mini-list">
                  <div className="mini-item">
                    <span>Name</span>
                    <strong>{customerHistory.customer.full_name}</strong>
                  </div>
                  <div className="mini-item">
                    <span>Phone</span>
                    <strong>{customerHistory.customer.phone}</strong>
                  </div>
                  <div className="mini-item">
                    <span>Favorite service</span>
                    <strong>{summary.favorite_service || "-"}</strong>
                  </div>
                  <div className="mini-item">
                    <span>Favorite barber</span>
                    <strong>{summary.favorite_barber || "-"}</strong>
                  </div>
                  <div className="mini-item">
                    <span>VIP since</span>
                    <strong>{summary.vip_since ? formatDate(summary.vip_since) : "-"}</strong>
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="loyalty-points">Loyalty points</label>
                    <input
                      id="loyalty-points"
                      type="number"
                      value={loyaltyDraft}
                      onChange={(event) => setLoyaltyDraft(event.target.value)}
                    />
                  </div>
                </div>

                <div className="button-row">
                  <button type="button" onClick={handleLoyaltyUpdate}>
                    Save loyalty points
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => handleVipToggle(!summary.is_vip)}
                  >
                    {summary.is_vip ? "Remove VIP" : "Mark VIP"}
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>VIP & Rewards</h3>
                    <p className="panel-subtitle">
                      Use VIP recommendations and loyalty rewards to improve repeat business.
                    </p>
                  </div>
                </div>

                <div className="mini-list">
                  <div className="mini-item">
                    <span>{customerHistory.vip_suggestion?.title || "VIP status"}</span>
                    <strong>{titleCase(customerHistory.vip_suggestion?.level || "standard")}</strong>
                  </div>
                </div>

                <p className="panel-subtitle">
                  {customerHistory.vip_suggestion?.reason || "No VIP suggestion available."}
                </p>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Reward</th>
                        <th>Points Needed</th>
                        <th>Status</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(customerHistory.loyalty_rewards || []).map((reward) => (
                        <tr key={reward.id}>
                          <td>{reward.label}</td>
                          <td>{reward.points_required}</td>
                          <td>
                            <span
                              className={`status-badge status-${
                                reward.eligible ? "strong" : "inactive"
                              }`}
                            >
                              {reward.eligible ? "Eligible" : "Locked"}
                            </span>
                          </td>
                          <td>{reward.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="content-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Invoice History</h3>
                    <p className="panel-subtitle">
                      Every completed sale linked to this customer.
                    </p>
                  </div>
                </div>

                {customerHistory.invoices.length === 0 ? (
                  <div className="empty-state">No invoice history yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Final</th>
                          <th>Discount</th>
                          <th>Payment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerHistory.invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{invoice.id}</td>
                            <td>{formatDate(invoice.created_at)}</td>
                            <td>{formatCurrency(invoice.final_amount)}</td>
                            <td>{formatCurrency(invoice.discount)}</td>
                            <td>{titleCase(invoice.payment_method)}</td>
                            <td>{titleCase(invoice.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Recent Tokens</h3>
                    <p className="panel-subtitle">
                      Walk-in visits and service queue records.
                    </p>
                  </div>
                </div>

                {customerHistory.tokens.length === 0 ? (
                  <div className="empty-state">No token history yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Service</th>
                          <th>Barber</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerHistory.tokens.map((token) => (
                          <tr key={token.id}>
                            <td>#{token.token_number}</td>
                            <td>{token.service_name || "-"}</td>
                            <td>{token.barber_name || "-"}</td>
                            <td>{titleCase(token.status)}</td>
                            <td>{formatDate(token.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Appointments</h3>
                  <p className="panel-subtitle">
                    Scheduled bookings and upcoming service habits.
                  </p>
                </div>
              </div>

              {customerHistory.appointments.length === 0 ? (
                <div className="empty-state">No appointment history yet.</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Service</th>
                        <th>Barber</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerHistory.appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>{formatDate(appointment.appointment_date)}</td>
                          <td>{formatTime(appointment.appointment_time)}</td>
                          <td>{appointment.service_name || "-"}</td>
                          <td>{appointment.barber_name || "-"}</td>
                          <td>{titleCase(appointment.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </PageLayout>
  );
}

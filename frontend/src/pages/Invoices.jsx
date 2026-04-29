import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency, titleCase } from "../lib/format";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: "",
    branch_id: "",
    service_id: "",
    discount: "",
    payment_method: "cash",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/invoices");
      setInvoices(res.data);
      setError("");
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError("Unable to load invoices.");
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

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    const selectedService = services.find(
      (service) => service.id === Number(formData.service_id)
    );

    if (!selectedService) {
      alert("Please select a service");
      return;
    }

    try {
      await api.post("/invoices", {
        customer_id: Number(formData.customer_id),
        branch_id: Number(formData.branch_id),
        discount: Number(formData.discount || 0),
        payment_method: formData.payment_method,
        items: [
          {
            service_id: selectedService.id,
            item_name: selectedService.name,
            price: selectedService.price,
            quantity: 1,
          },
        ],
      });

      setFormData({
        customer_id: "",
        branch_id: "",
        service_id: "",
        discount: "",
        payment_method: "cash",
      });

      setMessage("Invoice created successfully.");
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      setMessage("");
      setError("Failed to create invoice.");
    }
  };

  useEffect(() => {
    const loadInvoicesPage = async () => {
      await Promise.all([
        fetchInvoices(),
        fetchCustomers(),
        fetchBranches(),
        fetchServices(),
      ]);
    };

    void loadInvoicesPage();
  }, []);

  return (
    <PageLayout
      title="Invoices & Billing"
      description="Generate branch-aware invoices from the service catalog and track completed payments from the salon floor."
      actions={<span className="badge">{invoices.length} invoices</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create Invoice</h2>
              <p className="panel-subtitle">
                Turn a completed service into a paid invoice in a few clicks.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateInvoice} className="form-grid">
            <div className="field">
              <label htmlFor="invoice-customer">Customer</label>
              <select
                id="invoice-customer"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="invoice-branch">Branch</label>
              <select
                id="invoice-branch"
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

            <div className="field">
              <label htmlFor="invoice-service">Service</label>
              <select
                id="invoice-service"
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

            <div className="field-grid">
              <div className="field">
                <label htmlFor="invoice-discount">Discount</label>
                <input
                  id="invoice-discount"
                  type="number"
                  name="discount"
                  placeholder="0"
                  value={formData.discount}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label htmlFor="invoice-payment-method">Payment method</label>
                <select
                  id="invoice-payment-method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
            </div>

            <div className="button-row">
              <button type="submit">Create invoice</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Billing History</h2>
              <p className="panel-subtitle">
                View invoiced services, payment methods, and totals by branch.
              </p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="empty-state">No invoices found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Branch</th>
                    <th>Total</th>
                    <th>Discount</th>
                    <th>Final</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.id}</td>
                      <td>{invoice.customer_name || "-"}</td>
                      <td>{invoice.branch_name || "-"}</td>
                      <td>{formatCurrency(invoice.total_amount)}</td>
                      <td>{formatCurrency(invoice.discount)}</td>
                      <td>{formatCurrency(invoice.final_amount)}</td>
                      <td>{titleCase(invoice.payment_method)}</td>
                      <td>
                        <span
                          className={`status-badge status-${String(invoice.status).replaceAll(
                            "_",
                            "-"
                          )}`}
                        >
                          {titleCase(invoice.status)}
                        </span>
                      </td>
                      <td>
                        <Link className="button secondary" to={`/invoices/${invoice.id}/print`}>
                          Print
                        </Link>
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

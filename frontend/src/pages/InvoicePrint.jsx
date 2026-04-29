import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate, formatTime, titleCase } from "../lib/format";

export default function InvoicePrint() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const response = await api.get(`/invoices/${id}`);
        setInvoice(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Unable to load invoice.");
      }
    };

    void loadInvoice();
  }, [id]);

  if (error) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="feedback error">{error}</div>
          <Link to="/invoices" className="button secondary">
            Back to invoices
          </Link>
        </section>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <p>Loading invoice...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="print-shell">
      <section className="print-card">
        <div className="print-actions no-print">
          <Link to="/invoices" className="button secondary">
            Back
          </Link>
          <button onClick={() => window.print()}>Print receipt</button>
        </div>

        <header className="print-header">
          <div>
            <p className="eyebrow">HMS Receipt</p>
            <h1>Invoice #{invoice.id}</h1>
            <p>{invoice.branch_name || "Salon branch"}</p>
            <p>{invoice.branch_address || "-"}</p>
            <p>{invoice.branch_phone || "-"}</p>
          </div>

          <div className="print-meta">
            <p>Date: {formatDate(invoice.created_at)}</p>
            <p>Time: {formatTime(new Date(invoice.created_at).toTimeString())}</p>
            <p>Payment: {titleCase(invoice.payment_method)}</p>
            <p>Status: {titleCase(invoice.status)}</p>
          </div>
        </header>

        <section className="print-section">
          <h3>Customer</h3>
          <p>{invoice.customer_name || "Walk-in customer"}</p>
          <p>{invoice.customer_phone || "-"}</p>
        </section>

        <section className="print-section">
          <h3>Items</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.item_name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="print-summary">
          <div className="highlight-item">
            <span>Total</span>
            <strong>{formatCurrency(invoice.total_amount)}</strong>
          </div>
          <div className="highlight-item">
            <span>Discount</span>
            <strong>{formatCurrency(invoice.discount)}</strong>
          </div>
          <div className="highlight-item">
            <span>Final Amount</span>
            <strong>{formatCurrency(invoice.final_amount)}</strong>
          </div>
        </section>
      </section>
    </div>
  );
}

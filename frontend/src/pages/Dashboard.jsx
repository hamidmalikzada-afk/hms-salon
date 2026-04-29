import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency, titleCase } from "../lib/format";

function TrendBars({ items }) {
  const maxValue = Math.max(
    ...items.flatMap((item) => [
      Number(item.income_amount || 0),
      Number(item.expense_amount || 0),
      Math.max(Number(item.profit_amount || 0), 0),
    ]),
    1
  );

  return (
    <div className="trend-bars">
      {items.map((item) => {
        const incomeHeight = `${Math.max((Number(item.income_amount || 0) / maxValue) * 100, 4)}%`;
        const expenseHeight = `${Math.max((Number(item.expense_amount || 0) / maxValue) * 100, 4)}%`;
        const profitHeight = `${Math.max((Math.max(Number(item.profit_amount || 0), 0) / maxValue) * 100, 4)}%`;
        const dayLabel = new Date(item.day).toLocaleDateString([], {
          weekday: "short",
        });

        return (
          <div className="trend-bar-group" key={item.day}>
            <div className="trend-stack" title={`${dayLabel} finance`}>
              <span className="trend-bar income" style={{ height: incomeHeight }} />
              <span className="trend-bar expense" style={{ height: expenseHeight }} />
              <span className="trend-bar profit" style={{ height: profitHeight }} />
            </div>
            <small>{dayLabel}</small>
          </div>
        );
      })}
    </div>
  );
}

function PaymentDonut({ paymentMix }) {
  const cash = Number(paymentMix.cash || 0);
  const bank = Number(paymentMix.bank || 0);
  const mobileMoney = Number(paymentMix.mobile_money || 0);
  const total = cash + bank + mobileMoney;

  const segments = [
    { label: "Cash", value: cash, color: "#c97b36" },
    { label: "Bank", value: bank, color: "#1f3c48" },
    { label: "Mobile", value: mobileMoney, color: "#4a9b7a" },
  ];

  let start = 0;
  const stops = segments
    .map((segment) => {
      const share = total ? (segment.value / total) * 100 : 0;
      const end = start + share;
      const output = `${segment.color} ${start}% ${end}%`;
      start = end;
      return output;
    })
    .join(", ");

  return (
    <div className="payment-card">
      <div
        className="payment-donut"
        style={{
          background: total
            ? `conic-gradient(${stops})`
            : "conic-gradient(#e7ddd1 0% 100%)",
        }}
      >
        <div className="payment-donut-center">
          <span>Income</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>

      <div className="payment-legend">
        {segments.map((segment) => (
          <div className="payment-legend-row" key={segment.label}>
            <span className="payment-key">
              <i style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <strong>{formatCurrency(segment.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState({
    total_branches: 0,
    total_customers: 0,
    total_services: 0,
    total_tokens_today: 0,
    total_appointments_today: 0,
    total_invoices_today: 0,
    total_sales_today: 0,
    total_expenses_today_amount: 0,
    estimated_profit_today: 0,
    outstanding_liabilities: 0,
    payment_mix: {
      cash: 0,
      bank: 0,
      mobile_money: 0,
    },
    finance_trend: [],
  });
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setDashboard(res.data);
      setTokens(res.data.recent_tokens || []);
      setError("");
    } catch (requestError) {
      console.error("Error fetching dashboard:", requestError);
      setError("Dashboard stats could not be loaded.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tokens/${id}/status`, { status });
      await fetchDashboard();
    } catch (requestError) {
      console.error("Error updating token status:", requestError);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      await fetchDashboard();
    };

    void loadDashboard();

    const interval = setInterval(() => {
      void loadDashboard();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const financeCards = [
    {
      label: "Income",
      value: formatCurrency(dashboard.total_sales_today),
      tone: "income",
    },
    {
      label: "Expenses",
      value: formatCurrency(dashboard.total_expenses_today_amount),
      tone: "expense",
    },
    {
      label: "Profit",
      value: formatCurrency(dashboard.estimated_profit_today),
      tone: "profit",
    },
    {
      label: "Liabilities",
      value: formatCurrency(dashboard.outstanding_liabilities),
      tone: "liability",
    },
  ];

  return (
    <PageLayout
      compact
      title="Dashboard"
      description="A tighter today view for queue, finance, and operational movement."
      actions={
        <button
          type="button"
          onClick={() => {
            void fetchDashboard();
          }}
        >
          Refresh
        </button>
      }
    >
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-grid">
        <section className="hero-card dashboard-overview">
          <div className="dashboard-overview-head">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Operations Snapshot</h2>
            </div>
            <span className="badge subtle">{dashboard.total_invoices_today} invoices</span>
          </div>

          <div className="finance-mini-grid">
            {financeCards.map((card) => (
              <article className={`finance-mini-card ${card.tone}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          <div className="ops-strip">
            <div className="ops-pill">
              <span>Queue</span>
              <strong>{dashboard.total_tokens_today}</strong>
            </div>
            <div className="ops-pill">
              <span>Appointments</span>
              <strong>{dashboard.total_appointments_today}</strong>
            </div>
            <div className="ops-pill">
              <span>Customers</span>
              <strong>{dashboard.total_customers}</strong>
            </div>
            <div className="ops-pill">
              <span>Branches</span>
              <strong>{dashboard.total_branches}</strong>
            </div>
          </div>
        </section>

        <section className="panel finance-trend-panel">
          <div className="compact-panel-header">
            <div>
              <h3>7-Day Finance</h3>
              <p className="panel-subtitle">Income, expense, and profit trend.</p>
            </div>
            <div className="trend-legend">
              <span><i className="legend-dot income" />Income</span>
              <span><i className="legend-dot expense" />Expense</span>
              <span><i className="legend-dot profit" />Profit</span>
            </div>
          </div>
          <TrendBars items={dashboard.finance_trend || []} />
        </section>

        <section className="panel finance-mix-panel">
          <div className="compact-panel-header">
            <div>
              <h3>Payment Mix</h3>
              <p className="panel-subtitle">How today’s income is collected.</p>
            </div>
          </div>
          <PaymentDonut paymentMix={dashboard.payment_mix || {}} />
        </section>

        <section className="panel queue-panel">
          <div className="compact-panel-header">
            <div>
              <h3>Live Queue</h3>
              <p className="panel-subtitle">Fast actions without leaving the dashboard.</p>
            </div>
            <span className="badge">{tokens.length} visible</span>
          </div>

          {tokens.length === 0 ? (
            <div className="empty-state">No live tokens yet for today.</div>
          ) : (
            <div className="queue-list">
              {tokens.slice(0, 5).map((token) => (
                <article className="queue-item" key={token.id}>
                  <div className="queue-item-main">
                    <strong>#{token.token_number}</strong>
                    <div>
                      <p>{token.customer_name || "Walk-in client"}</p>
                      <small>
                        {token.service_name || "Service pending"} • {token.barber_name || "Unassigned"}
                      </small>
                    </div>
                  </div>

                  <div className="queue-item-side">
                    <span
                      className={`status-badge status-${String(token.status).replaceAll(
                        "_",
                        "-"
                      )}`}
                    >
                      {titleCase(token.status)}
                    </span>
                    <div className="button-row">
                      <button type="button" onClick={() => updateStatus(token.id, "in_progress")}>
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </PageLayout>
  );
}

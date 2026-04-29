import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency, formatDate, titleCase } from "../lib/format";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function lastMonthString() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

function ChartBars({ items, valueKey, labelKey, formatter }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className="chart-list">
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const width = `${Math.max((value / maxValue) * 100, 6)}%`;

        return (
          <div className="chart-row" key={`${item[labelKey]}-${value}`}>
            <div className="chart-label-row">
              <span>{item[labelKey]}</span>
              <strong>{formatter ? formatter(value) : value}</strong>
            </div>
            <div className="chart-track">
              <div className="chart-bar" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function Reports() {
  const [branches, setBranches] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    start_date: lastMonthString(),
    end_date: todayString(),
    branch_id: "",
  });
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      const response = await api.get("/reports/summary", {
        params: {
          start_date: filters.start_date,
          end_date: filters.end_date,
          branch_id: filters.branch_id || undefined,
        },
      });
      setReport(response.data);
      setError("");
    } catch (requestError) {
      console.error("Error fetching report:", requestError);
      setError(requestError.response?.data?.error || "Unable to load reports.");
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      const initialStartDate = lastMonthString();
      const initialEndDate = todayString();

      try {
        const [branchesResponse, reportResponse] = await Promise.all([
          api.get("/branches"),
          api.get("/reports/summary", {
            params: {
              start_date: initialStartDate,
              end_date: initialEndDate,
            },
          }),
        ]);

        setBranches(branchesResponse.data);
        setReport(reportResponse.data);
        setError("");
      } catch (requestError) {
        console.error("Error loading reports page:", requestError);
        setError(requestError.response?.data?.error || "Unable to load reports.");
      }
    };

    void loadPage();
  }, []);

  const handleChange = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await fetchReport();
  };

  const summary = report?.summary || {};
  const health = report?.health_metrics || {};

  return (
    <PageLayout
      title="Financial & Business Reports"
      description="Review owner-level financial performance, chart branch trends, and use HMS intelligence to improve pricing, staffing, and branch operations."
      actions={<span className="badge">AI reporting</span>}
    >
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="hero-card">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Owner cockpit</p>
            <h2>Finance, branch performance, and AI recommendations in one screen</h2>
            <p className="page-description">
              HMS now turns your raw business numbers into practical advice about
              discounts, profit pressure, branch performance, service demand, and
              barber balance.
            </p>
          </div>

          <div className="highlight-list">
            <div className="highlight-item">
              <span>Gross sales</span>
              <strong>{formatCurrency(summary.gross_sales)}</strong>
            </div>
            <div className="highlight-item">
              <span>Expenses</span>
              <strong>{formatCurrency(summary.total_expenses_amount)}</strong>
            </div>
            <div className="highlight-item">
              <span>Estimated profit</span>
              <strong>{formatCurrency(summary.estimated_profit)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>HMS AI Business Insights</h2>
            <p className="panel-subtitle">
              Guidance generated from your branch finance, payment mix, service
              demand, customer value, and barber workload.
            </p>
          </div>
          <span className="badge">Decision support</span>
        </div>

        {(report?.ai_insights || []).length === 0 ? (
          <div className="empty-state">
            HMS needs invoice, expense, and queue data before it can generate
            strong business advice for this report range.
          </div>
        ) : (
          <div className="insight-grid">
            {(report?.ai_insights || []).map((insight, index) => (
              <article className="panel insight-card" key={`${insight.title}-${index}`}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">{titleCase(insight.category)}</p>
                    <h3>{insight.title}</h3>
                  </div>
                  <span
                    className={`status-badge status-${String(insight.priority).replaceAll(
                      "_",
                      "-"
                    )}`}
                  >
                    {titleCase(insight.priority)}
                  </span>
                </div>
                <p className="panel-subtitle">{insight.message}</p>
                <p className="insight-action">
                  <strong>Suggested action:</strong> {insight.action}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Filters</h2>
            <p className="panel-subtitle">
              Run financial reports by date range and branch scope.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field-grid">
            <div className="field">
              <label htmlFor="report-start">Start date</label>
              <input
                id="report-start"
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="report-end">End date</label>
              <input
                id="report-end"
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="report-branch">Branch</label>
            <select
              id="report-branch"
              name="branch_id"
              value={filters.branch_id}
              onChange={handleChange}
            >
              <option value="">All allowed branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="button-row">
            <button type="submit">Run AI financial report</button>
          </div>
        </form>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Gross sales</p>
          <p className="stat-value">{formatCurrency(summary.gross_sales)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Discounts</p>
          <p className="stat-value">{formatCurrency(summary.total_discount)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Final sales</p>
          <p className="stat-value">{formatCurrency(summary.final_sales)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Estimated profit</p>
          <p className="stat-value">{formatCurrency(summary.estimated_profit)}</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Financial Health Signals</h2>
            <p className="panel-subtitle">
              These indicators summarize margin pressure, discount dependence, and business direction.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Profit margin</p>
            <p className="stat-value">{formatPercent(health.profit_margin)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Discount rate</p>
            <p className="stat-value">{formatPercent(health.discount_rate)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Expense rate</p>
            <p className="stat-value">{formatPercent(health.expense_rate)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Cash dependency</p>
            <p className="stat-value">{formatPercent(health.cash_dependency)}</p>
          </article>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Avg daily sales</p>
            <p className="stat-value">{formatCurrency(health.average_daily_sales)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Growth rate</p>
            <p className="stat-value">{formatPercent(health.growth_rate)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Growth direction</p>
            <p className="stat-value">{titleCase(health.growth_direction)}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Report scope</p>
            <p className="stat-value">{filters.branch_id ? "Single branch" : "All branches"}</p>
          </article>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Expenses</p>
          <p className="stat-value">{formatCurrency(summary.total_expenses_amount)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Average invoice</p>
          <p className="stat-value">{formatCurrency(summary.average_invoice)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Unique customers</p>
          <p className="stat-value">{summary.unique_customers || 0}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Invoices</p>
          <p className="stat-value">{summary.total_invoices || 0}</p>
        </article>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Branch Scorecards</h2>
              <p className="panel-subtitle">
                Rank each branch by revenue share, invoice strength, and discount pressure.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Sales Share</th>
                  <th>Discount Rate</th>
                  <th>Avg Invoice</th>
                </tr>
              </thead>
              <tbody>
                {(report?.branch_scorecards || []).map((branch) => (
                  <tr key={branch.branch_id}>
                    <td>#{branch.rank}</td>
                    <td>{branch.branch_name}</td>
                    <td>
                      <span
                        className={`status-badge status-${String(branch.status).replaceAll(
                          "_",
                          "-"
                        )}`}
                      >
                        {titleCase(branch.status)}
                      </span>
                    </td>
                    <td>{formatPercent(branch.sales_share)}</td>
                    <td>{formatPercent(branch.discount_rate)}</td>
                    <td>{formatCurrency(branch.average_invoice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Daily Sales Trend</h2>
              <p className="panel-subtitle">
                Track final sales movement day by day across the selected range.
              </p>
            </div>
          </div>
          {(report?.daily_sales || []).length === 0 ? (
            <div className="empty-state">No daily sales data found for this range.</div>
          ) : (
            <ChartBars
              items={(report?.daily_sales || []).map((item) => ({
                label: formatDate(item.day),
                final_sales: item.final_sales,
              }))}
              valueKey="final_sales"
              labelKey="label"
              formatter={formatCurrency}
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Branch Performance Chart</h2>
              <p className="panel-subtitle">
                Compare branch final sales visually to spot your strongest and weakest locations.
              </p>
            </div>
          </div>
          {(report?.branch_performance || []).length === 0 ? (
            <div className="empty-state">No branch finance data found.</div>
          ) : (
            <ChartBars
              items={(report?.branch_performance || []).map((branch) => ({
                label: branch.name,
                final_sales: branch.final_sales,
              }))}
              valueKey="final_sales"
              labelKey="label"
              formatter={formatCurrency}
            />
          )}
        </section>
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Branch Finance</h2>
              <p className="panel-subtitle">
                Compare invoices, gross, discounts, final sales, and average ticket by branch.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Invoices</th>
                  <th>Gross</th>
                  <th>Discount</th>
                  <th>Final</th>
                  <th>Avg Invoice</th>
                </tr>
              </thead>
              <tbody>
                {(report?.branch_performance || []).map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.name}</td>
                    <td>{branch.total_invoices}</td>
                    <td>{formatCurrency(branch.gross_sales)}</td>
                    <td>{formatCurrency(branch.total_discount)}</td>
                    <td>{formatCurrency(branch.final_sales)}</td>
                    <td>{formatCurrency(branch.average_invoice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Breakdown</h2>
              <p className="panel-subtitle">
                Understand how money is entering the business.
              </p>
            </div>
          </div>

          <div className="mini-list">
            <div className="mini-item">
              <span>Cash</span>
              <strong>{formatCurrency(summary.payment_cash)}</strong>
            </div>
            <div className="mini-item">
              <span>Bank</span>
              <strong>{formatCurrency(summary.payment_bank)}</strong>
            </div>
            <div className="mini-item">
              <span>Mobile Money</span>
              <strong>{formatCurrency(summary.payment_mobile_money)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Invoices</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(report?.payment_methods || []).map((item) => (
                  <tr key={item.payment_method}>
                    <td>{titleCase(item.payment_method)}</td>
                    <td>{item.total_invoices}</td>
                    <td>{formatCurrency(item.total_amount)}</td>
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
              <h2>Barber Scorecards</h2>
              <p className="panel-subtitle">
                Productivity scoring for workload balance, completion, and booking support.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barber</th>
                  <th>Status</th>
                  <th>Productivity</th>
                  <th>Workload Share</th>
                  <th>Backlog Rate</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {(report?.barber_scorecards || []).map((barber) => (
                  <tr key={`${barber.barber_name}-score`}>
                    <td>{barber.barber_name}</td>
                    <td>
                      <span
                        className={`status-badge status-${String(barber.status).replaceAll(
                          "_",
                          "-"
                        )}`}
                      >
                        {titleCase(barber.status)}
                      </span>
                    </td>
                    <td>{formatPercent(barber.productivity_score)}</td>
                    <td>{formatPercent(barber.workload_share)}</td>
                    <td>{formatPercent(barber.backlog_rate)}</td>
                    <td>{formatPercent(barber.completion_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Barber Performance</h2>
              <p className="panel-subtitle">
                Review workload, completion, and appointment counts to manage fairness and output.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barber</th>
                  <th>Tokens</th>
                  <th>Completed</th>
                  <th>Waiting</th>
                  <th>In Progress</th>
                  <th>Completion Rate</th>
                  <th>Appointments</th>
                </tr>
              </thead>
              <tbody>
                {(report?.barber_performance || []).map((barber) => (
                  <tr key={barber.barber_name}>
                    <td>{barber.barber_name}</td>
                    <td>{barber.total_tokens}</td>
                    <td>{barber.completed_tokens}</td>
                    <td>{barber.waiting_tokens}</td>
                    <td>{barber.in_progress_tokens}</td>
                    <td>{Number(barber.completion_rate || 0).toFixed(1)}%</td>
                    <td>{barber.appointment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Top Services Chart</h2>
              <p className="panel-subtitle">
                See which services are carrying the most sales value.
              </p>
            </div>
          </div>
          {(report?.top_services || []).length === 0 ? (
            <div className="empty-state">No service sales found for this range.</div>
          ) : (
            <ChartBars
              items={(report?.top_services || []).map((service) => ({
                label: service.item_name,
                total_sales: service.total_sales,
              }))}
              valueKey="total_sales"
              labelKey="label"
              formatter={formatCurrency}
            />
          )}
        </section>
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Service Opportunities</h2>
              <p className="panel-subtitle">
                Signals for upsell, promotion, or core service protection.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Signal</th>
                  <th>Avg Ticket</th>
                  <th>Sales</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {(report?.service_opportunities || []).map((service) => (
                  <tr key={`${service.service_name}-opportunity`}>
                    <td>{service.service_name}</td>
                    <td>
                      <span
                        className={`status-badge status-${String(service.signal).replaceAll(
                          "_",
                          "-"
                        )}`}
                      >
                        {titleCase(service.signal)}
                      </span>
                    </td>
                    <td>{formatCurrency(service.average_ticket)}</td>
                    <td>{formatCurrency(service.total_sales)}</td>
                    <td>{service.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Top Customers</h2>
              <p className="panel-subtitle">
                The clients generating the most value in the selected period.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Invoices</th>
                  <th>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {(report?.top_customers || []).map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.full_name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.total_invoices}</td>
                    <td>{formatCurrency(customer.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Operations Snapshot</h2>
              <p className="panel-subtitle">
                Service activity alongside the financial view.
              </p>
            </div>
          </div>
          <div className="mini-list">
            <div className="mini-item">
              <span>Tokens</span>
              <strong>{summary.total_tokens || 0}</strong>
            </div>
            <div className="mini-item">
              <span>Appointments</span>
              <strong>{summary.total_appointments || 0}</strong>
            </div>
            <div className="mini-item">
              <span>New Customers</span>
              <strong>{summary.total_customers || 0}</strong>
            </div>
            <div className="mini-item">
              <span>Recorded Expenses</span>
              <strong>{summary.total_expenses || 0}</strong>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency, formatDate, titleCase } from "../lib/format";

const categories = [
  "rent",
  "salary",
  "utilities",
  "products",
  "cleaning",
  "refreshments",
  "maintenance",
  "marketing",
  "other",
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    branch_id: "",
    amount: "",
    category: "rent",
    note: "",
    expense_date: todayString(),
  });

  const fetchPageData = async () => {
    try {
      const [expenseResponse, branchResponse] = await Promise.all([
        api.get("/expenses"),
        api.get("/branches"),
      ]);
      setExpenses(expenseResponse.data);
      setBranches(branchResponse.data);
      setFormData((current) => ({
        ...current,
        branch_id: current.branch_id || String(branchResponse.data[0]?.id || ""),
      }));
      setError("");
    } catch (requestError) {
      console.error("Error fetching expenses page:", requestError);
      setError(requestError.response?.data?.error || "Unable to load expenses.");
    }
  };

  useEffect(() => {
    const loadExpensesPage = async () => {
      await fetchPageData();
    };

    void loadExpensesPage();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateExpense = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/expenses", {
        branch_id: Number(formData.branch_id),
        amount: Number(formData.amount),
        category: formData.category,
        note: formData.note,
        expense_date: formData.expense_date,
      });

      setFormData((current) => ({
        ...current,
        amount: "",
        category: "rent",
        note: "",
        expense_date: todayString(),
      }));
      setMessage("Expense recorded successfully.");
      await fetchPageData();
    } catch (requestError) {
      console.error("Error creating expense:", requestError);
      setError(requestError.response?.data?.error || "Unable to save expense.");
    }
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <PageLayout
      title="Expenses"
      description="Track branch spending like rent, utilities, products, and maintenance so HMS can calculate real profit instead of sales only."
      actions={<span className="badge">{formatCurrency(totalExpenses)} recorded</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Record Expense</h2>
              <p className="panel-subtitle">
                Save each cost against the right branch so financial reports stay accurate.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreateExpense}>
            <div className="field">
              <label htmlFor="expense-branch">Branch</label>
              <select
                id="expense-branch"
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

            <div className="field-grid">
              <div className="field">
                <label htmlFor="expense-amount">Amount</label>
                <input
                  id="expense-amount"
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="1500"
                />
              </div>

              <div className="field">
                <label htmlFor="expense-date">Date</label>
                <input
                  id="expense-date"
                  type="date"
                  name="expense_date"
                  value={formData.expense_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="expense-category">Category</label>
              <select
                id="expense-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="expense-note">Note</label>
              <input
                id="expense-note"
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Monthly rent, shampoo purchase, electricity..."
              />
            </div>

            <div className="button-row">
              <button type="submit">Save expense</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Expense Log</h2>
              <p className="panel-subtitle">
                Review recorded spending by branch, category, and date.
              </p>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-state">No expenses recorded yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expense_date)}</td>
                      <td>{expense.branch_name || "-"}</td>
                      <td>{titleCase(expense.category)}</td>
                      <td>{formatCurrency(expense.amount)}</td>
                      <td>{expense.note || "-"}</td>
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

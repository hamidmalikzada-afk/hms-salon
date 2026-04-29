const pool = require("../config/db");
const { hasBranchAccess, getAllowedBranchIds } = require("../utils/access");
const {
  cleanString,
  fail,
  isValidDate,
  toMoney,
  toPositiveInt,
} = require("../utils/validation");

const expenseCategories = [
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

const createExpense = async (req, res) => {
  try {
    const branch_id = toPositiveInt(req.body.branch_id);
    const amount = toMoney(req.body.amount);
    const category = cleanString(req.body.category, 100).toLowerCase();
    const note = cleanString(req.body.note, 500);
    const expense_date =
      cleanString(req.body.expense_date, 10) || new Date().toISOString().slice(0, 10);

    if (!branch_id || amount === null || !category) {
      return fail(res, "branch_id, amount, and category are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    if (!expenseCategories.includes(category)) {
      return fail(res, "Invalid expense category");
    }

    if (!isValidDate(expense_date)) {
      return fail(res, "Expense date is invalid");
    }

    const result = await pool.query(
      `INSERT INTO expenses (branch_id, amount, category, note, expense_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [branch_id, amount, category, note, expense_date]
    );

    res.status(201).json({
      message: "Expense recorded successfully",
      expense: result.rows[0],
    });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getExpenses = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT
        e.*,
        b.name AS branch_name
       FROM expenses e
       LEFT JOIN branches b ON b.id = e.branch_id
       ${allowedBranchIds === null ? "" : "WHERE e.branch_id = ANY($1::int[])"}
       ORDER BY e.expense_date DESC, e.id DESC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  expenseCategories,
};

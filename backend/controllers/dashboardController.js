const pool = require("../config/db");
const { getAllowedBranchIds } = require("../utils/access");
const { buildDashboardInsights } = require("../utils/insightsEngine");

const getDashboardStats = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);

    const branchesResult = await pool.query(
      `SELECT COUNT(*) AS total_branches
       FROM branches
       ${allowedBranchIds === null ? "" : "WHERE id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const customersResult = await pool.query(
      `SELECT COUNT(*) AS total_customers
       FROM customers
       ${allowedBranchIds === null ? "" : "WHERE branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const servicesResult = await pool.query(
      `SELECT COUNT(*) AS total_services
       FROM services
       ${allowedBranchIds === null ? "" : "WHERE branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const tokensTodayResult = await pool.query(
      `SELECT COUNT(*) AS total_tokens_today
       FROM tokens t
       JOIN services s ON s.id = t.service_id
       WHERE DATE(t.created_at) = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND s.branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const appointmentsTodayResult = await pool.query(
      `SELECT COUNT(*) AS total_appointments_today
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.appointment_date = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND s.branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const salesTodayResult = await pool.query(
      `SELECT
        COUNT(*) AS total_invoices_today,
        COALESCE(SUM(final_amount), 0) AS total_sales_today
       FROM invoices
       WHERE DATE(created_at) = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const expensesTodayResult = await pool.query(
      `SELECT
        COUNT(*) AS total_expenses_today,
        COALESCE(SUM(amount), 0) AS total_expenses_today_amount
       FROM expenses
       WHERE expense_date = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const paymentMixResult = await pool.query(
      `SELECT
        payment_method,
        COALESCE(SUM(final_amount), 0) AS total_amount
       FROM invoices
       WHERE DATE(created_at) = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND branch_id = ANY($1::int[])"}
       GROUP BY payment_method`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const weeklyTrendResult = await pool.query(
      `SELECT
        day::date,
        COALESCE(income_amount, 0) AS income_amount,
        COALESCE(expense_amount, 0) AS expense_amount
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day
       LEFT JOIN (
         SELECT
           DATE(created_at) AS income_day,
           SUM(final_amount) AS income_amount
         FROM invoices
         ${allowedBranchIds === null ? "" : "WHERE branch_id = ANY($1::int[])"}
         GROUP BY DATE(created_at)
       ) income_data
         ON income_data.income_day = day::date
       LEFT JOIN (
         SELECT
           expense_date AS expense_day,
           SUM(amount) AS expense_amount
         FROM expenses
         ${allowedBranchIds === null ? "" : "WHERE branch_id = ANY($1::int[])"}
         GROUP BY expense_date
       ) expense_data
         ON expense_data.expense_day = day::date
       ORDER BY day ASC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const liabilitiesResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) AS outstanding_liabilities
       FROM invoices
       WHERE status <> 'paid'
       ${allowedBranchIds === null ? "" : "AND branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const recentTokensResult = await pool.query(
      `SELECT
        t.id,
        t.token_number,
        COALESCE(sb.full_name, t.barber_name) AS barber_name,
        t.status,
        t.created_at,
        c.full_name AS customer_name,
        s.name AS service_name,
        s.branch_id
       FROM tokens t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN services s ON t.service_id = s.id
       LEFT JOIN staff_barbers sb ON sb.id = t.barber_id
       ${allowedBranchIds === null ? "" : "WHERE s.branch_id = ANY($1::int[])"}
       ORDER BY t.created_at DESC
       LIMIT 8`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const dashboard = {
      total_branches: Number(branchesResult.rows[0].total_branches),
      total_customers: Number(customersResult.rows[0].total_customers),
      total_services: Number(servicesResult.rows[0].total_services),
      total_tokens_today: Number(tokensTodayResult.rows[0].total_tokens_today),
      total_appointments_today: Number(
        appointmentsTodayResult.rows[0].total_appointments_today
      ),
      total_invoices_today: Number(salesTodayResult.rows[0].total_invoices_today),
      total_sales_today: Number(salesTodayResult.rows[0].total_sales_today),
      total_expenses_today: Number(expensesTodayResult.rows[0].total_expenses_today),
      total_expenses_today_amount: Number(
        expensesTodayResult.rows[0].total_expenses_today_amount
      ),
      estimated_profit_today:
        Number(salesTodayResult.rows[0].total_sales_today) -
        Number(expensesTodayResult.rows[0].total_expenses_today_amount),
      outstanding_liabilities: Number(
        liabilitiesResult.rows[0].outstanding_liabilities
      ),
    };

    const payment_mix = paymentMixResult.rows.reduce(
      (accumulator, item) => {
        accumulator[item.payment_method] = Number(item.total_amount || 0);
        return accumulator;
      },
      { cash: 0, bank: 0, mobile_money: 0 }
    );

    const finance_trend = weeklyTrendResult.rows.map((row) => ({
      day: row.day,
      income_amount: Number(row.income_amount || 0),
      expense_amount: Number(row.expense_amount || 0),
      profit_amount:
        Number(row.income_amount || 0) - Number(row.expense_amount || 0),
    }));

    res.json({
      ...dashboard,
      recent_tokens: recentTokensResult.rows,
      payment_mix,
      finance_trend,
      ai_insights: buildDashboardInsights({
        dashboard,
        tokens: recentTokensResult.rows,
      }),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getDashboardStats,
};

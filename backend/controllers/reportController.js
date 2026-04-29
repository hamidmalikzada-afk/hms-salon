const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { buildReportInsights } = require("../utils/insightsEngine");
const { fail, isValidDate, toPositiveInt } = require("../utils/validation");

function buildBranchFilter(req, columnName, paramIndex = 3) {
  const allowedBranchIds = getAllowedBranchIds(req);

  if (allowedBranchIds === null) {
    return { clause: "", values: [] };
  }

  return {
    clause: `${columnName} = ANY($${paramIndex}::int[])`,
    values: [allowedBranchIds],
  };
}

function normalizeNumber(value) {
  return Number(value || 0);
}

function percentage(part, whole) {
  if (!whole) {
    return 0;
  }

  return (Number(part || 0) / Number(whole || 0)) * 100;
}

function round(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

const getReportSummary = async (req, res) => {
  try {
    const start_date = String(req.query.start_date || "").trim();
    const end_date = String(req.query.end_date || "").trim();
    const branch_id = req.query.branch_id ? toPositiveInt(req.query.branch_id) : null;

    if (!start_date || !end_date || !isValidDate(start_date) || !isValidDate(end_date)) {
      return fail(res, "Valid start_date and end_date are required");
    }

    if (branch_id && !hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to this branch", 403);
    }

    const invoiceScope = branch_id
      ? { clause: "i.branch_id = $3", values: [branch_id] }
      : buildBranchFilter(req, "i.branch_id");
    const invoiceParams = [start_date, end_date, ...invoiceScope.values];
    const invoiceWhere = `DATE(i.created_at) BETWEEN $1 AND $2 ${
      invoiceScope.clause ? `AND ${invoiceScope.clause}` : ""
    }`;

    const expenseScope = branch_id
      ? { clause: "e.branch_id = $3", values: [branch_id] }
      : buildBranchFilter(req, "e.branch_id");
    const expenseParams = [start_date, end_date, ...expenseScope.values];
    const expenseWhere = `e.expense_date BETWEEN $1 AND $2 ${
      expenseScope.clause ? `AND ${expenseScope.clause}` : ""
    }`;

    const serviceScope = branch_id
      ? { clause: "s.branch_id = $3", values: [branch_id] }
      : buildBranchFilter(req, "s.branch_id");
    const serviceParams = [start_date, end_date, ...serviceScope.values];
    const serviceWhere = `${
      serviceScope.clause ? `${serviceScope.clause} AND ` : ""
    }DATE(t.created_at) BETWEEN $1 AND $2`;

    const appointmentParams = [start_date, end_date, ...serviceScope.values];
    const appointmentWhere = `${
      serviceScope.clause ? `${serviceScope.clause} AND ` : ""
    }a.appointment_date BETWEEN $1 AND $2`;

    const customerScope = branch_id
      ? { clause: "c.branch_id = $3", values: [branch_id] }
      : buildBranchFilter(req, "c.branch_id");
    const customerParams = [start_date, end_date, ...customerScope.values];
    const customerWhere = `DATE(c.created_at) BETWEEN $1 AND $2 ${
      customerScope.clause ? `AND ${customerScope.clause}` : ""
    }`;

    const summaryResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_invoices,
        COUNT(DISTINCT i.customer_id)::int AS unique_customers,
        COALESCE(SUM(i.total_amount), 0) AS gross_sales,
        COALESCE(SUM(i.discount), 0) AS total_discount,
        COALESCE(SUM(i.final_amount), 0) AS final_sales,
        COALESCE(AVG(i.final_amount), 0) AS average_invoice
       FROM invoices i
       WHERE ${invoiceWhere}`,
      invoiceParams
    );

    const expensesResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_expenses,
        COALESCE(SUM(e.amount), 0) AS total_expenses_amount
       FROM expenses e
       WHERE ${expenseWhere}`,
      expenseParams
    );

    const paymentMethodsResult = await pool.query(
      `SELECT
        i.payment_method,
        COUNT(*)::int AS total_invoices,
        COALESCE(SUM(i.final_amount), 0) AS total_amount
       FROM invoices i
       WHERE ${invoiceWhere}
       GROUP BY i.payment_method
       ORDER BY total_amount DESC`,
      invoiceParams
    );

    const branchPerformanceResult = await pool.query(
      `SELECT
        b.id,
        b.name,
        COUNT(i.id)::int AS total_invoices,
        COALESCE(SUM(i.total_amount), 0) AS gross_sales,
        COALESCE(SUM(i.discount), 0) AS total_discount,
        COALESCE(SUM(i.final_amount), 0) AS final_sales,
        COALESCE(AVG(i.final_amount), 0) AS average_invoice
       FROM branches b
       LEFT JOIN invoices i
         ON i.branch_id = b.id
         AND DATE(i.created_at) BETWEEN $1 AND $2
       ${
         branch_id
           ? "WHERE b.id = $3"
           : getAllowedBranchIds(req) === null
             ? ""
             : "WHERE b.id = ANY($3::int[])"
       }
       GROUP BY b.id, b.name
       ORDER BY final_sales DESC, b.name ASC`,
      invoiceParams
    );

    const servicePerformanceResult = await pool.query(
      `SELECT
        ii.item_name,
        COUNT(ii.id)::int AS total_items,
        COALESCE(SUM(ii.total), 0) AS total_sales
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE ${invoiceWhere}
       GROUP BY ii.item_name
       ORDER BY total_sales DESC, total_items DESC
       LIMIT 10`,
      invoiceParams
    );

    const topCustomersResult = await pool.query(
      `SELECT
        c.id,
        c.full_name,
        c.phone,
        COUNT(i.id)::int AS total_invoices,
        COALESCE(SUM(i.final_amount), 0) AS total_spent
       FROM customers c
       JOIN invoices i ON i.customer_id = c.id
       WHERE ${invoiceWhere}
       GROUP BY c.id, c.full_name, c.phone
       ORDER BY total_spent DESC, total_invoices DESC
       LIMIT 10`,
      invoiceParams
    );

    const dailySalesResult = await pool.query(
      `SELECT
        DATE(i.created_at) AS day,
        COUNT(*)::int AS total_invoices,
        COALESCE(SUM(i.total_amount), 0) AS gross_sales,
        COALESCE(SUM(i.discount), 0) AS total_discount,
        COALESCE(SUM(i.final_amount), 0) AS final_sales
       FROM invoices i
       WHERE ${invoiceWhere}
       GROUP BY DATE(i.created_at)
       ORDER BY day ASC`,
      invoiceParams
    );

    const barberPerformanceResult = await pool.query(
      `SELECT
        COALESCE(sb.full_name, NULLIF(TRIM(t.barber_name), ''), 'Unassigned') AS barber_name,
        COUNT(*)::int AS total_tokens,
        COUNT(*) FILTER (WHERE t.status = 'done')::int AS completed_tokens,
        COUNT(*) FILTER (WHERE t.status = 'waiting')::int AS waiting_tokens,
        COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress_tokens,
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE t.status = 'done')::numeric
              / NULLIF(COUNT(*), 0)
            ) * 100,
            1
          ),
          0
        ) AS completion_rate,
        COUNT(DISTINCT a.id)::int AS appointment_count
       FROM tokens t
       JOIN services s ON s.id = t.service_id
       LEFT JOIN staff_barbers sb ON sb.id = t.barber_id
       LEFT JOIN appointments a
         ON (
           (a.barber_id IS NOT NULL AND a.barber_id = t.barber_id)
           OR (
             a.barber_id IS NULL
             AND t.barber_id IS NULL
             AND COALESCE(NULLIF(TRIM(a.barber_name), ''), 'Unassigned')
               = COALESCE(NULLIF(TRIM(t.barber_name), ''), 'Unassigned')
           )
         )
         AND a.appointment_date BETWEEN $1 AND $2
       WHERE DATE(t.created_at) BETWEEN $1 AND $2
       ${serviceScope.clause ? `AND ${serviceScope.clause}` : ""}
       GROUP BY COALESCE(sb.full_name, NULLIF(TRIM(t.barber_name), ''), 'Unassigned')
       ORDER BY total_tokens DESC, completed_tokens DESC, barber_name ASC`,
      serviceParams
    );

    const tokensResult = await pool.query(
      `SELECT COUNT(*)::int AS total_tokens
       FROM tokens t
       JOIN services s ON s.id = t.service_id
       WHERE DATE(t.created_at) BETWEEN $1 AND $2
       ${serviceScope.clause ? `AND ${serviceScope.clause}` : ""}`,
      serviceParams
    );

    const appointmentsResult = await pool.query(
      `SELECT COUNT(*)::int AS total_appointments
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.appointment_date BETWEEN $1 AND $2
       ${serviceScope.clause ? `AND ${serviceScope.clause}` : ""}`,
      appointmentParams
    );

    const customersResult = await pool.query(
      `SELECT COUNT(*)::int AS total_customers
       FROM customers c
       WHERE ${customerWhere}`,
      customerParams
    );

    const summary = summaryResult.rows[0];
    const expenses = expensesResult.rows[0];
    const paymentTotals = paymentMethodsResult.rows.reduce(
      (accumulator, item) => {
        accumulator[item.payment_method] = normalizeNumber(item.total_amount);
        return accumulator;
      },
      { cash: 0, bank: 0, mobile_money: 0 }
    );
    const computedSummary = {
      total_invoices: Number(summary.total_invoices),
      unique_customers: Number(summary.unique_customers),
      gross_sales: normalizeNumber(summary.gross_sales),
      total_discount: normalizeNumber(summary.total_discount),
      final_sales: normalizeNumber(summary.final_sales),
      average_invoice: normalizeNumber(summary.average_invoice),
      total_tokens: Number(tokensResult.rows[0].total_tokens),
      total_appointments: Number(appointmentsResult.rows[0].total_appointments),
      total_customers: Number(customersResult.rows[0].total_customers),
      total_expenses: Number(expenses.total_expenses),
      total_expenses_amount: normalizeNumber(expenses.total_expenses_amount),
      estimated_profit:
        normalizeNumber(summary.final_sales) -
        normalizeNumber(expenses.total_expenses_amount),
      payment_cash: paymentTotals.cash || 0,
      payment_bank: paymentTotals.bank || 0,
      payment_mobile_money: paymentTotals.mobile_money || 0,
    };
    const barberPerformance = barberPerformanceResult.rows.map((row) => ({
      ...row,
      total_tokens: Number(row.total_tokens),
      completed_tokens: Number(row.completed_tokens),
      waiting_tokens: Number(row.waiting_tokens),
      in_progress_tokens: Number(row.in_progress_tokens),
      completion_rate: Number(row.completion_rate),
      appointment_count: Number(row.appointment_count),
    }));
    const aiInsights = buildReportInsights({
      summary: computedSummary,
      branchPerformance: branchPerformanceResult.rows,
      topServices: servicePerformanceResult.rows,
      topCustomers: topCustomersResult.rows,
      dailySales: dailySalesResult.rows,
      paymentMethods: paymentMethodsResult.rows,
      barberPerformance,
    });
    const growthMidpoint = Math.floor(dailySalesResult.rows.length / 2);
    const firstHalfSales = dailySalesResult.rows
      .slice(0, growthMidpoint)
      .reduce((sum, day) => sum + normalizeNumber(day.final_sales), 0);
    const secondHalfSales = dailySalesResult.rows
      .slice(growthMidpoint)
      .reduce((sum, day) => sum + normalizeNumber(day.final_sales), 0);
    const growthRate = firstHalfSales
      ? percentage(secondHalfSales - firstHalfSales, firstHalfSales)
      : 0;
    const healthMetrics = {
      profit_margin: round(percentage(computedSummary.estimated_profit, computedSummary.final_sales)),
      discount_rate: round(percentage(computedSummary.total_discount, computedSummary.gross_sales)),
      expense_rate: round(
        percentage(computedSummary.total_expenses_amount, computedSummary.final_sales)
      ),
      cash_dependency: round(
        percentage(computedSummary.payment_cash, computedSummary.final_sales)
      ),
      average_daily_sales:
        dailySalesResult.rows.length > 0
          ? round(computedSummary.final_sales / dailySalesResult.rows.length, 0)
          : 0,
      growth_rate: round(growthRate),
      growth_direction:
        growthRate > 5 ? "up" : growthRate < -5 ? "down" : "stable",
    };
    const totalBranchSales = branchPerformanceResult.rows.reduce((sum, branch) => {
      return sum + normalizeNumber(branch.final_sales);
    }, 0);
    const branchScorecards = branchPerformanceResult.rows.map((branch, index) => {
      const finalSales = normalizeNumber(branch.final_sales);
      const averageInvoice = normalizeNumber(branch.average_invoice);
      const discountRate = percentage(branch.total_discount, branch.gross_sales);
      const salesShare = percentage(finalSales, totalBranchSales);
      const performanceStatus =
        index === 0 && finalSales > 0
          ? "leading"
          : discountRate >= 15
            ? "discount-risk"
            : finalSales === 0
              ? "inactive"
              : "steady";

      return {
        branch_id: Number(branch.id),
        branch_name: branch.name,
        rank: index + 1,
        sales_share: round(salesShare),
        discount_rate: round(discountRate),
        final_sales: finalSales,
        average_invoice: averageInvoice,
        total_invoices: Number(branch.total_invoices || 0),
        status: performanceStatus,
      };
    });
    const maxBarberTokens = Math.max(
      ...barberPerformance.map((barber) => Number(barber.total_tokens || 0)),
      1
    );
    const totalBarberTokens = barberPerformance.reduce((sum, barber) => {
      return sum + Number(barber.total_tokens || 0);
    }, 0);
    const barberScorecards = barberPerformance.map((barber) => {
      const workloadShare = percentage(barber.total_tokens, totalBarberTokens);
      const backlogRate = percentage(
        Number(barber.waiting_tokens || 0) + Number(barber.in_progress_tokens || 0),
        barber.total_tokens
      );
      const productivityScore = round(
        Number(barber.completion_rate || 0) * 0.65 +
          percentage(barber.total_tokens, maxBarberTokens) * 0.35
      );

      return {
        barber_name: barber.barber_name,
        total_tokens: barber.total_tokens,
        completion_rate: barber.completion_rate,
        workload_share: round(workloadShare),
        backlog_rate: round(backlogRate),
        appointment_count: barber.appointment_count,
        productivity_score: productivityScore,
        status:
          productivityScore >= 80
            ? "strong"
            : productivityScore >= 55
              ? "stable"
              : "needs-attention",
      };
    });
    const totalServiceSales = servicePerformanceResult.rows.reduce((sum, service) => {
      return sum + normalizeNumber(service.total_sales);
    }, 0);
    const averageServiceTicket =
      servicePerformanceResult.rows.length > 0
        ? totalServiceSales / servicePerformanceResult.rows.length
        : 0;
    const serviceOpportunities = servicePerformanceResult.rows.slice(0, 5).map((service) => {
      const totalSales = normalizeNumber(service.total_sales);
      const totalItems = Number(service.total_items || 0);
      const averageTicket = totalItems ? totalSales / totalItems : 0;
      let signal = "steady";
      let recommendation = "Keep this service visible and watch demand consistency.";

      if (totalItems >= 5 && averageTicket < averageServiceTicket * 0.75) {
        signal = "upsell";
        recommendation =
          "This service has good volume but a lower ticket size, so pair it with add-ons or review pricing.";
      } else if (totalItems <= 3 && totalSales >= averageServiceTicket * 2) {
        signal = "promote";
        recommendation =
          "This service produces strong value per sale. Promote it more actively to increase revenue.";
      } else if (totalSales >= totalServiceSales * 0.25) {
        signal = "core";
        recommendation =
          "This is a core revenue service. Protect quality and keep staff coverage ready.";
      }

      return {
        service_name: service.item_name,
        total_items: totalItems,
        total_sales: totalSales,
        average_ticket: round(averageTicket, 0),
        signal,
        recommendation,
      };
    });

    res.json({
      filters: {
        start_date,
        end_date,
        branch_id,
      },
      summary: computedSummary,
      payment_methods: paymentMethodsResult.rows,
      health_metrics: healthMetrics,
      branch_performance: branchPerformanceResult.rows,
      branch_scorecards: branchScorecards,
      barber_performance: barberPerformance,
      barber_scorecards: barberScorecards,
      top_services: servicePerformanceResult.rows,
      service_opportunities: serviceOpportunities,
      top_customers: topCustomersResult.rows,
      daily_sales: dailySalesResult.rows,
      ai_insights: aiInsights,
    });
  } catch (error) {
    console.error("Report summary error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getReportSummary,
};

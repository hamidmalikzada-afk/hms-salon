const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { cleanString, fail, toPositiveInt } = require("../utils/validation");
const {
  buildLoyaltyRewards,
  buildVipSuggestion,
} = require("../utils/customerRewards");

const createCustomer = async (req, res) => {
  try {
    const full_name = cleanString(req.body.full_name, 120);
    const phone = cleanString(req.body.phone, 40);
    const notes = cleanString(req.body.notes, 500);
    const branch_id = Number(req.body.branch_id);

    if (!full_name || !phone || !branch_id) {
      return fail(res, "Name, phone, and branch are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const existing = await pool.query(
      "SELECT * FROM customers WHERE phone = $1 AND branch_id = $2",
      [phone, branch_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Customer already exists",
        customer: existing.rows[0],
      });
    }

    const result = await pool.query(
      `INSERT INTO customers (full_name, phone, notes, branch_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [full_name, phone, notes, branch_id]
    );

    res.status(201).json({
      message: "Customer created",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const searchCustomer = async (req, res) => {
  try {
    const phone = cleanString(req.params.phone, 40);
    const allowedBranchIds = getAllowedBranchIds(req);

    if (!phone) {
      return fail(res, "Phone is required");
    }

    const result = await pool.query(
      `SELECT c.*, b.name AS branch_name
       FROM customers c
       LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.phone = $1
       ${allowedBranchIds === null ? "" : "AND c.branch_id = ANY($2::int[])"}`,
      allowedBranchIds === null ? [phone] : [phone, allowedBranchIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const getCustomers = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT c.*, b.name AS branch_name
       FROM customers c
       LEFT JOIN branches b ON b.id = c.branch_id
       ${allowedBranchIds === null ? "" : "WHERE c.branch_id = ANY($1::int[])"}
       ORDER BY c.id DESC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const getCustomerHistory = async (req, res) => {
  try {
    const customerId = toPositiveInt(req.params.id);

    if (!customerId) {
      return fail(res, "Valid customer id is required");
    }

    const customerResult = await pool.query(
      `SELECT c.*, b.name AS branch_name
       FROM customers c
       LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return fail(res, "Customer not found", 404);
    }

    const customer = customerResult.rows[0];

    if (!hasBranchAccess(req, customer.branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const invoicesResult = await pool.query(
      `SELECT
        i.id,
        i.final_amount,
        i.discount,
        i.payment_method,
        i.status,
        i.created_at
       FROM invoices i
       WHERE i.customer_id = $1
       ORDER BY i.created_at DESC`,
      [customerId]
    );

    const tokensResult = await pool.query(
      `SELECT
        t.id,
        t.token_number,
        t.status,
        t.created_at,
        s.name AS service_name,
        COALESCE(sb.full_name, t.barber_name) AS barber_name
       FROM tokens t
       LEFT JOIN services s ON s.id = t.service_id
       LEFT JOIN staff_barbers sb ON sb.id = t.barber_id
       WHERE t.customer_id = $1
       ORDER BY t.created_at DESC
       LIMIT 15`,
      [customerId]
    );

    const appointmentsResult = await pool.query(
      `SELECT
        a.id,
        a.status,
        a.appointment_date,
        a.appointment_time,
        a.created_at,
        s.name AS service_name,
        COALESCE(sb.full_name, a.barber_name) AS barber_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN staff_barbers sb ON sb.id = a.barber_id
       WHERE a.customer_id = $1
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 15`,
      [customerId]
    );

    const favoriteServiceResult = await pool.query(
      `SELECT
        s.name AS service_name,
        COUNT(*)::int AS total_visits
       FROM tokens t
       JOIN services s ON s.id = t.service_id
       WHERE t.customer_id = $1
       GROUP BY s.name
       ORDER BY total_visits DESC, s.name ASC
       LIMIT 1`,
      [customerId]
    );

    const favoriteBarberResult = await pool.query(
      `SELECT
        COALESCE(sb.full_name, NULLIF(TRIM(t.barber_name), ''), 'Unassigned') AS barber_name,
        COUNT(*)::int AS total_visits
       FROM tokens t
       LEFT JOIN staff_barbers sb ON sb.id = t.barber_id
       WHERE t.customer_id = $1
       GROUP BY COALESCE(sb.full_name, NULLIF(TRIM(t.barber_name), ''), 'Unassigned')
       ORDER BY total_visits DESC, barber_name ASC
       LIMIT 1`,
      [customerId]
    );

    const summary = invoicesResult.rows.reduce(
      (accumulator, invoice) => {
        accumulator.total_visits += 1;
        accumulator.total_spent += Number(invoice.final_amount || 0);
        accumulator.total_discount += Number(invoice.discount || 0);
        return accumulator;
      },
      {
        total_visits: 0,
        total_spent: 0,
        total_discount: 0,
      }
    );

    res.json({
      customer,
      summary: {
        ...summary,
        loyalty_points: Number(customer.loyalty_points || 0),
        is_vip: Boolean(customer.is_vip),
        average_spend: summary.total_visits
          ? summary.total_spent / summary.total_visits
          : 0,
        favorite_service: favoriteServiceResult.rows[0]?.service_name || "",
        favorite_barber: favoriteBarberResult.rows[0]?.barber_name || "",
        vip_since: customer.vip_since,
      },
      invoices: invoicesResult.rows,
      tokens: tokensResult.rows,
      appointments: appointmentsResult.rows,
      loyalty_rewards: buildLoyaltyRewards(customer.loyalty_points),
      vip_suggestion: buildVipSuggestion({
        totalSpent: summary.total_spent,
        totalVisits: summary.total_visits,
        loyaltyPoints: customer.loyalty_points,
        isVip: customer.is_vip,
      }),
    });
  } catch (error) {
    console.error("Customer history error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateCustomerLoyalty = async (req, res) => {
  try {
    const customerId = toPositiveInt(req.params.id);
    const nextLoyaltyPoints = Number(req.body.loyalty_points);

    if (!customerId || !Number.isInteger(nextLoyaltyPoints) || nextLoyaltyPoints < 0) {
      return fail(res, "Valid customer id and loyalty_points are required");
    }

    const customerResult = await pool.query(
      "SELECT id, branch_id FROM customers WHERE id = $1",
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return fail(res, "Customer not found", 404);
    }

    if (!hasBranchAccess(req, customerResult.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `UPDATE customers
       SET loyalty_points = $1
       WHERE id = $2
       RETURNING *`,
      [nextLoyaltyPoints, customerId]
    );

    res.json({
      message: "Customer loyalty updated successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Update customer loyalty error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateCustomerVip = async (req, res) => {
  try {
    const customerId = toPositiveInt(req.params.id);
    const isVip = Boolean(req.body.is_vip);

    if (!customerId) {
      return fail(res, "Valid customer id is required");
    }

    const customerResult = await pool.query(
      "SELECT id, branch_id, is_vip FROM customers WHERE id = $1",
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return fail(res, "Customer not found", 404);
    }

    if (!hasBranchAccess(req, customerResult.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `UPDATE customers
       SET is_vip = $1,
           vip_since = CASE
             WHEN $1 = TRUE AND vip_since IS NULL THEN NOW()
             WHEN $1 = FALSE THEN NULL
             ELSE vip_since
           END
       WHERE id = $2
       RETURNING *`,
      [isVip, customerId]
    );

    res.json({
      message: isVip ? "Customer marked as VIP" : "Customer removed from VIP",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Update customer VIP error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createCustomer,
  searchCustomer,
  getCustomers,
  getCustomerHistory,
  updateCustomerLoyalty,
  updateCustomerVip,
};

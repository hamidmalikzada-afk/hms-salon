const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { cleanString, fail, toMoney, toPositiveInt } = require("../utils/validation");

const createInvoice = async (req, res) => {
  try {
    const {
      customer_id: rawCustomerId,
      branch_id: rawBranchId,
      discount: rawDiscount = 0,
      payment_method: rawPaymentMethod = "cash",
      items,
    } = req.body;
    const customer_id = toPositiveInt(rawCustomerId);
    const branch_id = toPositiveInt(rawBranchId);
    const discount = toMoney(rawDiscount);
    const payment_method = cleanString(rawPaymentMethod, 30) || "cash";
    const validPaymentMethods = ["cash", "bank", "mobile_money"];

    if (!customer_id || !branch_id || !items || items.length === 0) {
      return fail(res, "customer_id, branch_id, and items are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    if (discount === null) {
      return fail(res, "Discount must be zero or greater");
    }

    if (!validPaymentMethods.includes(payment_method)) {
      return fail(res, "Invalid payment method");
    }

    let total_amount = 0;

    for (const item of items) {
      const price = toMoney(item.price);
      const quantity = toPositiveInt(item.quantity || 1);
      const item_name = cleanString(item.item_name, 160);
      const serviceId = item.service_id ? toPositiveInt(item.service_id) : null;

      if (price === null || !quantity || !item_name) {
        return fail(res, "Each invoice item needs valid name, price, and quantity");
      }

      if (serviceId) {
        const serviceCheck = await pool.query(
          "SELECT branch_id FROM services WHERE id = $1",
          [serviceId]
        );

        if (serviceCheck.rows.length === 0) {
          return fail(res, "One or more selected services do not exist");
        }

        if (Number(serviceCheck.rows[0].branch_id) !== branch_id) {
          return fail(res, "All invoice items must belong to the selected branch");
        }
      }

      total_amount += price * quantity;
    }

    const final_amount = total_amount - discount;

    if (final_amount < 0) {
      return fail(res, "Final amount cannot be negative");
    }

    const client = await pool.connect();

    try {
    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `INSERT INTO invoices 
      (customer_id, branch_id, total_amount, discount, final_amount, payment_method, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        customer_id,
        branch_id,
        total_amount,
        discount,
        final_amount,
        payment_method,
        "paid",
      ]
    );

    const invoice = invoiceResult.rows[0];

    for (const item of items) {
      const quantity = toPositiveInt(item.quantity || 1);
      const price = toMoney(item.price);
      const total = price * quantity;

      await client.query(
        `INSERT INTO invoice_items
        (invoice_id, service_id, item_name, price, quantity, total)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          invoice.id,
          toPositiveInt(item.service_id) || null,
          cleanString(item.item_name, 160),
          price,
          quantity,
          total,
        ]
      );
    }

    const earnedLoyaltyPoints = Math.floor(final_amount / 100);
    await client.query(
      `UPDATE customers
       SET loyalty_points = loyalty_points + $1
       WHERE id = $2`,
      [earnedLoyaltyPoints, customer_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Invoice created successfully",
      invoice,
      loyalty_points_earned: earnedLoyaltyPoints,
    });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getInvoices = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT 
        i.*,
        c.full_name AS customer_name,
        b.name AS branch_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN branches b ON i.branch_id = b.id
      ${allowedBranchIds === null ? "" : "WHERE i.branch_id = ANY($1::int[])"}
      ORDER BY i.id DESC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(
      `SELECT
        i.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        b.name AS branch_name,
        b.address AS branch_address,
        b.phone AS branch_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (!hasBranchAccess(req, invoiceResult.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const itemsResult = await pool.query(
      `SELECT id, invoice_id, service_id, item_name, price, quantity, total
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    res.json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Get invoice by id error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getTodaySales = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT 
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(discount), 0) AS total_discount,
        COALESCE(SUM(final_amount), 0) AS final_income
       FROM invoices
       WHERE DATE(created_at) = CURRENT_DATE
       ${allowedBranchIds === null ? "" : "AND branch_id = ANY($1::int[])"}`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Today sales error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getTodaySales,
};

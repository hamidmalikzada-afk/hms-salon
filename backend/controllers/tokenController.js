const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { autoAssignBarber } = require("../utils/barberAssignment");
const { cleanString, fail, toPositiveInt } = require("../utils/validation");

// CREATE TOKEN
const createToken = async (req, res) => {
  try {
    const customer_id = toPositiveInt(req.body.customer_id);
    const service_id = toPositiveInt(req.body.service_id);
    const barber_id = req.body.barber_id ? toPositiveInt(req.body.barber_id) : null;
    const barber_name = cleanString(req.body.barber_name, 120);
    const auto_assign = Boolean(req.body.auto_assign);

    if (!customer_id || !service_id) {
      return fail(res, "customer_id and service_id are required");
    }

    const serviceCheck = await pool.query(
      "SELECT id, branch_id FROM services WHERE id = $1",
      [service_id]
    );
    const customerCheck = await pool.query(
      "SELECT id, branch_id FROM customers WHERE id = $1",
      [customer_id]
    );

    if (serviceCheck.rows.length === 0 || customerCheck.rows.length === 0) {
      return fail(res, "Selected customer or service does not exist");
    }

    const serviceBranchId = Number(serviceCheck.rows[0].branch_id);
    const customerBranchId = Number(customerCheck.rows[0].branch_id);

    if (serviceBranchId !== customerBranchId) {
      return fail(res, "Customer and service must belong to the same branch");
    }

    if (!hasBranchAccess(req, serviceBranchId)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    let selectedBarberId = barber_id;
    let selectedBarberName = barber_name;

    if (auto_assign) {
      const assignedBarber = await autoAssignBarber(serviceBranchId);

      if (!assignedBarber) {
        return fail(res, "No available barber found for auto assignment");
      }

      selectedBarberId = Number(assignedBarber.id);
      selectedBarberName = assignedBarber.full_name;
    } else if (selectedBarberId) {
      const barberResult = await pool.query(
        `SELECT id, full_name, branch_id, availability_status, is_active
         FROM staff_barbers
         WHERE id = $1`,
        [selectedBarberId]
      );

      if (barberResult.rows.length === 0) {
        return fail(res, "Selected barber was not found");
      }

      const barber = barberResult.rows[0];

      if (Number(barber.branch_id) !== serviceBranchId) {
        return fail(res, "Selected barber must belong to the same branch");
      }

      if (!barber.is_active) {
        return fail(res, "Selected barber is inactive");
      }

      selectedBarberName = barber.full_name;
    } else if (!selectedBarberName) {
      return fail(res, "Choose a barber or enable auto assignment");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("LOCK TABLE tokens IN EXCLUSIVE MODE");

      const lastToken = await client.query(
        "SELECT token_number FROM tokens ORDER BY token_number DESC LIMIT 1"
      );

      const nextTokenNumber =
        lastToken.rows.length > 0 ? lastToken.rows[0].token_number + 1 : 1;

      const result = await client.query(
        `INSERT INTO tokens (token_number, customer_id, service_id, barber_id, barber_name, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          nextTokenNumber,
          customer_id,
          service_id,
          selectedBarberId,
          selectedBarberName,
          "waiting",
        ]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Token created successfully",
        token: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create token error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET ALL TOKENS
const getTokens = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT 
         t.*,
         c.full_name AS customer_name,
         s.name AS service_name,
         s.branch_id,
         COALESCE(sb.full_name, t.barber_name) AS assigned_barber_name
       FROM tokens t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN services s ON t.service_id = s.id
       LEFT JOIN staff_barbers sb ON sb.id = t.barber_id
       ${allowedBranchIds === null ? "" : "WHERE s.branch_id = ANY($1::int[])"}
       ORDER BY t.token_number ASC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get tokens error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE TOKEN STATUS
const updateTokenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = cleanString(req.body.status, 20);
    const validStatuses = ["waiting", "in_progress", "done"];

    if (!status) {
      return fail(res, "Status is required");
    }

    if (!validStatuses.includes(status)) {
      return fail(res, "Invalid status value");
    }

    const tokenBranchResult = await pool.query(
      `SELECT s.branch_id
       FROM tokens t
       JOIN services s ON s.id = t.service_id
       WHERE t.id = $1`,
      [id]
    );

    if (tokenBranchResult.rows.length === 0) {
      return res.status(404).json({ error: "Token not found" });
    }

    if (!hasBranchAccess(req, tokenBranchResult.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `UPDATE tokens
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (status === "in_progress") {
      await pool.query(
        `UPDATE staff_barbers
         SET availability_status = 'busy'
         WHERE id = $1`,
        [result.rows[0].barber_id]
      );
    }

    if (status === "done") {
      await pool.query(
        `UPDATE staff_barbers
         SET availability_status = 'available'
         WHERE id = $1`,
        [result.rows[0].barber_id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Token not found" });
    }

    res.json({
      message: "Token status updated",
      token: result.rows[0],
    });
  } catch (error) {
    console.error("Update token error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createToken,
  getTokens,
  updateTokenStatus,
};

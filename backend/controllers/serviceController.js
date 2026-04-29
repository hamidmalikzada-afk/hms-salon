const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const {
  cleanString,
  fail,
  toMoney,
  toPositiveInt,
} = require("../utils/validation");

// CREATE SERVICE
const createService = async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120);
    const price = toMoney(req.body.price);
    const duration =
      req.body.duration === "" || req.body.duration === undefined
        ? 0
        : toPositiveInt(req.body.duration) ?? 0;
    const branch_id = toPositiveInt(req.body.branch_id);

    if (!name || price === null || !branch_id) {
      return fail(res, "Name, valid price, and branch_id are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `INSERT INTO services (name, price, duration, branch_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, price, duration, branch_id]
    );

    res.status(201).json({
      message: "Service created",
      service: result.rows[0],
    });
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET ALL SERVICES
const getServices = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT s.*, b.name AS branch_name
       FROM services s
       LEFT JOIN branches b ON s.branch_id = b.id
       ${allowedBranchIds === null ? "" : "WHERE s.branch_id = ANY($1::int[])"}
       ORDER BY s.id DESC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createService,
  getServices,
};

const pool = require("../config/db");
const { getAllowedBranchIds } = require("../utils/access");
const { cleanString, fail } = require("../utils/validation");

// ADD BRANCH
const createBranch = async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120);
    const address = cleanString(req.body.address, 255);
    const phone = cleanString(req.body.phone, 40);

    if (!name) {
      return fail(res, "Branch name is required");
    }

    const result = await pool.query(
      `INSERT INTO branches (name, address, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, address, phone]
    );

    res.status(201).json({
      message: "Branch created",
      branch: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET ALL BRANCHES
const getBranches = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT *
       FROM branches
       ${allowedBranchIds === null ? "" : "WHERE id = ANY($1::int[])"}
       ORDER BY id DESC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createBranch,
  getBranches,
};

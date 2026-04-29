const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { cleanString, fail, toPositiveInt } = require("../utils/validation");

async function getWorkloadMap(branchIds) {
  const workloads = new Map();

  if (!branchIds.length) {
    return workloads;
  }

  const activeTokens = await pool.query(
    `SELECT barber_id, COUNT(*)::int AS total
     FROM tokens
     WHERE barber_id IS NOT NULL
       AND status IN ('waiting', 'in_progress')
       AND barber_id = ANY(
         SELECT id FROM staff_barbers WHERE branch_id = ANY($1::int[])
       )
     GROUP BY barber_id`,
    [branchIds]
  );

  const todayAssignments = await pool.query(
    `SELECT barber_id, COUNT(*)::int AS total
     FROM tokens
     WHERE barber_id IS NOT NULL
       AND DATE(created_at) = CURRENT_DATE
       AND barber_id = ANY(
         SELECT id FROM staff_barbers WHERE branch_id = ANY($1::int[])
       )
     GROUP BY barber_id`,
    [branchIds]
  );

  for (const row of activeTokens.rows) {
    workloads.set(Number(row.barber_id), {
      active_load: Number(row.total),
      assigned_today: 0,
    });
  }

  for (const row of todayAssignments.rows) {
    const barberId = Number(row.barber_id);
    const current = workloads.get(barberId) || {
      active_load: 0,
      assigned_today: 0,
    };

    current.assigned_today = Number(row.total);
    workloads.set(barberId, current);
  }

  return workloads;
}

const createStaffBarber = async (req, res) => {
  try {
    const full_name = cleanString(req.body.full_name, 120);
    const phone = cleanString(req.body.phone, 40);
    const skill_level = cleanString(req.body.skill_level, 30) || "general";
    const branch_id = toPositiveInt(req.body.branch_id);
    const availability_status =
      cleanString(req.body.availability_status, 20) || "available";

    const validStatuses = ["available", "busy", "break", "offline"];

    if (!full_name || !branch_id) {
      return fail(res, "full_name and branch_id are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    if (!validStatuses.includes(availability_status)) {
      return fail(res, "Invalid availability status");
    }

    const result = await pool.query(
      `INSERT INTO staff_barbers (branch_id, full_name, phone, skill_level, availability_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [branch_id, full_name, phone, skill_level, availability_status]
    );

    res.status(201).json({
      message: "Barber created successfully",
      barber: result.rows[0],
    });
  } catch (error) {
    console.error("Create barber error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getStaffBarbers = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const branchIds = allowedBranchIds === null ? [] : allowedBranchIds;
    const result = await pool.query(
      `SELECT sb.*, b.name AS branch_name
       FROM staff_barbers sb
       LEFT JOIN branches b ON b.id = sb.branch_id
       ${allowedBranchIds === null ? "" : "WHERE sb.branch_id = ANY($1::int[])"}
       ORDER BY sb.full_name ASC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    const workloadMap = await getWorkloadMap(
      allowedBranchIds === null
        ? result.rows.map((row) => Number(row.branch_id))
        : branchIds
    );

    res.json(
      result.rows.map((row) => {
        const workload = workloadMap.get(Number(row.id)) || {
          active_load: 0,
          assigned_today: 0,
        };

        return {
          ...row,
          active_load: workload.active_load,
          assigned_today: workload.assigned_today,
        };
      })
    );
  } catch (error) {
    console.error("Get barbers error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateStaffBarber = async (req, res) => {
  try {
    const barberId = toPositiveInt(req.params.id);
    const full_name = cleanString(req.body.full_name, 120);
    const phone = cleanString(req.body.phone, 40);
    const skill_level = cleanString(req.body.skill_level, 30) || "general";
    const availability_status =
      cleanString(req.body.availability_status, 20) || "available";
    const is_active = Boolean(req.body.is_active);

    const validStatuses = ["available", "busy", "break", "offline"];

    if (!barberId || !full_name) {
      return fail(res, "Valid barber id and full_name are required");
    }

    if (!validStatuses.includes(availability_status)) {
      return fail(res, "Invalid availability status");
    }

    const branchCheck = await pool.query(
      "SELECT branch_id FROM staff_barbers WHERE id = $1",
      [barberId]
    );

    if (branchCheck.rows.length === 0) {
      return fail(res, "Barber not found", 404);
    }

    if (!hasBranchAccess(req, branchCheck.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `UPDATE staff_barbers
       SET full_name = $1,
           phone = $2,
           skill_level = $3,
           availability_status = $4,
           is_active = $5
       WHERE id = $6
       RETURNING *`,
      [full_name, phone, skill_level, availability_status, is_active, barberId]
    );

    res.json({
      message: "Barber updated successfully",
      barber: result.rows[0],
    });
  } catch (error) {
    console.error("Update barber error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createStaffBarber,
  getStaffBarbers,
  updateStaffBarber,
};

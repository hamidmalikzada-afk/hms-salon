const pool = require("../config/db");
const { hasBranchAccess, getAllowedBranchIds } = require("../utils/access");
const {
  cleanString,
  fail,
  isValidDate,
  toMoney,
  toPositiveInt,
} = require("../utils/validation");

function normalizeNumber(value) {
  return Number(value || 0);
}

const createCommissionProfile = async (req, res) => {
  try {
    const branch_id = toPositiveInt(req.body.branch_id);
    const barber_id = toPositiveInt(req.body.barber_id);
    const commission_percent = toMoney(req.body.commission_percent);

    if (!branch_id || !barber_id || commission_percent === null) {
      return fail(res, "branch_id, barber_id, and commission_percent are required");
    }

    if (!hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    if (commission_percent > 100) {
      return fail(res, "Commission percent must be between 0 and 100");
    }

    const barberResult = await pool.query(
      `SELECT id, full_name, branch_id
       FROM staff_barbers
       WHERE id = $1`,
      [barber_id]
    );

    if (barberResult.rows.length === 0) {
      return fail(res, "Selected barber was not found");
    }

    if (Number(barberResult.rows[0].branch_id) !== branch_id) {
      return fail(res, "Selected barber must belong to the same branch");
    }

    const result = await pool.query(
      `INSERT INTO commission_profiles (branch_id, barber_id, staff_name, commission_percent, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [branch_id, barber_id, barberResult.rows[0].full_name, commission_percent]
    );

    res.status(201).json({
      message: "Commission profile created successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Create commission profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateCommissionProfile = async (req, res) => {
  try {
    const id = toPositiveInt(req.params.id);
    const commission_percent = toMoney(req.body.commission_percent);
    const is_active = Boolean(req.body.is_active);

    if (!id || commission_percent === null) {
      return fail(res, "Valid profile id and commission_percent are required");
    }

    if (commission_percent > 100) {
      return fail(res, "Commission percent must be between 0 and 100");
    }

    const profileResult = await pool.query(
      `SELECT id, branch_id
       FROM commission_profiles
       WHERE id = $1`,
      [id]
    );

    if (profileResult.rows.length === 0) {
      return fail(res, "Commission profile not found", 404);
    }

    if (!hasBranchAccess(req, profileResult.rows[0].branch_id)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    const result = await pool.query(
      `UPDATE commission_profiles
       SET commission_percent = $1,
           is_active = $2
       WHERE id = $3
       RETURNING *`,
      [commission_percent, is_active, id]
    );

    res.json({
      message: "Commission profile updated successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Update commission profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getCommissionSummary = async (req, res) => {
  try {
    const start_date = cleanString(req.query.start_date, 10);
    const end_date = cleanString(req.query.end_date, 10);
    const branch_id = req.query.branch_id ? toPositiveInt(req.query.branch_id) : null;

    if (!start_date || !end_date || !isValidDate(start_date) || !isValidDate(end_date)) {
      return fail(res, "Valid start_date and end_date are required");
    }

    if (branch_id && !hasBranchAccess(req, branch_id)) {
      return fail(res, "You do not have access to this branch", 403);
    }

    const scopeValues = branch_id
      ? [branch_id]
      : getAllowedBranchIds(req) === null
        ? []
        : [getAllowedBranchIds(req)];
    const branchClause = branch_id
      ? "AND sb.branch_id = $3"
      : getAllowedBranchIds(req) === null
        ? ""
        : "AND sb.branch_id = ANY($3::int[])";

    const profilesResult = await pool.query(
      `SELECT
        cp.*,
        b.name AS branch_name,
        COALESCE(sb.full_name, cp.staff_name) AS barber_name
       FROM commission_profiles cp
       LEFT JOIN branches b ON b.id = cp.branch_id
       LEFT JOIN staff_barbers sb ON sb.id = cp.barber_id
       ${
         branch_id
           ? "WHERE cp.branch_id = $1"
           : getAllowedBranchIds(req) === null
             ? ""
             : "WHERE cp.branch_id = ANY($1::int[])"
       }
       ORDER BY b.name ASC, barber_name ASC`,
      branch_id ? [branch_id] : getAllowedBranchIds(req) === null ? [] : [getAllowedBranchIds(req)]
    );

    const earningsResult = await pool.query(
      `SELECT
        sb.id AS barber_id,
        sb.full_name AS barber_name,
        sb.branch_id,
        b.name AS branch_name,
        cp.id AS profile_id,
        cp.commission_percent,
        COUNT(t.id)::int AS completed_tokens,
        COALESCE(SUM(s.price), 0) AS service_revenue,
        COALESCE(SUM((s.price * cp.commission_percent) / 100), 0) AS commission_earned
       FROM staff_barbers sb
       JOIN branches b ON b.id = sb.branch_id
       LEFT JOIN commission_profiles cp
         ON cp.barber_id = sb.id
         AND cp.is_active = TRUE
       LEFT JOIN tokens t
         ON t.barber_id = sb.id
         AND t.status = 'done'
         AND DATE(t.created_at) BETWEEN $1 AND $2
       LEFT JOIN services s ON s.id = t.service_id
       WHERE sb.is_active = TRUE
       ${branchClause}
       GROUP BY sb.id, sb.full_name, sb.branch_id, b.name, cp.id, cp.commission_percent
       ORDER BY commission_earned DESC, service_revenue DESC, sb.full_name ASC`,
      [start_date, end_date, ...scopeValues]
    );

    const earnings = earningsResult.rows.map((row) => ({
      ...row,
      barber_id: Number(row.barber_id),
      branch_id: Number(row.branch_id),
      profile_id: row.profile_id ? Number(row.profile_id) : null,
      commission_percent: normalizeNumber(row.commission_percent),
      completed_tokens: Number(row.completed_tokens),
      service_revenue: normalizeNumber(row.service_revenue),
      commission_earned: normalizeNumber(row.commission_earned),
      missing_profile: !row.profile_id,
    }));

    const totals = earnings.reduce(
      (accumulator, item) => {
        accumulator.total_barbers += 1;
        accumulator.total_completed_tokens += item.completed_tokens;
        accumulator.total_service_revenue += item.service_revenue;
        accumulator.total_commission_earned += item.commission_earned;
        accumulator.barbers_missing_profile += item.missing_profile ? 1 : 0;
        return accumulator;
      },
      {
        total_barbers: 0,
        total_completed_tokens: 0,
        total_service_revenue: 0,
        total_commission_earned: 0,
        barbers_missing_profile: 0,
      }
    );

    res.json({
      filters: {
        start_date,
        end_date,
        branch_id,
      },
      summary: totals,
      profiles: profilesResult.rows.map((row) => ({
        ...row,
        commission_percent: normalizeNumber(row.commission_percent),
      })),
      earnings,
    });
  } catch (error) {
    console.error("Get commission summary error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createCommissionProfile,
  updateCommissionProfile,
  getCommissionSummary,
};

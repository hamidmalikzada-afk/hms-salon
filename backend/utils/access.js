const pool = require("../config/db");

async function getUserAccessProfile(userId) {
  const userResult = await pool.query(
    `SELECT id, full_name, email, role, branch_id, can_view_reports, is_active, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  const branchesResult = await pool.query(
    `SELECT b.id, b.name
     FROM user_branches ub
     JOIN branches b ON b.id = ub.branch_id
     WHERE ub.user_id = $1
     ORDER BY b.name ASC`,
    [userId]
  );

  return {
    ...user,
    allowed_branches: branchesResult.rows,
  };
}

function getAllowedBranchIds(req) {
  if (!req.user) {
    return [];
  }

  if (req.user.role === "super_admin") {
    return null;
  }

  return (req.user.allowed_branches || []).map((branch) => Number(branch.id));
}

function hasBranchAccess(req, branchId) {
  const allowedBranchIds = getAllowedBranchIds(req);

  if (allowedBranchIds === null) {
    return true;
  }

  return allowedBranchIds.includes(Number(branchId));
}

function requireReportsPermission(req, res, next) {
  if (req.user?.role === "super_admin" || req.user?.can_view_reports) {
    return next();
  }

  return res.status(403).json({ error: "You do not have access to reports" });
}

module.exports = {
  getUserAccessProfile,
  getAllowedBranchIds,
  hasBranchAccess,
  requireReportsPermission,
};

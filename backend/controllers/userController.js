const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { ALL_ROLES } = require("../utils/roles");
const {
  cleanEmail,
  cleanString,
  fail,
  isValidEmail,
  toPositiveInt,
} = require("../utils/validation");
const {
  getAllowedBranchIds,
  getUserAccessProfile,
} = require("../utils/access");

function hasBranchOverlap(firstBranchIds, secondBranchIds) {
  if (!Array.isArray(firstBranchIds) || !Array.isArray(secondBranchIds)) {
    return false;
  }

  return firstBranchIds.some((branchId) => secondBranchIds.includes(Number(branchId)));
}

const listUsers = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT id
       FROM users
       ORDER BY created_at DESC`
    );

    const users = [];

    for (const row of result.rows) {
      const profile = await getUserAccessProfile(row.id);

      if (!profile) {
        continue;
      }

      if (req.user.role === "super_admin") {
        users.push(profile);
        continue;
      }

      if (profile.role === "super_admin") {
        continue;
      }

      const userBranchIds = (profile.allowed_branches || []).map((branch) =>
        Number(branch.id)
      );

      if (hasBranchOverlap(allowedBranchIds, userBranchIds)) {
        users.push(profile);
      }
    }

    res.json(users);
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const createUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const full_name = cleanString(req.body.full_name, 120);
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = cleanString(req.body.role, 20);
    const is_active =
      typeof req.body.is_active === "boolean" ? req.body.is_active : true;
    const can_view_reports = Boolean(req.body.can_view_reports);
    const branchIds = Array.isArray(req.body.branch_ids)
      ? [...new Set(req.body.branch_ids.map(toPositiveInt).filter(Boolean))]
      : [];

    if (!full_name || !email || !password || !role) {
      return fail(res, "full_name, email, password, and role are required");
    }

    if (!isValidEmail(email)) {
      return fail(res, "Please provide a valid email address");
    }

    if (!ALL_ROLES.includes(role)) {
      return fail(res, "Invalid role selected");
    }

    if (req.user.role === "manager" && role !== "cashier") {
      return fail(res, "Managers can only create receptionist/cashier users", 403);
    }

    if (password.length < 8) {
      return fail(res, "Password must be at least 8 characters");
    }

    if (role !== "super_admin" && branchIds.length === 0) {
      return fail(res, "At least one branch must be assigned to this user");
    }

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return fail(res, "Email already exists");
    }

    if (branchIds.length > 0) {
      const branchCheck = await client.query(
        "SELECT id FROM branches WHERE id = ANY($1::int[])",
        [branchIds]
      );

        if (branchCheck.rows.length !== branchIds.length) {
          return fail(res, "One or more selected branches do not exist");
        }
    }

    if (req.user.role === "manager") {
      const managerBranchIds = getAllowedBranchIds(req) || [];

      if (branchIds.some((branchId) => !managerBranchIds.includes(Number(branchId)))) {
        return fail(
          res,
          "Managers can only create users inside their assigned branches",
          403
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO users (full_name, email, password, role, branch_id, can_view_reports, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        full_name,
        email,
        hashedPassword,
        role,
        branchIds[0] || null,
        req.user.role === "super_admin" ? can_view_reports : false,
        is_active,
      ]
    );

    for (const branchId of branchIds) {
      await client.query(
        "INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)",
        [result.rows[0].id, branchId]
      );
    }

    await client.query("COMMIT");

    const createdProfile = await getUserAccessProfile(result.rows[0].id);
    res.status(201).json({
      message: "User created successfully",
      user: createdProfile,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create user error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

const updateUserAccess = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = toPositiveInt(req.params.id);
    const full_name = cleanString(req.body.full_name, 120);
    const email = cleanEmail(req.body.email);
    const role = cleanString(req.body.role, 20);
    const password = String(req.body.password || "");
    const is_active = Boolean(req.body.is_active);
    const can_view_reports = Boolean(req.body.can_view_reports);
    const branchIds = Array.isArray(req.body.branch_ids)
      ? [...new Set(req.body.branch_ids.map(toPositiveInt).filter(Boolean))]
      : [];

    if (!userId) {
      return fail(res, "Valid user id is required");
    }

    if (!full_name || !email || !role) {
      return fail(res, "full_name, email, and role are required");
    }

    if (!isValidEmail(email)) {
      return fail(res, "Please provide a valid email address");
    }

    if (!ALL_ROLES.includes(role)) {
      return fail(res, "Invalid role selected");
    }

    if (req.user.role === "manager" && role !== "cashier") {
      return fail(
        res,
        "Managers can only manage receptionist/cashier access",
        403
      );
    }

    if (role !== "super_admin" && branchIds.length === 0) {
      return fail(res, "At least one branch must be assigned to this user");
    }

    const userExists = await client.query("SELECT id FROM users WHERE id = $1", [userId]);

    if (userExists.rows.length === 0) {
      return fail(res, "User not found", 404);
    }

    const currentProfile = await getUserAccessProfile(userId);

    if (!currentProfile) {
      return fail(res, "User not found", 404);
    }

    if (req.user.role === "manager") {
      if (currentProfile.role !== "cashier") {
        return fail(res, "Managers can only edit receptionist/cashier users", 403);
      }

      const managerBranchIds = getAllowedBranchIds(req) || [];
      const targetBranchIds = (currentProfile.allowed_branches || []).map((branch) =>
        Number(branch.id)
      );

      if (!hasBranchOverlap(managerBranchIds, targetBranchIds)) {
        return fail(res, "You do not have access to this user", 403);
      }

      if (branchIds.some((branchId) => !managerBranchIds.includes(Number(branchId)))) {
        return fail(
          res,
          "Managers can only assign branches they already control",
          403
        );
      }
    }

    if (branchIds.length > 0) {
      const branchCheck = await client.query(
        "SELECT id FROM branches WHERE id = ANY($1::int[])",
        [branchIds]
      );

      if (branchCheck.rows.length !== branchIds.length) {
        return fail(res, "One or more selected branches do not exist");
      }
    }

    await client.query("BEGIN");

    if (password) {
      if (password.length < 8) {
        await client.query("ROLLBACK");
        return fail(res, "Password must be at least 8 characters");
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await client.query(
        `UPDATE users
         SET full_name = $1,
             email = $2,
             role = $3,
             branch_id = $4,
             can_view_reports = $5,
             is_active = $6,
             password = $7
         WHERE id = $8`,
        [
          full_name,
          email,
          role,
          branchIds[0] || null,
          req.user.role === "super_admin" ? can_view_reports : false,
          is_active,
          hashedPassword,
          userId,
        ]
      );
    } else {
      await client.query(
        `UPDATE users
         SET full_name = $1,
             email = $2,
             role = $3,
             branch_id = $4,
             can_view_reports = $5,
             is_active = $6
         WHERE id = $7`,
        [
          full_name,
          email,
          role,
          branchIds[0] || null,
          req.user.role === "super_admin" ? can_view_reports : false,
          is_active,
          userId,
        ]
      );
    }

    await client.query("DELETE FROM user_branches WHERE user_id = $1", [userId]);

    for (const branchId of branchIds) {
      await client.query(
        "INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)",
        [userId, branchId]
      );
    }

    await client.query("COMMIT");

    const updatedProfile = await getUserAccessProfile(userId);
    res.json({
      message: "User access updated successfully",
      user: updatedProfile,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update user access error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

const deleteUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = toPositiveInt(req.params.id);

    if (!userId) {
      return fail(res, "Valid user id is required");
    }

    if (Number(req.user?.id) === userId) {
      return fail(res, "You cannot delete your own account");
    }

    const userResult = await client.query(
      "SELECT id, role, email FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return fail(res, "User not found", 404);
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM user_branches WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");

    res.json({
      message: `User ${userResult.rows[0].email} deleted successfully`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUserAccess,
  deleteUser,
};

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const env = require("../config/env");
const { getUserAccessProfile } = require("../utils/access");
const { ALL_ROLES } = require("../utils/roles");
const {
  cleanEmail,
  cleanString,
  fail,
  isValidEmail,
  toPositiveInt,
} = require("../utils/validation");

const register = async (req, res) => {
  try {
    const full_name = cleanString(req.body.full_name, 120);
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").trim();
    const can_view_reports = Boolean(req.body.can_view_reports);
    const branchIds = Array.isArray(req.body.branch_ids)
      ? [...new Set(req.body.branch_ids.map(toPositiveInt).filter(Boolean))]
      : req.body.branch_id
        ? [toPositiveInt(req.body.branch_id)].filter(Boolean)
        : [];

    if (!full_name || !email || !password || !role) {
      return fail(res, "All fields are required");
    }

    if (!isValidEmail(email)) {
      return fail(res, "Please provide a valid email address");
    }

    if (password.length < 8) {
      return fail(res, "Password must be at least 8 characters");
    }

    if (!ALL_ROLES.includes(role)) {
      return fail(res, "Invalid role selected");
    }

    if (role !== "super_admin" && branchIds.length === 0) {
      return fail(res, "At least one branch must be assigned to this user");
    }

    const userCount = await pool.query("SELECT COUNT(*)::int AS total FROM users");
    const totalUsers = userCount.rows[0].total;

    if (totalUsers > 0 && (!req.user || req.user.role !== "super_admin")) {
      return fail(res, "Only super admin can register more users after setup", 403);
    }

    if (branchIds.length > 0) {
      const branchExists = await pool.query(
        "SELECT id FROM branches WHERE id = ANY($1::int[])",
        [branchIds]
      );

      if (branchExists.rows.length !== branchIds.length) {
        return fail(res, "One or more selected branches do not exist");
      }
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return fail(res, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO users (full_name, email, password, role, branch_id, can_view_reports)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          full_name,
          email,
          hashedPassword,
          role,
          branchIds[0] || null,
          totalUsers === 0 ? true : can_view_reports,
        ]
      );

      for (const branchId of branchIds) {
        await client.query(
          "INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)",
          [result.rows[0].id, branchId]
        );
      }

      await client.query("COMMIT");

      const userProfile = await getUserAccessProfile(result.rows[0].id);

      res.status(201).json({
        message: "User registered successfully",
        user: userProfile,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return fail(res, "Email and password are required");
    }

    if (!isValidEmail(email)) {
      return fail(res, "Please provide a valid email address");
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    const userProfile = await getUserAccessProfile(user.id);

    res.json({
      message: "Login successful",
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const me = async (req, res) => {
  try {
    const profile = await getUserAccessProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, me };

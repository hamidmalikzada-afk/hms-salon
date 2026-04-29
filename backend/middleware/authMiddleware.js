const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { getUserAccessProfile } = require("../utils/access");

function readToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

async function requireAuth(req, res, next) {
  try {
    const token = readToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    const profile = await getUserAccessProfile(decoded.id);

    if (!profile || !profile.is_active) {
      return res.status(401).json({ error: "User account is unavailable" });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      branch_id: profile.branch_id,
      can_view_reports: profile.can_view_reports,
      allowed_branches: profile.allowed_branches,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = readToken(req);

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const profile = await getUserAccessProfile(decoded.id);

    if (profile?.is_active) {
      req.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        branch_id: profile.branch_id,
        can_view_reports: profile.can_view_reports,
        allowed_branches: profile.allowed_branches,
      };
    }
    next();
  } catch (error) {
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
};

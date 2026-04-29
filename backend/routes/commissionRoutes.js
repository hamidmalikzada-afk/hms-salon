const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");
const {
  createCommissionProfile,
  updateCommissionProfile,
  getCommissionSummary,
} = require("../controllers/commissionController");

router.use(requireAuth);

router.get(
  "/summary",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  getCommissionSummary
);
router.post(
  "/profiles",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  createCommissionProfile
);
router.put(
  "/profiles/:id",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  updateCommissionProfile
);

module.exports = router;

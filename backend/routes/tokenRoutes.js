const express = require("express");
const router = express.Router();
const {
  createToken,
  getTokens,
  updateTokenStatus,
} = require("../controllers/tokenController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.use(requireAuth);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  createToken
);
router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getTokens
);
router.put(
  "/:id/status",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  updateTokenStatus
);

module.exports = router;

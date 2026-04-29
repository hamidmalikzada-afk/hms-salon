const express = require("express");
const router = express.Router();
const { createService, getServices } = require("../controllers/serviceController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.use(requireAuth);

router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getServices
);
router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  createService
);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  createStaffBarber,
  getStaffBarbers,
  updateStaffBarber,
} = require("../controllers/staffController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.use(requireAuth);

router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getStaffBarbers
);
router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  createStaffBarber
);
router.put(
  "/:id",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  updateStaffBarber
);

module.exports = router;

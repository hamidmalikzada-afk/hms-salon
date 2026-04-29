const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");
const { createExpense, getExpenses } = require("../controllers/expenseController");

router.use(requireAuth);

router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getExpenses
);
router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  createExpense
);

module.exports = router;

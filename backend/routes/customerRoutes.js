const express = require("express");
const router = express.Router();
const {
  createCustomer,
  searchCustomer,
  getCustomers,
  getCustomerHistory,
  updateCustomerLoyalty,
  updateCustomerVip,
} = require("../controllers/customerController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.use(requireAuth);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  createCustomer
);
router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getCustomers
);
router.get(
  "/history/:id",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getCustomerHistory
);
router.put(
  "/:id/loyalty",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  updateCustomerLoyalty
);
router.put(
  "/:id/vip",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  updateCustomerVip
);
router.get(
  "/:phone",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  searchCustomer
);

module.exports = router;

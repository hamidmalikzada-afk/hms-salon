const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getTodaySales,
} = require("../controllers/invoiceController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.use(requireAuth);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  createInvoice
);
router.get(
  "/today-sales",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getTodaySales
);
router.get(
  "/:id",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getInvoiceById
);
router.get(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getInvoices
);

module.exports = router;

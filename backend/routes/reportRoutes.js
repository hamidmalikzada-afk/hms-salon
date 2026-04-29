const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { requireReportsPermission } = require("../utils/access");
const { ROLES } = require("../utils/roles");
const { getReportSummary } = require("../controllers/reportController");

router.use(requireAuth);
router.use(requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER));
router.use(requireReportsPermission);

router.get("/summary", getReportSummary);

module.exports = router;

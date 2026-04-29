const express = require("express");
const router = express.Router();
const { createBranch, getBranches } = require("../controllers/branchController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");

router.get("/", requireAuth, getBranches);
router.post("/", requireAuth, requireRole(ROLES.SUPER_ADMIN), createBranch);

module.exports = router;

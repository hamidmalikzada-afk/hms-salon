const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../utils/roles");
const {
  listUsers,
  createUser,
  updateUserAccess,
  deleteUser,
} = require("../controllers/userController");

router.use(requireAuth);

router.get("/", requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER), listUsers);
router.post("/", requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER), createUser);
router.put(
  "/:id/access",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  updateUserAccess
);
router.delete("/:id", requireRole(ROLES.SUPER_ADMIN), deleteUser);

module.exports = router;

const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controllers/authController");
const { optionalAuth, requireAuth } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please wait and try again.",
});

router.post("/register", authLimiter, optionalAuth, register);
router.post("/login", authLimiter, login);
router.get("/me", requireAuth, me);

module.exports = router;

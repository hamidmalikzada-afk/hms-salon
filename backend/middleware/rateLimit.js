function createRateLimiter({
  windowMs,
  maxRequests,
  message,
  keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown",
}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const current = hits.get(key);

    if (!current || current.expiresAt <= now) {
      hits.set(key, {
        count: 1,
        expiresAt: now + windowMs,
      });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.expiresAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: message,
      });
    }

    current.count += 1;
    next();
  };
}

module.exports = {
  createRateLimiter,
};

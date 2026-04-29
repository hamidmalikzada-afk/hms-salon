function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, req, res, next) {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.statusCode || 500).json({
    error: error.publicMessage || "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

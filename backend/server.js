const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const pool = require("./config/db");
const { securityHeaders } = require("./middleware/securityHeaders");
const { createRateLimiter } = require("./middleware/rateLimit");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const customerRoutes = require("./routes/customerRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");
const staffRoutes = require("./routes/staffRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const commissionRoutes = require("./routes/commissionRoutes");

const app = express();

if (env.trustProxy) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const defaultOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ];
      const allowedOrigins = [...defaultOrigins, ...env.corsOrigins];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin is not allowed"));
    },
    credentials: true,
  })
);
app.use(securityHeaders);
app.use(
  createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    message: "Too many requests, please try again shortly.",
  })
);
app.use(express.json({ limit: "250kb" }));

app.get("/", (req, res) => {
  res.status(200).send("HMS backend is running");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("DB test error:", error);
    res.status(500).json({ error: "Database failed" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/commissions", commissionRoutes);

const PORT = env.port;

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

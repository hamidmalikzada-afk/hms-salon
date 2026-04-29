require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT) || 5050,
  dbUser: process.env.DB_USER,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbPassword: process.env.DB_PASSWORD || undefined,
  dbPort: Number(process.env.DB_PORT) || 5432,
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  trustProxy: process.env.TRUST_PROXY === "true",
};

if (!env.dbUser || !env.dbHost || !env.dbName) {
  throw new Error("DB_USER, DB_HOST, and DB_NAME are required.");
}

if (env.isProduction && env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters in production.");
}

if (!env.isProduction && env.jwtSecret.length < 16) {
  env.jwtSecret = "dev_only_change_this_secret_key";
}

module.exports = env;

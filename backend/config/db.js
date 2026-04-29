const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  user: env.dbUser,
  host: env.dbHost,
  database: env.dbName,
  password: env.dbPassword,
  port: env.dbPort,
});

module.exports = pool;

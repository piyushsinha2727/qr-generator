const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ CRITICAL ERROR: DATABASE_URL is not defined in environment variables!");
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString && (connectionString.includes("localhost") || connectionString.includes("127.0.0.1"))
    ? false
    : { rejectUnauthorized: false }
});

module.exports = pool;
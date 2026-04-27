const mysql = require("mysql2");

/**
 * Database Configuration
 * Reads Railway-injected environment variables.
 * Falls back to DB_* aliases for local development (.env).
 */
const dbConfig = {
  host:               process.env.DB_HOST     || process.env.MYSQLHOST,
  user:               process.env.DB_USER     || process.env.MYSQLUSER,
  password:           process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database:           process.env.DB_NAME     || process.env.MYSQL_DATABASE,
  port:       Number(process.env.DB_PORT      || process.env.MYSQLPORT || 3306),

  // Pool settings — far more resilient than a single connection
  waitForConnections: true,
  connectionLimit:    10,      // max simultaneous connections
  queueLimit:         0,       // unlimited queue
  connectTimeout:     20000,   // 20 s per connection attempt
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
};

// ─── Guard: refuse localhost / missing host ────────────────────────────────
if (!dbConfig.host || dbConfig.host === "localhost" || dbConfig.host === "127.0.0.1") {
  console.error("❌ FATAL: DB host is missing or restricted to localhost.");
  console.error("   Current config:", {
    host:     dbConfig.host     || "UNDEFINED",
    user:     dbConfig.user     || "UNDEFINED",
    database: dbConfig.database || "UNDEFINED",
    port:     dbConfig.port     || "UNDEFINED",
  });
  console.error("   Set MYSQLHOST (Railway) or DB_HOST (.env) and redeploy.");
  // Don't exit — allow the process to stay alive so Railway can show the log
}

// ─── Create pool (handles reconnection automatically) ─────────────────────
const pool = mysql.createPool(dbConfig);

// ─── Startup probe with retry ─────────────────────────────────────────────
const MAX_RETRIES  = 10;
const RETRY_DELAY  = 5000; // ms

function probeConnection(attempt = 1) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(
        `❌ MySQL connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        err.code, "-", err.message
      );
      if (attempt < MAX_RETRIES) {
        console.log(`   Retrying in ${RETRY_DELAY / 1000}s…`);
        setTimeout(() => probeConnection(attempt + 1), RETRY_DELAY);
      } else {
        console.error("❌ Could not connect to MySQL after", MAX_RETRIES, "attempts. Check Railway Variables.");
      }
      return;
    }
    console.log(`✅ MySQL pool connected to ${dbConfig.host}:${dbConfig.port} (attempt ${attempt})`);
    connection.release();
  });
}

probeConnection();

// ─── Exported interface (drop-in replacement for the old single-connection) ─
module.exports = {
  /**
   * db.query(sql, [values], callback)
   * Works exactly like the old single-connection query.
   * The pool picks a free connection automatically.
   */
  query: (...args) => pool.query(...args),

  /**
   * db.promise()
   * Returns the promise-based pool interface for async/await usage.
   */
  promise: () => pool.promise(),

  /** Expose the raw pool for advanced use (transactions, etc.) */
  pool,
};
const mysql = require("mysql2");

/**
 * Database Configuration
 * Uses environment variables configured in Railway.
 * References: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
 */
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT, // No fallback to 3306
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

let db;

function createConnection() {
  // 🚫 STRICT GUARD: Prevent falling back to localhost or 127.0.0.1
  if (!dbConfig.host || dbConfig.host === "localhost" || dbConfig.host === "127.0.0.1") {
    console.error("FATAL: Database environment variables are missing or restricted.");
    console.error("Current config:", {
      DB_HOST: dbConfig.host || "UNDEFINED",
      DB_USER: dbConfig.user || "UNDEFINED",
      DB_NAME: dbConfig.database || "UNDEFINED",
      DB_PORT: dbConfig.port || "UNDEFINED",
    });
    console.error("Application will NOT connect to 127.0.0.1. Please check Railway Variables.");
    return; // Stop execution
  }

  console.log(`Attempting connection to DB Host: ${dbConfig.host}`);

  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err.message);
      return; // no retry loop
    }

    console.log("✅ MySQL Connected Successfully to", dbConfig.host);
  });
  db.on("error", (err) => {
    console.error("MySQL runtime error:", err.code, err.message);
    if (
      err.code === "PROTOCOL_CONNECTION_LOST" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT" ||
      err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"
    ) {
      console.log("Reconnecting to MySQL...");
      createConnection();
    }
  });
}

createConnection();

// Proxy export to handle late initialization
module.exports = {
  query: (...args) => {
    if (!db) {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        return callback(new Error("Database connection not initialized"));
      }
      return Promise.reject(new Error("Database connection not initialized"));
    }
    return db.query(...args);
  },
  promise: () => {
    if (!db) return { query: () => Promise.reject(new Error("Database connection not initialized")) };
    return db.promise();
  },
};
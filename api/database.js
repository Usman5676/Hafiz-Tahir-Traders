const mysql = require("mysql2");

// Use Railway's auto-injected MySQL environment variables
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT || 3306,
  // Keep connection alive on Railway (prevents "PROTOCOL_CONNECTION_LOST" crashes)
  keepAliveInitialDelay: 10000,
  enableKeepAlive: true,
};

let db;

function createConnection() {
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err.message);
      // Retry after 5 seconds instead of crashing the process
      setTimeout(createConnection, 5000);
      return;
    }
    console.log("MySQL Connected Successfully");
  });

  db.on("error", (err) => {
    console.error("MySQL error:", err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
      console.log("Reconnecting to MySQL...");
      createConnection();
    } else {
      throw err;
    }
  });
}

createConnection();

// Export a proxy so all callers always get the live connection
module.exports = {
  query: (...args) => db.query(...args),
  promise: () => db.promise(),
};
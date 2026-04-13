const mysql = require("mysql2");

<<<<<<< HEAD
const db = mysql.createConnection({
=======
const dbConfig = {
>>>>>>> c99f2aa (gg)
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "1234##",
  database: process.env.DB_NAME || "inventory_system",
<<<<<<< HEAD
  port: process.env.DB_PORT || 3307,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});
=======
  port: process.env.DB_PORT || 3307
};

// Only use SSL if connecting to a remote database host (like Aiven/AWS)
if (process.env.DB_HOST && process.env.DB_HOST !== "localhost") {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  };
}

const db = mysql.createConnection(dbConfig);
>>>>>>> c99f2aa (gg)

db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("MySQL Connected Successfully");
  }
});

module.exports = db;
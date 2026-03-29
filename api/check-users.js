const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234##",
  database: "inventory_system",
  port: 3307
});

db.connect((err) => {
  if (err) {
    console.error("Connection error:", err);
    process.exit(1);
  }
  db.query("SELECT * FROM users", (err, result) => {
    if (err) console.error("Users error", err);
    else console.log("Users Table Data:", JSON.stringify(result, null, 2));
    process.exit(0);
  });
});

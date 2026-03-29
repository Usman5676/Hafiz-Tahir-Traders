const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234##",
  database: "inventory_system",
  port: 3307
});

db.connect((err) => {
  if (err) throw err;
  db.query("SELECT * FROM users", (err, result) => {
    if (err) console.error("Users error", err);
    else console.log("Users:", result);
    
    db.query("SELECT * FROM products LIMIT 5", (err, result) => {
      if (err) console.error("Products error", err);
      else console.log("Products:", result);
      process.exit(0);
    });
  });
});

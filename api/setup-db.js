const db = require("./database");

const modifyTable = async () => {
  try {
    console.log("Checking products table schema...");
    
    // Add min_stock column
    try {
      await db.promise().query("ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 10");
      console.log("Added min_stock column");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log("min_stock already exists");
      else console.error("Error adding min_stock:", err);
    }

    // Add last_alert_sent column
    try {
      await db.promise().query("ALTER TABLE products ADD COLUMN last_alert_sent DATETIME NULL");
      console.log("Added last_alert_sent column");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log("last_alert_sent already exists");
      else console.error("Error adding last_alert_sent:", err);
    }
    
    console.log("Database schema updated.");
    process.exit(0);
  } catch (error) {
    console.error("Critical error:", error);
    process.exit(1);
  }
};

modifyTable();

const db = require("./database");

const addSizeColumn = async () => {
  try {
    console.log("Adding 'size' column to products table...");
    
    try {
      await db.promise().query("ALTER TABLE products ADD COLUMN size VARCHAR(255) NULL");
      console.log("Successfully added 'size' column.");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("'size' column already exists.");
      } else {
        throw err;
      }
    }

    console.log("Database migration completed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

addSizeColumn();

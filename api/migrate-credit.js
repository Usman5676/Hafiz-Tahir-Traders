const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT || 3306,
};

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to DB, starting migration...");

    // 1. Add total_due to customers
    try {
      await connection.query("ALTER TABLE customers ADD COLUMN total_due DECIMAL(10,2) DEFAULT 0");
      console.log("Added total_due to customers");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log("total_due already exists in customers");
      else throw err;
    }

    // 2. Add columns to sales
    const salesColumns = [
      "paid_amount DECIMAL(10,2) DEFAULT 0",
      "remaining_amount DECIMAL(10,2) DEFAULT 0",
      "payment_type VARCHAR(20) DEFAULT 'Cash'",
      "status VARCHAR(20) DEFAULT 'PAID'"
    ];
    
    for (const col of salesColumns) {
      try {
        await connection.query(`ALTER TABLE sales ADD COLUMN ${col}`);
        console.log(`Added column ${col.split(' ')[0]} to sales`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') console.log(`Column ${col.split(' ')[0]} already exists in sales`);
        else throw err;
      }
    }

    // Initialize existing sales (if any) as PAID, setting paid_amount = total, remaining = 0
    await connection.query(`
      UPDATE sales 
      SET paid_amount = total, remaining_amount = 0, status = 'PAID', payment_type = 'Cash' 
      WHERE status IS NULL OR status = 'PAID' AND paid_amount = 0
    `);
    console.log("Updated existing sales data to paid");

    // 3. Create payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NULL,
        customer_id INT NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'Cash',
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
      )
    `);
    console.log("Created payments table if not existed");

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

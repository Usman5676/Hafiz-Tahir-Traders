require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./database");
const jwt = require("jsonwebtoken");

const twilioRoutes = require("./routes/twilioRoutes");
const initCronJobs = require("./cron/cronJobs");

const app = express();

// 🔐 Secret Key
const SECRET_KEY = process.env.JWT_SECRET || "mysecret123";

// ================= CORS =================
const corsOptions = {
  origin: "https://hafiz-tahir-traders-one.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Explicit preflight handler for /api/login - MUST be above routes
app.options("/api/login", (req, res) => {
  res.header("Access-Control-Allow-Origin", "https://hafiz-tahir-traders-one.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(204);
});

// Handle preflight for all other routes
app.options(/.*/, cors(corsOptions));

// OPTIONS bypass middleware - Ensures every preflight gets a 204
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "https://hafiz-tahir-traders-one.vercel.app");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());



// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Inventory System Backend Running");
});

// ================= TEST ROUTE =================
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", message: "API is reachable" });
});

// ================= JWT MIDDLEWARE =================
function verifyToken(req, res, next) {
  // Always pass OPTIONS preflight requests through — never block them with auth
  if (req.method === "OPTIONS") return next();

  // Support token from headers OR query params (for browser testing)
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;

  let token = null;
  if (authHeader) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) return res.status(401).send("Token Required");

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send("Invalid Token");
    req.user = user;
    next();
  });
}

// ================= ROLE MIDDLEWARE =================
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send("Access Denied: You don't have permission.");
    }
    next();
  };
};

// ================= LOGIN =================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // 1. Basic Validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // 2. Query execution with detailed error logging
  const sql = "SELECT * FROM users WHERE email=? AND password=?";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("❌ Login Database Error:", {
        code: err.code,
        errno: err.errno,
        sqlState: err.sqlState,
        message: err.message
      });

      // Special handling for missing table
      if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({
          error: "Database Schema Error: 'users' table not found.",
          details: "The database table 'users' does not exist. Please run setup-db or verify migrations."
        });
      }

      // Special handling for missing columns
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({
          error: "Database Schema Error: Missing expected columns in 'users' table.",
          details: err.message
        });
      }

      return res.status(500).json({
        error: "Database error during login",
        details: err.message,
        code: err.code
      });
    }

    // 3. Success / Invalid handling
    if (result && result.length > 0) {
      const user = result[0];
      const token = jwt.sign(
        { id: user.id, role: user.role },
        SECRET_KEY,
        { expiresIn: "10h" }
      );

      res.json({
        message: "Login Successful",
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } else {
      res.status(401).json({ message: "Invalid Email or Password" });
    }
  });
});

// ================= CATEGORY =================
app.post("/api/categories", verifyToken, checkRole(["admin"]), (req, res) => {
  const { name } = req.body;
  const sql = "INSERT INTO categories (name) VALUES (?)";
  db.query(sql, [name], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Category Added Successfully");
  });
});

// Allow cashier to see categories
app.get("/api/categories", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  db.query("SELECT * FROM categories", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ================= PRODUCTS =================
app.post("/api/products", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const { name, category_id, supplier_id, price, sell_price, buy_price, size, quantity, stock, min_stock } = req.body;
  const s_price = sell_price || price || 0;
  const b_price = buy_price || 0;
  const qty = stock !== undefined ? stock : (quantity !== undefined ? quantity : 0);
  const prod_size = size || 'N/A';
  const m_stock = min_stock !== undefined ? min_stock : 10;
  
  const sql = "INSERT INTO products (name, category_id, supplier_id, price, buy_price, size, stock, quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [name, category_id || null, supplier_id || null, s_price, b_price, prod_size, qty, qty, m_stock], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Product Added Successfully");
  });
});

// Bulk Import Products
app.post("/api/products/bulk", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const products = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "Invalid data. Expected an array of products." });
  }

  const sql = "INSERT INTO products (name, price, buy_price, size, stock, quantity, min_stock) VALUES ?";
  const values = products.map(p => [
    p.name, 
    p.sell_price || p.price || 0, 
    p.buy_price || 0, 
    p.size || 'N/A', 
    p.stock || 0, 
    p.stock || 0, 
    p.min_stock || 10
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Bulk Import Error:", err);
      return res.status(500).json({ error: "Failed to import products", details: err.message });
    }
    res.json({ message: `${result.affectedRows} products imported successfully` });
  });
});

// Allow cashier to see products
app.get("/api/products", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  db.query("SELECT *, price as sell_price FROM products", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Update Product
app.put("/api/products/:id", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const { name, price, sell_price, buy_price, size, stock, quantity, category_id, supplier_id, min_stock } = req.body;
  const s_price = sell_price || price;
  const qty = stock !== undefined ? stock : quantity;
  
  const sql = "UPDATE products SET name=?, price=?, buy_price=?, size=?, stock=?, quantity=?, category_id=?, supplier_id=?, min_stock=? WHERE id=?";
  db.query(sql, [name, s_price, buy_price, size, qty, qty, category_id || null, supplier_id || null, min_stock || 10, req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product Updated Successfully" });
  });
});

// Delete Product
app.delete("/api/products/:id", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product Deleted Successfully" });
  });
});

// ================= SUPPLIERS =================
app.post("/api/suppliers", verifyToken, checkRole(["admin"]), (req, res) => {
  const { name, phone, email } = req.body;
  const sql = "INSERT INTO suppliers (name, phone, email) VALUES (?, ?, ?)";
  db.query(sql, [name, phone, email], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Supplier Added Successfully");
  });
});

// Update Supplier
app.put("/api/suppliers/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { name, phone, email } = req.body;
  const sql = "UPDATE suppliers SET name=?, phone=?, email=? WHERE id=?";
  db.query(sql, [name, phone, email, req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier Updated Successfully" });
  });
});

// Delete Supplier
app.delete("/api/suppliers/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM suppliers WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier Deleted Successfully" });
  });
});

// Allow cashier to see suppliers
app.get("/api/suppliers", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  db.query("SELECT * FROM suppliers", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ================= CUSTOMERS =================
app.post("/api/customers", verifyToken, checkRole(["admin", "cashier"]), (req, res) => {
  const { name, phone, email, address } = req.body;
  const sql = "INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, phone, email, address], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Customer Added Successfully");
  });
});

// Update Customer
app.put("/api/customers/:id", verifyToken, checkRole(["admin", "cashier"]), (req, res) => {
  const { name, phone, email, address } = req.body;
  const sql = "UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?";
  db.query(sql, [name, phone, email, address, req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer Updated Successfully" });
  });
});

// Delete Customer
app.delete("/api/customers/:id", verifyToken, checkRole(["admin", "cashier"]), (req, res) => {
  const customerId = req.params.id;
  db.query("DELETE FROM customers WHERE id=?", [customerId], (err, result) => {
    if (err) {
      // Check for foreign key constraint error (e.g. customer has sales)
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451) {
        return res.status(400).json({
          message: "Cannot delete customer because they have sales history in the system."
        });
      }
      return res.status(500).send(err);
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer Deleted Successfully" });
  });
});

app.get("/api/customers", verifyToken, checkRole(["admin", "cashier", "manager"]), (req, res) => {
  db.query("SELECT * FROM customers", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ================= PURCHASES (STOCK IN) =================
// Get all purchases with product name via JOIN
app.get("/api/purchases", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const sql = `
    SELECT p.id, p.product_id, pr.name AS product_name, p.quantity, p.price, p.purchase_date
    FROM purchases p
    LEFT JOIN products pr ON p.product_id = pr.id
    ORDER BY p.purchase_date DESC, p.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Record a new purchase and update product stock
app.post("/api/purchases", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const { productId, quantity, cost } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ message: "Product and Quantity are required" });
  }
  const purchaseDate = new Date().toISOString().split('T')[0];
  const sql = "INSERT INTO purchases (product_id, quantity, price, purchase_date) VALUES (?, ?, ?, ?)";
  db.query(sql, [productId, quantity, cost || 0, purchaseDate], (err) => {
    if (err) return res.status(500).send(err);
    // Also update product stock
    const updateSql = "UPDATE products SET stock = stock + ? WHERE id = ?";
    db.query(updateSql, [quantity, productId], (err2) => {
      if (err2) console.error("Stock update failed:", err2);
      res.json({ message: "Purchase recorded and stock updated successfully" });
    });
  });
});

// Delete a purchase
app.delete("/api/purchases/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM purchases WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Purchase not found" });
    res.json({ message: "Purchase deleted successfully" });
  });
});

// ================= SALES =================
app.post("/api/sales", verifyToken, checkRole(["admin", "cashier"]), (req, res) => {
  const { customer_id, sale_date, total, payment_type, paid_amount } = req.body;

  const paymentType = payment_type || 'Cash';
  const paidAmount = Number(paid_amount) || 0;
  const remainingAmount = total - paidAmount;
  let status = 'PAID';
  if (remainingAmount > 0) status = 'PARTIAL';
  if (paidAmount === 0) status = 'UNPAID';

  const sql = "INSERT INTO sales (customer_id, sale_date, total, paid_amount, remaining_amount, payment_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [customer_id || null, sale_date, total, paidAmount, remainingAmount, paymentType, status], (err, result) => {
    if (err) return res.status(500).send(err);
    const saleId = result.insertId;

    if (customer_id && remainingAmount > 0) {
      const updateDueSql = "UPDATE customers SET total_due = total_due + ? WHERE id = ?";
      db.query(updateDueSql, [remainingAmount, customer_id], (err2) => {
        if (err2) console.error("Error updating customer due:", err2);
      });
    }

    if (customer_id && paidAmount > 0) {
      const paymentSql = "INSERT INTO payments (sale_id, customer_id, amount_paid, payment_method, payment_date) VALUES (?, ?, ?, ?, ?)";
      db.query(paymentSql, [saleId, customer_id, paidAmount, paymentType, sale_date], (err3) => {
        if (err3) console.error("Error inserting initial payment:", err3);
      });
    }

    res.send("Sale Added Successfully");
  });
});

app.get("/api/sales", verifyToken, checkRole(["admin", "cashier", "manager"]), (req, res) => {
  db.query("SELECT * FROM sales ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ================= LEDGER & PAYMENTS =================
app.get("/api/customers/:id/ledger", verifyToken, checkRole(["admin", "cashier", "manager"]), (req, res) => {
  const customerId = req.params.id;

  db.query("SELECT * FROM customers WHERE id = ?", [customerId], (err, custResult) => {
    if (err) return res.status(500).send(err);
    if (custResult.length === 0) return res.status(404).send("Customer not found");

    const customer = custResult[0];

    db.query("SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC, id DESC", [customerId], (err2, sales) => {
      if (err2) return res.status(500).send(err2);

      db.query("SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC, id DESC", [customerId], (err3, payments) => {
        if (err3) return res.status(500).send(err3);

        const totalPurchases = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

        res.json({
          customer,
          totalPurchases,
          totalPaid,
          sales,
          payments
        });
      });
    });
  });
});

app.post("/api/payments", verifyToken, checkRole(["admin", "cashier"]), (req, res) => {
  const { customer_id, amount_paid, payment_method } = req.body;

  if (!customer_id || amount_paid <= 0) {
    return res.status(400).send("Invalid payment details");
  }

  const paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Insert payment record
  const insertPaymentSql = "INSERT INTO payments (customer_id, amount_paid, payment_method, payment_date) VALUES (?, ?, ?, ?)";
  db.query(insertPaymentSql, [customer_id, amount_paid, payment_method || 'Cash', paymentDate], (err1) => {
    if (err1) return res.status(500).send(err1);

    // Decrease customer total_due
    const updateDueSql = "UPDATE customers SET total_due = total_due - ? WHERE id = ?";
    db.query(updateDueSql, [amount_paid, customer_id], (err2) => {
      if (err2) return res.status(500).send(err2);

      // FIFO Logic to clear remaining_amount on unpaid/partial sales
      const getSalesSql = "SELECT id, remaining_amount FROM sales WHERE customer_id = ? AND remaining_amount > 0 ORDER BY id ASC";
      db.query(getSalesSql, [customer_id], (err3, sales) => {
        if (err3) return res.status(500).send(err3);

        let unassignedAmount = Number(amount_paid);

        const processSales = async () => {
          for (let sale of sales) {
            if (unassignedAmount <= 0) break;

            const rem = Number(sale.remaining_amount);
            const applied = Math.min(unassignedAmount, rem);
            unassignedAmount -= applied;

            const newRem = rem - applied;
            const newStatus = newRem > 0 ? 'PARTIAL' : 'PAID';

            await db.promise().query("UPDATE sales SET paid_amount = paid_amount + ?, remaining_amount = ?, status = ? WHERE id = ?", [applied, newRem, newStatus, sale.id]);
          }
          res.json({ message: "Payment processed successfully" });
        };

        processSales().catch(err => {
          console.error("Error in FIFO sales update:", err);
          res.status(500).send("Partial failure during sales update");
        });
      });
    });
  });
});

// ================= DASHBOARD =================
// Allow cashier to see dashboard
app.get("/api/dashboard", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  const sql = `
    SELECT 
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM sales) AS total_sales
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result[0]);
  });
});
// ================= USERS (Admin Only) =================
// Get all users
app.get("/api/users", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("SELECT id, name, email, role FROM users", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Add new user
app.post("/api/users", verifyToken, checkRole(["admin"]), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, email, password, role], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(500).send(err);
    }
    res.json({ message: "User Added Successfully" });
  });
});

// Delete user
app.delete("/api/users/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const userId = req.params.id;
  // Prevent deleting yourself
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }
  db.query("DELETE FROM users WHERE id=?", [userId], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User Deleted Successfully" });
  });
});

// ================= REPORTS =================
// Get inventory report data
app.get("/api/reports/inventory", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  db.query("SELECT id, name, price, buy_price, size, stock, quantity FROM products ORDER BY id ASC", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Get sales report data with customer name
app.get("/api/reports/sales", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const sql = `
    SELECT s.id, COALESCE(c.name, 'Walk-in') AS customer_name, s.total, s.sale_date
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.sale_date DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Export Inventory as CSV
app.get("/api/reports/inventory/csv", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  db.query("SELECT id, name, price, buy_price, size, stock FROM products ORDER BY id ASC", (err, result) => {
    if (err) return res.status(500).send(err);
    let csv = "ID,Product Name,Size,Buy Price,Sell Price,Stock,Profit Per Unit\n";
    result.forEach(row => {
      const stock = row.stock !== undefined ? row.stock : (row.quantity || 0);
      const profit = (row.price || 0) - (row.buy_price || 0);
      csv += `${row.id},"${row.name}","${row.size || 'N/A'}",${row.buy_price},${row.price},${stock},${profit}\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=inventory_report.csv");
    res.send(csv);
  });
});

// Export Sales as CSV
app.get("/api/reports/sales/csv", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const sql = `
    SELECT s.id, COALESCE(c.name, 'Walk-in') AS customer_name, s.total, s.sale_date
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.sale_date DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    let csv = "Sale ID,Customer,Total (Rs.),Date\n";
    result.forEach(row => {
      const date = row.sale_date ? new Date(row.sale_date).toLocaleDateString() : '-';
      csv += `${row.id},"${row.customer_name}",${row.total},"${date}"\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.csv");
    res.send(csv);
  });
});

// Profit Statistics for Analytics
app.get("/api/reports/profit-stats", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const sql = `
    SELECT name, (price - buy_price) as profit_per_unit, stock
    FROM products
    WHERE (price - buy_price) > 0
    ORDER BY (price - buy_price) * stock DESC
    LIMIT 10
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Mount Twilio Routes
app.use("/api", twilioRoutes);

// Initialize Background Cron Jobs
initCronJobs();

// ================= SERVER =================
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
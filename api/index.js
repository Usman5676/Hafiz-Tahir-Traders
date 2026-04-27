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
  console.log("Received product data:", req.body);
  const { name, size, buyPrice, sellPrice, stock, lowStockLimit } = req.body;

  // Require all fields
  if (
    name == null || name === '' ||
    size == null || size === '' ||
    buyPrice == null ||
    sellPrice == null ||
    stock == null ||
    lowStockLimit == null
  ) {
    return res.status(400).json({ error: "All fields are required: name, size, buyPrice, sellPrice, stock, lowStockLimit" });
  }

  // Convert & validate numbers
  const bPrice = Number(buyPrice);
  const sPrice = Number(sellPrice);
  const qty = Number(stock);
  const lowLimit = Number(lowStockLimit);

  if (isNaN(bPrice) || isNaN(sPrice) || isNaN(qty) || isNaN(lowLimit)) {
    return res.status(400).json({ error: "Numeric fields (buyPrice, sellPrice, stock, lowStockLimit) must be valid numbers" });
  }

  if (bPrice > sPrice) {
    return res.status(400).json({ error: "buyPrice must be less than or equal to sellPrice" });
  }

  if (qty < 0 || lowLimit < 0) {
    return res.status(400).json({ error: "stock and lowStockLimit must be 0 or greater" });
  }

  // Map camelCase → snake_case DB columns
  const sql = "INSERT INTO products (name, size, buy_price, sell_price, stock, low_stock_limit) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [name.trim(), size.trim(), bPrice, sPrice, qty, lowLimit], (err, result) => {
    if (err) {
      console.error("❌ Database error during product insertion:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Product Added Successfully", id: result.insertId });
  });
});

// Bulk Import Products
app.post("/api/products/bulk", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const products = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "Invalid data. Expected an array of products." });
  }

  const sql = "INSERT INTO products (name, size, buy_price, sell_price, stock, low_stock_limit) VALUES ?";
  const values = products.map(p => {
    // Accept both camelCase (new CSV parser) and snake_case (legacy)
    const buyPrice   = Number(p.buyPrice  ?? p.buy_price  ?? 0);
    const sellPrice  = Number(p.sellPrice ?? p.sell_price ?? p.price ?? 0);
    const stock      = Number(p.stock ?? 0);
    const lowLimit   = Number(p.lowStockLimit ?? p.low_stock_limit ?? p.min_stock ?? 10);
    return [
      (p.name || '').trim(),
      (p.size || 'N/A').trim(),
      isNaN(buyPrice)  ? 0 : buyPrice,
      isNaN(sellPrice) ? 0 : sellPrice,
      isNaN(stock)     ? 0 : stock,
      isNaN(lowLimit)  ? 10 : lowLimit
    ];
  });

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("❌ Bulk Import Error:", err);
      return res.status(500).json({ error: "Failed to import products", details: err.message });
    }
    res.status(201).json({ message: `${result.affectedRows} products imported successfully` });
  });
});

// Allow cashier to see products
app.get("/api/products", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  const sql = `
    SELECT
      id, name, size, buy_price, sell_price, stock, low_stock_limit,
      (sell_price - buy_price)          AS profit_per_unit,
      ((sell_price - buy_price) * stock) AS total_profit,
      CASE
        WHEN stock <= low_stock_limit THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status
    FROM products
    ORDER BY id ASC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Database error during product retrieval:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(result);
  });
});

// Update Product
app.put("/api/products/:id", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  // Accept both camelCase (frontend) and snake_case (legacy) field names
  const {
    name,
    size,
    buyPrice, buy_price,
    sellPrice, sell_price,
    stock,
    lowStockLimit, low_stock_limit
  } = req.body;

  const bPrice    = Number(buyPrice  ?? buy_price  ?? 0);
  const sPrice    = Number(sellPrice ?? sell_price ?? 0);
  const qty       = Number(stock ?? 0);
  const lowLimit  = Number(lowStockLimit ?? low_stock_limit ?? 10);

  if (!name || !size) {
    return res.status(400).json({ error: "name and size are required" });
  }
  if (isNaN(bPrice) || isNaN(sPrice) || isNaN(qty) || isNaN(lowLimit)) {
    return res.status(400).json({ error: "Numeric fields must be valid numbers" });
  }
  if (bPrice > sPrice) {
    return res.status(400).json({ error: "buyPrice must be less than or equal to sellPrice" });
  }

  const sql = "UPDATE products SET name=?, size=?, buy_price=?, sell_price=?, stock=?, low_stock_limit=? WHERE id=?";
  db.query(sql, [name.trim(), size.trim(), bPrice, sPrice, qty, lowLimit, req.params.id], (err, result) => {
    if (err) {
      console.error("❌ Database error during product update:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product Updated Successfully" });
  });
});

// Delete Product
app.delete("/api/products/:id", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err, result) => {
    if (err) {
      console.error("❌ Database error during product delete:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product Deleted Successfully" });
  });
});

// ================= SUPPLIERS =================
app.post("/api/suppliers", verifyToken, checkRole(["admin"]), (req, res) => {
  // Accept camelCase serviceType OR legacy snake_case service_type
  const { name, phone, email, serviceType, service_type } = req.body;
  const svcType = serviceType || service_type || null;

  if (!name || !phone || !svcType) {
    return res.status(400).json({ error: "name, phone, and serviceType are required" });
  }

  const sql = "INSERT INTO suppliers (name, phone, email, service_type) VALUES (?, ?, ?, ?)";
  db.query(sql, [name.trim(), phone.trim(), email || null, svcType.trim()], (err, result) => {
    if (err) {
      console.error("❌ Database error during supplier insertion:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.status(201).json({ message: "Supplier Added Successfully", id: result.insertId });
  });
});

// Update Supplier
app.put("/api/suppliers/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { name, phone, email, serviceType, service_type } = req.body;
  const svcType = serviceType || service_type || null;

  if (!name || !phone || !svcType) {
    return res.status(400).json({ error: "name, phone, and serviceType are required" });
  }

  const sql = "UPDATE suppliers SET name=?, phone=?, email=?, service_type=? WHERE id=?";
  db.query(sql, [name.trim(), phone.trim(), email || null, svcType.trim(), req.params.id], (err, result) => {
    if (err) {
      console.error("❌ Database error during supplier update:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier Updated Successfully" });
  });
});

// Delete Supplier
app.delete("/api/suppliers/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM suppliers WHERE id=?", [req.params.id], (err, result) => {
    if (err) {
      console.error("❌ Database error during supplier delete:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier Deleted Successfully" });
  });
});

// GET all suppliers
app.get("/api/suppliers", verifyToken, checkRole(["admin", "manager", "cashier"]), (req, res) => {
  db.query("SELECT id, name, phone, email, service_type FROM suppliers ORDER BY id ASC", (err, result) => {
    if (err) {
      console.error("❌ Database error fetching suppliers:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
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
// Get all purchases with product name, supplier name, and total_cost via JOIN
app.get("/api/purchases", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.product_id,
      pr.name  AS product_name,
      p.supplier_id,
      s.name   AS supplier_name,
      p.unit_price,
      p.quantity,
      p.total_cost,
      p.purchase_date
    FROM purchases p
    LEFT JOIN products  pr ON p.product_id  = pr.id
    LEFT JOIN suppliers s  ON p.supplier_id = s.id
    ORDER BY p.purchase_date DESC, p.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Database error fetching purchases:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(result);
  });
});

// Record a new purchase and update product stock
app.post("/api/purchases", verifyToken, checkRole(["admin", "manager"]), (req, res) => {
  // Accept both camelCase (frontend) and snake_case field names
  const {
    productId,  product_id,
    supplierId, supplier_id,
    unitPrice,  unit_price,
    quantity
  } = req.body;

  const pid   = productId  || product_id;
  const sid   = supplierId || supplier_id;
  const uPrice = Number(unitPrice ?? unit_price);
  const qty   = Number(quantity);

  // Validation — use parsed numbers, not raw strings
  if (!pid || !sid) {
    return res.status(400).json({ error: "product_id and supplier_id are required" });
  }
  if (isNaN(uPrice) || uPrice <= 0) {
    return res.status(400).json({ error: "unitPrice must be a positive number" });
  }
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return res.status(400).json({ error: "quantity must be a positive whole number" });
  }

  // Calculate total cost server-side — never trust the client value
  const totalCost = parseFloat((uPrice * qty).toFixed(2));
  const purchaseDate = new Date().toISOString().split('T')[0];

  const sql = "INSERT INTO purchases (product_id, supplier_id, unit_price, quantity, total_cost, purchase_date) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [pid, sid, uPrice, qty, totalCost, purchaseDate], (err, result) => {
    if (err) {
      console.error("❌ Database error during purchase insert:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }

    // Update product stock after successful insert
    const updateSql = "UPDATE products SET stock = stock + ? WHERE id = ?";
    db.query(updateSql, [qty, pid], (err2) => {
      if (err2) {
        console.error("❌ Stock update failed after purchase insert:", err2);
        // Purchase was recorded — log the error but don't fail the response
      }
      res.status(201).json({
        message: "Purchase recorded and stock updated successfully",
        id: result.insertId,
        total_cost: totalCost
      });
    });
  });
});

// Delete a purchase
app.delete("/api/purchases/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM purchases WHERE id=?", [req.params.id], (err, result) => {
    if (err) {
      console.error("❌ Database error during purchase delete:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }
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
  db.query("SELECT id, name, size, buy_price, sell_price, stock, low_stock_limit FROM products ORDER BY id ASC", (err, result) => {
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
  db.query("SELECT id, name, size, buy_price, sell_price, stock FROM products ORDER BY id ASC", (err, result) => {
    if (err) return res.status(500).send(err);
    let csv = "ID,Product Name,Size,Buy Price,Sell Price,Stock,Profit Per Unit\n";
    result.forEach(row => {
      const stock = row.stock || 0;
      const profit = (row.sell_price || 0) - (row.buy_price || 0);
      csv += `${row.id},"${row.name}","${row.size || 'N/A'}",${row.buy_price || 0},${row.sell_price || 0},${stock},${profit}\n`;
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
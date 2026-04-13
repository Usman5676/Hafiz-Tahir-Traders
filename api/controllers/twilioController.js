const db = require('../database');
const twilioClient = require('../utils/twilioClient');

/**
 * Handles fetching low stock items, formatting the SMS,
 * and applying the 1-hour anti-spam rules.
 */
const sendLowStockAlert = async (req, res = null) => {
  try {
    if (!twilioClient) {
      if (res) return res.status(500).json({ message: "Twilio credentials are not configured properly." });
      console.error("Twilio client not configured. Cannot send SMS.");
      return;
    }

    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const alertPhone = process.env.ALERT_PHONE_NUMBER;

    if (!twilioPhone || !alertPhone) {
      if (res) return res.status(500).json({ message: "Missing TWILIO_PHONE_NUMBER or ALERT_PHONE_NUMBER." });
      console.error("Missing Twilio Phone Numbers");
      return;
    }

    // 1. Fetch products where quantity is less than min_stock
    // We handle the edge case where stock might be named quantity or stock.
    const query = `
      SELECT id, name, COALESCE(stock, quantity) as current_qty, min_stock, last_alert_sent 
      FROM products 
      WHERE COALESCE(stock, quantity) < min_stock
    `;

    db.query(query, async (err, products) => {
      if (err) {
        console.error("Database Error:", err);
        if (res) return res.status(500).json({ message: "Database Error", error: err });
        return;
      }

      if (products.length === 0) {
        if (res) return res.status(200).json({ message: "No low stock items. No SMS sent." });
        return;
      }

      // 2. Anti-spam Logic: Filter to only products that need an alert right now.
      const ONE_HOUR = 60 * 60 * 1000;
      const now = new Date();

      const itemsToAlert = products.filter(p => {
        if (!p.last_alert_sent) return true; // Newly low stock
        const lastSentDate = new Date(p.last_alert_sent);
        return (now - lastSentDate) > ONE_HOUR; // Alerted > 1 hour ago
      });

      if (itemsToAlert.length === 0) {
        if (res) return res.status(200).json({ message: "All low stock items have already been alerted within the last hour." });
        return;
      }

      // 3. Generate SMS message body
      let messageBody = "⚠️ Low Stock Alert:\n\n";
      itemsToAlert.forEach(item => {
        messageBody += `${item.name} (Qty: ${item.current_qty})\n`;
      });

      // 4. Send SMS
      try {
        const message = await twilioClient.messages.create({
          body: messageBody,
          from: twilioPhone,
          to: alertPhone
        });

        console.log("SMS Sent Successfully. SID:", message.sid);

        // 5. Update last_alert_sent in DB for these specific products
        const idsToUpdate = itemsToAlert.map(i => i.id);
        const updateSql = `UPDATE products SET last_alert_sent = NOW() WHERE id IN (?)`;
        
        db.query(updateSql, [idsToUpdate], (updateErr) => {
          if (updateErr) {
            console.error("Failed to update last_alert_sent:", updateErr);
            // It still sent the SMS, we just failed to log it, but we return success.
          } else {
            console.log(`Updated last_alert_sent for ${idsToUpdate.length} product(s).`);
          }

          if (res) return res.status(200).json({ message: "SMS Alert sent successfully!", itemsAlerted: itemsToAlert.length });
        });

      } catch (twilioError) {
        console.error("Twilio Error:", twilioError);
        if (res) return res.status(500).json({ message: "Twilio Error", error: twilioError.message });
      }
    });

  } catch (err) {
    console.error("Unexpected Error in sendLowStockAlert:", err);
    if (res) res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendLowStockAlert
};

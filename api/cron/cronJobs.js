const cron = require('node-cron');
const twilioController = require('../controllers/twilioController');

/**
 * Initializes all background cron jobs for the application.
 */
const initCronJobs = () => {
  // Only run cron if Twilio is configured (prevents Railway crash on missing env vars)
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("[CRON] Twilio not configured. Skipping cron job initialization.");
    return;
  }

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log("[CRON] Running 5-minute low stock check...");
    try {
      await twilioController.sendLowStockAlert();
    } catch (err) {
      console.error("[CRON] Error in low stock check:", err.message);
      // Do NOT re-throw — cron errors must never crash the server
    }
  });

  console.log("Cron jobs initialized.");
};

module.exports = initCronJobs;

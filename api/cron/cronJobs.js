const cron = require('node-cron');
const twilioController = require('../controllers/twilioController');

/**
 * Initializes all background cron jobs for the application.
 */
const initCronJobs = () => {
  // Run every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', () => {
    console.log("[CRON] Running 5-minute low stock check...");
    // Call controller without req/res objects
    twilioController.sendLowStockAlert();
  });
  
  console.log("Cron jobs initialized.");
};

module.exports = initCronJobs;

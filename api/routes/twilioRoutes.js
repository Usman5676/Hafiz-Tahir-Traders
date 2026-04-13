const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

// POST /api/send-sms-alert
router.post('/send-sms-alert', twilioController.sendLowStockAlert);

module.exports = router;

const twilio = require('twilio');

let client = null;

try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken && accountSid !== 'your_account_sid') {
    client = twilio(accountSid, authToken);
  } else {
    console.warn("⚠️ Twilio Credentials not found or invalid in .env. SMS capabilities are disabled.");
  }
} catch (error) {
  console.error("Error initializing Twilio client:", error.message);
}

module.exports = client;

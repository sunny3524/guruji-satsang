const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion, Browsers } = require("@whiskeysockets/baileys");
const express = require("express");
const cors = require("cors");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Create Express Server
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.WHATSAPP_API_SECRET || "change_this_to_a_secure_token_123456!";

// Socket variable to hold the active WhatsApp connection
let sock = null;
let isConnected = false;

// Custom Logger with Pino (filtered for minimal clutter)
const logger = pino({ level: "info" });

/**
 * Main function to initialize and maintain the WhatsApp connection socket
 */
async function connectToWhatsApp() {
  const authFolder = path.join(__dirname, "auth_info_multi");
  
  // Ensure the authentication directory exists
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  logger.info("Fetching latest WhatsApp Web version...");
  // Fetch latest WhatsApp web version or fall back to a safe standard version if offline/blocked
  const { version, isLatest } = await fetchLatestWaWebVersion()
    .catch(() => {
      logger.warn("Could not fetch latest WhatsApp version. Using default fallback.");
      return { version: [2, 3000, 1015901307], isLatest: false };
    });

  logger.info(`Initializing WhatsApp socket connection using version ${version.join(".")} (isLatest: ${isLatest})...`);

  sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.macOS("Desktop"), // Mimics a standard desktop browser
    printQRInTerminal: false,
    logger: pino({ level: "silent" }), // Mute internal Baileys clutter
    connectTimeoutMs: 60000,          // Wait up to 60 seconds for handshake
    keepAliveIntervalMs: 30000        // Ping WhatsApp servers every 30 seconds
  });

  // Save auth credentials whenever updated
  sock.ev.on("creds.update", saveCreds);

  // Monitor connection updates
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("==================================================================");
      logger.info("⚠️ ACTION REQUIRED: Please scan the QR code below using your physical");
      logger.info("WhatsApp app (Settings -> Linked Devices -> Link a Device):");
      logger.info("==================================================================");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      isConnected = false;
      // Calculate whether to reconnect based on the disconnect reason
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      logger.error(`Connection closed due to: ${lastDisconnect?.error || "Unknown Error"}`);
      logger.info(`Reconnect decision: ${shouldReconnect ? "RECONNECTING" : "STOPPED (LOGGED OUT)"}`);

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000); // Wait 5 seconds and reconnect
      } else {
        logger.warn("❌ WhatsApp Session expired or logged out. Please delete the 'auth_info_multi' directory and restart the daemon to scan a new QR code.");
      }
    } else if (connection === "open") {
      isConnected = true;
      logger.info("==================================================================");
      logger.info("🎉 JAI GURUJI! WhatsApp Daemon is successfully connected and online!");
      logger.info("==================================================================");
    }
  });
}

// ── Express API Endpoints ──────────────────────────────────────────────────────

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    whatsappConnected: isConnected,
    timestamp: new Date().toISOString()
  });
});

/**
 * OTP Sender Endpoint (Invoked securely by Cloud Functions)
 */
app.post("/send-otp", async (req, res) => {
  const authHeader = req.headers["authorization"];
  
  // 1. Verify Shared Secret Authorization
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== API_SECRET) {
    logger.warn(`Unauthorized access attempt blocked from IP: ${req.ip}`);
    return res.status(401).json({ success: false, error: "Unauthorized access: Invalid secret token." });
  }

  const { phone, message } = req.body;

  // 2. Validate parameters
  if (!phone || !message) {
    return res.status(400).json({ success: false, error: "Missing required parameters: phone and message." });
  }

  // 3. Verify connection status
  if (!sock || !isConnected) {
    logger.error("OTP send failed: WhatsApp client is not connected.");
    return res.status(503).json({ success: false, error: "WhatsApp daemon is offline. Please scan QR and verify connection." });
  }

  try {
    // 4. Format phone number to WhatsApp E.164 JID format
    // WhatsApp requires numbers to end with '@s.whatsapp.net', without '+' or leading zeros
    const cleanNumber = phone.replace(/[^\d]/g, ""); // Extract only digits
    const jid = `${cleanNumber}@s.whatsapp.net`;

    logger.info(`Sending OTP to ${phone}...`);

    // 5. Send WhatsApp Text Message
    await sock.sendMessage(jid, { text: message });

    logger.info(`OTP successfully delivered to ${phone}!`);
    return res.json({ success: true, messageId: jid });
  } catch (error) {
    logger.error(`Failed to send WhatsApp message to ${phone}:`, error);
    return res.status(500).json({ success: false, error: `WhatsApp API send failure: ${error.message}` });
  }
});

// Launch the Express Server and start WhatsApp Socket
app.listen(PORT, () => {
  logger.info(`==================================================================`);
  logger.info(`🚀 Express API server running on port: ${PORT}`);
  logger.info(`🔒 Authorization header key: Bearer [YOUR_API_SECRET]`);
  logger.info(`==================================================================`);
  
  connectToWhatsApp().catch(err => {
    logger.error("Initialization error in connectToWhatsApp:", err);
  });
});

require("dotenv").config();

const dns = require("node:dns");
const mongoose = require("mongoose");
const app = require("./app");
const {
  verifyEmailTransport,
} = require("./services/email.service");

/* Prefer IPv4 for provider connections. */
dns.setDefaultResultOrder("ipv4first");

const PORT = Number(process.env.PORT || 5050);

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from the backend .env file"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    try {
      await verifyEmailTransport();
    } catch (emailError) {
      console.warn(
        "⚠️ Email transport verification failed. The API will still start:",
        emailError.message
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup Error:");
    console.error(error);
    process.exit(1);
  }
}

startServer();
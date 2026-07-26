require("dotenv").config();

const dns = require("node:dns");

// Force Node.js to prefer IPv4 before loading app services.
dns.setDefaultResultOrder("ipv4first");

const mongoose = require("mongoose");
const app = require("./app");

const providerManager = require(
  "./services/providers/providerManager"
);

const smsBower = require(
  "./services/providers/smsBower"
);

const {
  verifyEmailTransport,
} = require("./services/email.service");

const PORT = Number(
  process.env.PORT || 5050
);

/*
 * Test provider health
 */
app.get(
  "/api/test-provider",
  async (req, res) => {
    try {
      const balances =
        await providerManager.getProviderBalances();

      return res.json({
        success: true,
        balances,
      });
    } catch (error) {
      console.error(
        "Provider health test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  }
);

/*
 * Test provider pricing
 */
app.get(
  "/api/test-price",
  async (req, res) => {
    try {
      const quote =
        await providerManager.getPrice({
          country:
            req.query.country || "usa",
          service:
            req.query.service ||
            "telegram",
        });

      return res.json({
        success: true,
        quote,
      });
    } catch (error) {
      console.error(
        "Provider price test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
          code: error.code,
          provider: error.provider,
        });
    }
  }
);

/*
 * BenOTP services test
 */
app.get(
  "/api/benotp/services",
  async (req, res) => {
    try {
      const benOtp = require(
        "./services/providers/benOtp"
      );

      const services =
        await benOtp.getServices();

      return res.json({
        success: true,
        services,
      });
    } catch (error) {
      console.error(
        "BenOTP services test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  }
);

/*
 * BenOTP countries test
 */
app.get(
  "/api/benotp/countries",
  async (req, res) => {
    try {
      const benOtp = require(
        "./services/providers/benOtp"
      );

      const countries =
        await benOtp.getCountries();

      return res.json({
        success: true,
        countries,
      });
    } catch (error) {
      console.error(
        "BenOTP countries test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  }
);

/*
 * SMSBower balance test
 */
app.get(
  "/api/test-smsbower-balance",
  async (req, res) => {
    try {
      const result =
        await smsBower.getBalance();

      return res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error(
        "Direct SMSBower test failed:",
        {
          message: error.message,
          code: error.code,
          status: error.status,
          rawResponse:
            error.rawResponse,
        }
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
          code: error.code,
          rawResponse:
            error.rawResponse,
        });
    }
  }
);

const smsBowerKey = String(
  process.env.SMSBOWER_API_KEY || ""
).trim();

console.log("SMSBower config:", {
  keyPresent: Boolean(smsBowerKey),
  keyLength: smsBowerKey.length,
  keyStartsWithHttp:
    smsBowerKey.startsWith("http"),
  baseUrl:
    process.env.SMSBOWER_BASE_URL,
});

/*
 * SMSBower services test
 */
app.get(
  "/api/debug/services",
  async (req, res) => {
    try {
      const services =
        await smsBower.getServices();

      return res.json({
        success: true,
        services,
      });
    } catch (error) {
      console.error(
        "SMSBower services test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  }
);

/*
 * Test buying a number
 */
app.get(
  "/api/test-buy",
  async (req, res) => {
    try {
      const order =
        await providerManager.buyNumber({
          country:
            req.query.country || "usa",

          service:
            req.query.service ||
            "telegram",

          provider:
            req.query.provider ||
            "benotp",
        });

      return res.json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Provider purchase test failed:",
        error
      );

      return res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.message,
          code: error.code,
          provider: error.provider,
        });
    }
  }
);

/*
 * Start server
 */
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from the backend .env file"
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("✅ MongoDB Connected");

    /*
     * SMTP failure should not stop the
     * entire API from starting.
     */
    await verifyEmailTransport();

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Startup Error:");
    console.error(error);

    process.exit(1);
  }
}

startServer();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const adminRoutes = require("./routes/adminRoutes");
const adminPricingRoutes = require("./routes/adminPricingRoutes");
const walletRoutes = require("./routes/walletRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/payment");
const catalogRoutes = require("./routes/catalogRoutes");

const app = express();

const isProduction =
  process.env.NODE_ENV === "production";

const defaultOrigins = [
  "https://chapssms.com",
  "https://www.chapssms.com",
  "https://chapsms-web.vercel.app",
  "http://localhost:3000",
];

const environmentOrigins = String(
  process.env.CORS_ORIGINS ||
    process.env.CLIENT_URL ||
    ""
)
  .split(",")
  .map((origin) =>
    origin
      .trim()
      .replace(/\/+$/, "")
  )
  .filter(Boolean);

const configuredOrigins = [
  ...new Set([
    ...defaultOrigins,
    ...environmentOrigins,
  ]),
];

console.log(
  "Allowed CORS origins:",
  configuredOrigins
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin =
      String(origin)
        .trim()
        .replace(/\/+$/, "");

    if (
      configuredOrigins.includes(
        normalizedOrigin
      )
    ) {
      return callback(null, true);
    }

    if (
      !isProduction &&
      configuredOrigins.length === 0
    ) {
      return callback(null, true);
    }

    console.error(
      "Blocked by CORS:",
      normalizedOrigin
    );

    const error = new Error(
      `CORS blocked origin: ${normalizedOrigin}`
    );

    error.status = 403;
    error.code =
      "CORS_ORIGIN_BLOCKED";

    return callback(error);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "flutterwave-signature",
    "verif-hash",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
/*
 * Keep this section. It captures the original
 * Flutterwave webhook request body.
 */
app.use(
  express.json({
    limit: "1mb",

    verify(req, _res, buffer) {
      if (
        req.originalUrl ===
        "/api/payment/webhook"
      ) {
        req.rawBody =
          buffer.toString("utf8");
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "🚀 ChapsSmS API is running...",
  });
});

app.get(
  "/api/cors-test",
  (req, res) => {
    res.json({
      success: true,
      origin:
        req.headers.origin ||
        null,
      allowedOrigins:
        configuredOrigins,
      message:
        "CORS is working",
    });
  }
);

app.use(
  "/api/admin/pricing",
  adminPricingRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/wallet",
  walletRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/payment",
  paymentRoutes
);

app.use(
  "/api/catalog",
  catalogRoutes
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(
  (error, _req, res, _next) => {
    console.error(
      "Unhandled API error:",
      error
    );

    res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Internal server error",
        code:
          error.code ||
          "INTERNAL_SERVER_ERROR",
      });
  }
);

module.exports = app;
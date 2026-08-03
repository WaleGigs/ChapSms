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

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "🚀 ChapsSmS API is running...",
  });
});

app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    origin: req.headers.origin || null,
    message: "CORS is working",
  });
});

app.use("/api/admin/pricing", adminPricingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/catalog", catalogRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    code: error.code || "INTERNAL_SERVER_ERROR",
  });
});

module.exports = app;
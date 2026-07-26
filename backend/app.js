const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const adminRoutes = require("./routes/adminRoutes");
const walletRoutes = require("./routes/walletRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/payment");
const catalogRoutes = require("./routes/catalogRoutes");
const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/admin", adminRoutes);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 ChapsSmS API is running...",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/catalog", catalogRoutes);
module.exports = app;
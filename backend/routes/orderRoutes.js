const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getOrder,
  checkOrder,
  cancelOrder,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);

router.get("/:id/check", protect, checkOrder);
router.post("/:id/cancel", protect, cancelOrder);
router.get("/:id", protect, getOrder);

module.exports = router;
const express = require("express");
const {
  createOrder,
  getOrders,
  getOrder,
  checkOrder,
  cancelOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);
router.get("/:id/check", protect, checkOrder);
router.post("/:id/cancel", protect, cancelOrder);
router.get("/:id", protect, getOrder);

module.exports = router;
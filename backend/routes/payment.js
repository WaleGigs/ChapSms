const express = require("express");

const router = express.Router();

const {
  initializePayment,
  verifyPayment,
  handleWebhook: handleFlutterwaveWebhook,
} = require("../controllers/paymentController");

const {
  getVirtualAccount,
  createVirtualAccount,
  verifyTransaction: verifyNeuraPayTransaction,
  handleWebhook: handleNeuraPayWebhook,
} = require("../controllers/neurapayController");

const {
  protect,
} = require("../middleware/authMiddleware");

/*
 * ============================================================
 * FLUTTERWAVE
 * ============================================================
 * Keep the existing endpoint so your current Flutterwave dashboard
 * configuration continues to work:
 *
 *   POST /api/payment/webhook
 */
router.post(
  "/webhook",
  handleFlutterwaveWebhook,
);

router.post(
  "/initialize",
  protect,
  initializePayment,
);

router.post(
  "/verify",
  protect,
  verifyPayment,
);

/*
 * ============================================================
 * NEURAPAY
 * ============================================================
 * Configure NeuraPay Webhook URL as:
 *
 *   https://YOUR-BACKEND/api/payment/neurapay/webhook
 */
router.post(
  "/neurapay/webhook",
  handleNeuraPayWebhook,
);

router.get(
  "/neurapay/account",
  protect,
  getVirtualAccount,
);

router.post(
  "/neurapay/account",
  protect,
  createVirtualAccount,
);

router.post(
  "/neurapay/verify",
  protect,
  verifyNeuraPayTransaction,
);

module.exports = router;
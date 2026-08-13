const express = require("express");

const router = express.Router();

const {
  initializePayment,
  verifyPayment,
  getPaymentStatus,
  handleWebhook,
} = require("../controllers/paymentController");

const {
  protect,
} = require("../middleware/authMiddleware");

/*
 * Flutterwave calls this endpoint directly, so do not add protect here.
 *
 * The controller exports handleWebhook. A flutterwaveWebhook compatibility
 * alias is also included in the updated controller.
 */
router.post(
  "/webhook",
  handleWebhook
);

router.post(
  "/initialize",
  protect,
  initializePayment
);

router.post(
  "/verify",
  protect,
  verifyPayment
);

router.get(
  "/status/:txRef",
  protect,
  getPaymentStatus
);

module.exports = router;

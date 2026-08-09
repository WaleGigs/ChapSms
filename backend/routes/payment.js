const express = require("express");

const router = express.Router();

const {
  initializePayment,
  initializeBankTransfer,
  getBankTransferStatus,
  verifyPayment,
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
  "/bank-transfer",
  protect,
  initializeBankTransfer
);

router.get(
  "/bank-transfer/:txRef/status",
  protect,
  getBankTransferStatus
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

module.exports = router;
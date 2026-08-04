const axios = require("axios");
const crypto = require("node:crypto");

const Payment = require("../models/Payment");
const Wallet = require("../models/Wallet");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function requireEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const error = new Error(`${name} is missing from the backend environment`);
    error.status = 500;
    error.code = "PAYMENT_CONFIGURATION_ERROR";
    throw error;
  }
  return value;
}

function createTransactionReference(userId) {
  return `CHAPSMS-${userId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

function normalizePaymentMethod(value) {
  return String(value || "bank").toLowerCase() === "card" ? "card" : "bank";
}

function getPaymentOptions(paymentMethod) {
  return paymentMethod === "card"
    ? "card"
    : "banktransfer,account,internetbanking";
}

function getCustomerName(user) {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return user?.username || fullName || "ChapsSmS User";
}

async function fetchFlutterwaveTransaction(transactionId) {
  const secretKey = requireEnvironment("FLW_SECRET_KEY");

  const response = await axios.get(
    `${FLW_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    },
  );

  return response.data?.data;
}

function isValidTransaction(transaction, payment) {
  return Boolean(
    transaction &&
      transaction.status === "successful" &&
      String(transaction.tx_ref) === String(payment.txRef) &&
      String(transaction.currency).toUpperCase() === payment.currency &&
      Number(transaction.amount) >= Number(payment.amount),
  );
}

async function markPaymentFailed(payment, reason) {
  payment.status = "failed";
  payment.failureReason = String(reason || "Payment verification failed");
  await payment.save();
}

async function creditVerifiedPayment({ payment, transaction }) {
  if (payment.credited) {
    const existingWallet = await Wallet.findOne({ user: payment.user });
    return {
      alreadyCredited: true,
      wallet: existingWallet,
    };
  }

  const transactionId = String(transaction.id || "");

  /*
   * The reference filter makes wallet credit idempotent. MongoDB rechecks
   * the filter atomically, so duplicate callbacks/webhooks cannot add the
   * same deposit twice.
   */
  const wallet = await Wallet.findOneAndUpdate(
    {
      user: payment.user,
      "transactions.reference": { $ne: payment.txRef },
    },
    {
      $inc: { balance: payment.amount },
      $push: {
        transactions: {
          $each: [
            {
              type: "deposit",
              amount: payment.amount,
              description: `Flutterwave wallet funding: ₦${payment.amount.toLocaleString("en-NG")}`,
              status: "completed",
              reference: payment.txRef,
              transactionId,
              paymentGateway: "flutterwave",
              currency: payment.currency,
              paymentMethod: payment.paymentMethod,
            },
          ],
          $position: 0,
        },
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!wallet) {
    const existingWallet = await Wallet.findOne({ user: payment.user });

    if (!existingWallet) {
      const error = new Error("Wallet not found");
      error.status = 404;
      throw error;
    }

    const transactionExists = existingWallet.transactions.some(
      (item) => String(item.reference || "") === payment.txRef,
    );

    if (!transactionExists) {
      const error = new Error("Wallet could not be credited");
      error.status = 500;
      throw error;
    }

    payment.flutterwaveId = transactionId;
    payment.status = "successful";
    payment.credited = true;
    payment.verifiedAt = new Date();
    payment.failureReason = "";
    await payment.save();

    return {
      alreadyCredited: true,
      wallet: existingWallet,
    };
  }

  payment.flutterwaveId = transactionId;
  payment.status = "successful";
  payment.credited = true;
  payment.verifiedAt = new Date();
  payment.failureReason = "";
  await payment.save();

  return {
    alreadyCredited: false,
    wallet,
  };
}

async function verifyAndCredit({ transactionId, txRef, userId = null }) {
  const paymentQuery = { txRef };
  if (userId) paymentQuery.user = userId;

  const payment = await Payment.findOne(paymentQuery);
  if (!payment) {
    const error = new Error("Payment record not found");
    error.status = 404;
    error.code = "PAYMENT_NOT_FOUND";
    throw error;
  }

  const transaction = await fetchFlutterwaveTransaction(transactionId);

  if (!isValidTransaction(transaction, payment)) {
    await markPaymentFailed(payment, "Flutterwave transaction details did not match");
    const error = new Error("Payment verification failed");
    error.status = 400;
    error.code = "PAYMENT_VERIFICATION_FAILED";
    throw error;
  }

  const result = await creditVerifiedPayment({ payment, transaction });

  return {
    ...result,
    payment,
    transaction,
  };
}

exports.initializePayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum funding amount is 100",
      });
    }

    const publicKey = requireEnvironment("FLW_PUBLIC_KEY");
    requireEnvironment("FLW_SECRET_KEY");

    const txRef = createTransactionReference(req.user._id);

    const payment = await Payment.create({
      user: req.user._id,
      txRef,
      amount,
      currency: "NGN",
      paymentMethod,
      status: "pending",
      credited: false,
    });

    return res.status(200).json({
      success: true,
      txRef,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod,
      paymentOptions: getPaymentOptions(paymentMethod),
      publicKey,
      customer: {
        email: req.user.email,
        name: getCustomerName(req.user),
      },
      meta: {
        userId: String(req.user._id),
        paymentId: String(payment._id),
      },
    });
  } catch (error) {
    console.error("Flutterwave initialization error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to initialize payment",
      code: error.code || "PAYMENT_INITIALIZATION_FAILED",
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const transactionId = req.body.transactionId;
    const txRef = String(req.body.txRef || "").trim();

    if (!transactionId || !txRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID and reference are required",
      });
    }

    const result = await verifyAndCredit({
      transactionId,
      txRef,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyCredited
        ? "Payment already credited"
        : "Wallet funded successfully",
      amountCredited: result.payment.amount,
      currency: result.payment.currency,
      walletBalance: result.wallet?.balance || 0,
    });
  } catch (error) {
    console.error(
      "Flutterwave verification error:",
      error.response?.data || error.message,
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to verify payment",
      code: error.code || "PAYMENT_VERIFICATION_ERROR",
    });
  }
};

function isValidWebhookSignature(req) {
  const secretHash = requireEnvironment("FLW_SECRET_HASH");
  const modernSignature = req.headers["flutterwave-signature"];

  if (modernSignature && req.rawBody) {
    const expected = crypto
      .createHmac("sha256", secretHash)
      .update(req.rawBody)
      .digest("base64");

    const left = Buffer.from(String(modernSignature));
    const right = Buffer.from(expected);

    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  /* Compatibility with older Flutterwave webhook configuration. */
  const legacySignature = req.headers["verif-hash"];
  return Boolean(legacySignature && legacySignature === secretHash);
}

exports.handleWebhook = async (req, res) => {
  try {
    if (!isValidWebhookSignature(req)) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    }

    const payload = req.body || {};
    const data = payload.data || payload;
    const status = String(data.status || "").toLowerCase();
    const txRef = String(data.tx_ref || data.txRef || "").trim();
    const transactionId = data.id || data.transaction_id;

    if (status !== "successful" || !txRef || !transactionId) {
      return res.sendStatus(200);
    }

    await verifyAndCredit({ transactionId, txRef });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Flutterwave webhook error:", error.response?.data || error.message);

    /*
     * Return a failure for transient errors so Flutterwave can retry.
     * Invalid/mismatched payments are acknowledged because retrying cannot fix them.
     */
    if (error.status && error.status < 500) {
      return res.sendStatus(200);
    }

    return res.sendStatus(500);
  }
};

/*
 * Compatibility alias for route files that use the older handler name.
 */
exports.flutterwaveWebhook =
  exports.handleWebhook;


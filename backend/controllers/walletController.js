const Wallet = require("../models/Wallet");

const FLUTTERWAVE_VERIFY_URL =
  "https://api.flutterwave.com/v3/transactions";

exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      user: req.user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    return res.status(200).json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve wallet",
    });
  }
};

exports.verifyFlutterwavePayment = async (req, res) => {
  try {
    const { transactionId, expectedAmount, reference } = req.body;

    const numericTransactionId = Number(transactionId);
    const numericExpectedAmount = Number(expectedAmount);

    if (
      !Number.isInteger(numericTransactionId) ||
      numericTransactionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Flutterwave transaction ID is required",
      });
    }

    if (
      !Number.isFinite(numericExpectedAmount) ||
      numericExpectedAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid expected amount is required",
      });
    }

    if (!reference || typeof reference !== "string") {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    if (!process.env.FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY is missing");

      return res.status(500).json({
        success: false,
        message: "Payment verification is not configured",
      });
    }

    const wallet = await Wallet.findOne({
      user: req.user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const existingTransaction =
      wallet.transactions.find(
        (transaction) =>
          transaction.transactionId === numericTransactionId ||
          transaction.reference === reference
      );

    if (existingTransaction) {
      return res.status(200).json({
        success: true,
        message: "Payment has already been processed",
        alreadyProcessed: true,
        wallet,
      });
    }

    const flutterwaveResponse = await fetch(
      `${FLUTTERWAVE_VERIFY_URL}/${numericTransactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const verificationResult =
      await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok) {
      console.error(
        "Flutterwave verification failed:",
        verificationResult
      );

      return res.status(502).json({
        success: false,
        message:
          verificationResult?.message ||
          "Unable to verify payment with Flutterwave",
      });
    }

    const payment = verificationResult?.data;

    const paymentIsValid =
      payment &&
      payment.status === "successful" &&
      payment.currency === "NGN" &&
      Number(payment.amount) >= numericExpectedAmount &&
      payment.tx_ref === reference;

    if (!paymentIsValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const customerEmail =
      payment.customer?.email?.trim().toLowerCase();

    const authenticatedEmail =
      req.user.email?.trim().toLowerCase();

    if (
      customerEmail &&
      authenticatedEmail &&
      customerEmail !== authenticatedEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment customer does not match the authenticated user",
      });
    }

    const amountToCredit = numericExpectedAmount;

    wallet.balance += amountToCredit;

    wallet.transactions.unshift({
      type: "deposit",
      amount: amountToCredit,
      description: "Wallet funding via Flutterwave",
      status: "completed",
      reference: payment.tx_ref,
      transactionId: payment.id,
      paymentGateway: "flutterwave",
      currency: payment.currency,
      paymentMethod: payment.payment_type || "",
    });

    await wallet.save();

    return res.status(200).json({
      success: true,
      message: "Wallet funded successfully",
      wallet,
    });
  } catch (error) {
    console.error(
      "Flutterwave payment verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      user: req.user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    return res.status(200).json({
      success: true,
      transactions: wallet.transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve transactions",
    });
  }
};
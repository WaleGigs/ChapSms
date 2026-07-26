const axios = require("axios");
const crypto = require("crypto");

const Payment = require("../models/Payment");
const Wallet = require("../models/Wallet");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function createTransactionReference(userId) {
  return `CHAPSMS-${userId}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

exports.initializePayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum funding amount is 100",
      });
    }

    const txRef = createTransactionReference(req.user._id);

    const payment = await Payment.create({
      user: req.user._id,
      txRef,
      amount,
      currency: "NGN",
      status: "pending",
      credited: false,
    });

    const redirectUrl = `${process.env.CLIENT_URL}/wallet/payment-callback`;

    const response = await axios.post(
      `${FLW_BASE_URL}/payments`,
      {
        tx_ref: txRef,
        amount,
        currency: "NGN",
        redirect_url: redirectUrl,

        customer: {
          email: req.user.email,
          name: `${req.user.firstName || ""} ${
            req.user.lastName || ""
          }`.trim(),
        },

        customizations: {
          title: "ChapsSmS Wallet Funding",
          description: "Fund your ChapsSmS wallet",
        },

        meta: {
          userId: String(req.user._id),
          paymentId: String(payment._id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentLink = response.data?.data?.link;

    if (!paymentLink) {
      payment.status = "failed";
      await payment.save();

      return res.status(502).json({
        success: false,
        message: "Flutterwave did not return a payment link",
      });
    }

    return res.status(200).json({
      success: true,
      paymentLink,
      txRef,
    });
  } catch (error) {
    console.error(
      "Flutterwave initialization error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to initialize payment",
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const transactionId = req.body.transactionId;
    const txRef = req.body.txRef;

    if (!transactionId || !txRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID and reference are required",
      });
    }

    const payment = await Payment.findOne({
      txRef,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const transaction = response.data?.data;

    const validPayment =
      transaction &&
      transaction.status === "successful" &&
      transaction.tx_ref === payment.txRef &&
      transaction.currency === payment.currency &&
      Number(transaction.amount) >= Number(payment.amount);

    if (!validPayment) {
      payment.status = "failed";
      await payment.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    if (payment.credited) {
      const existingWallet = await Wallet.findOne({
        user: req.user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Payment already credited",
        walletBalance: existingWallet?.balance || 0,
      });
    }

    const wallet = await Wallet.findOneAndUpdate(
  {
    user: req.user._id,
  },
  {
    $inc: {
      balance: payment.amount,
    },

    $push: {
      transactions: {
        $each: [
          {
            type: "deposit",
            amount: payment.amount,
            description: `Flutterwave wallet funding: ₦${payment.amount.toLocaleString()}`,
            status: "completed",
          },
        ],
        $position: 0,
      },
    },
  },
  {
    new: true,
    runValidators: true,
  }
);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    payment.flutterwaveId = String(transaction.id);
    payment.status = "successful";
    payment.credited = true;

    await payment.save();

    return res.status(200).json({
  success: true,
  message: "Wallet funded successfully",
  amountCredited: payment.amount,
  currency: "NGN",
  walletBalance: wallet.balance,
});
  } catch (error) {
    console.error(
      "Flutterwave verification error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to verify payment",
    });
  }
};
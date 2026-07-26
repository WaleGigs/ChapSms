const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund", "withdraw"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    reference: {
      type: String,
      trim: true,
    },

    transactionId: {
      type: Number,
    },

    paymentGateway: {
      type: String,
      enum: ["flutterwave"],
    },

    currency: {
      type: String,
      enum: ["NGN"],
      default: "NGN",
    },

    paymentMethod: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN"],
    },

    transactions: [transactionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", walletSchema);
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
      uppercase: true,
    },
    transactionId: {
      type: String,
      trim: true,
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
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    server: {
      type: String,
      enum: ["server1", "server2"],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
      index: true,
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
    versionKey: false,
  },
);

walletSchema.index({ "transactions.reference": 1 });
walletSchema.index({ "transactions.transactionId": 1 });

walletSchema.virtual("formattedBalance").get(function formattedBalance() {
  return this.balance.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
});

walletSchema.set("toJSON", { virtuals: true });
walletSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Wallet", walletSchema);

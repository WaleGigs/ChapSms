const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    txRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    flutterwaveId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
    },
    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN"],
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank", "card"],
      default: "bank",
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
      index: true,
    },
    credited: {
      type: Boolean,
      default: false,
      index: true,
    },
    failureReason: {
      type: String,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Payment", paymentSchema);
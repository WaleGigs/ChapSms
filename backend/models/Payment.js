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
    },

    flutterwaveId: {
      type: String,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },

    credited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
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
      trim: true,
      uppercase: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 100,
    },

    currency: {
      type: String,
      enum: ["NGN"],
      default: "NGN",
    },

    paymentMethod: {
      type: String,
      enum: ["card", "bank"],
      default: "bank",
    },

    /*
     * The mode is saved when payment is initialized.
     * This prevents a pending test payment from being credited as live money
     * after an environment-variable change.
     */
    environment: {
      type: String,
      enum: ["test", "live"],
      required: true,
      default: "test",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "successful",
        "failed",
      ],
      default: "pending",
      index: true,
    },

    credited: {
      type: Boolean,
      default: false,
      index: true,
    },

    flutterwaveId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index({
  user: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.Payment ||
  mongoose.model(
    "Payment",
    paymentSchema,
  );

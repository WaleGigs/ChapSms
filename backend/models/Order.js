const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    customerName: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    countryName: {
      type: String,
      default: "",
      trim: true,
    },

    service: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    serviceName: {
      type: String,
      default: "",
      trim: true,
    },

    operator: {
      type: String,
      default: "any",
      trim: true,
      lowercase: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    otpCode: {
      type: String,
      default: "",
      trim: true,
    },

    sms: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "waiting",
        "cancelling",
        "received",
        "expired",
        "cancelled",
      ],
      default: "waiting",
      index: true,
    },

    /*
     * Legacy customer-facing amount.
     * Keep this equal to sellingPrice.
     */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /* Provider price in the provider's original currency. */
    providerPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    providerCurrency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true,
    },

    /* Provider cost converted to naira at purchase time. */
    providerCostNgn: {
      type: Number,
      required: true,
      min: 0,
    },

    /* sellingPrice - providerCostNgn */
    profit: {
      type: Number,
      required: true,
      default: 0,
    },

    financialStatus: {
      type: String,
      enum: ["charged", "earned", "refunded"],
      default: "charged",
      index: true,
    },

    pricingRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingRule",
      default: null,
    },

    pricingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },


    paymentEnvironment: {
      type: String,
      enum: ["test", "live"],
      default: "live",
      index: true,
    },

    walletBalanceField: {
      type: String,
      enum: ["testBalance", "balance"],
      default: "balance",
    },

    walletReservationReference: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },

    server: {
      type: String,
      enum: ["server1", "server2"],
      required: true,
      index: true,
    },

    /* Internal provider identity. Never expose to customers. */
    provider: {
      type: String,
      enum: ["smsbower", "benotp"],
      required: true,
      select: true,
    },

    providerOrderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    refunded: {
      type: Boolean,
      default: false,
      index: true,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    otpReceivedAt: {
      type: Date,
      default: null,
    },

    providerStatus: {
      type: String,
      default: "STATUS_WAIT_CODE",
    },

    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    providerLastCheckedAt: {
      type: Date,
      default: null,
    },

    providerCancelledAt: {
      type: Date,
      default: null,
    },

    providerFinishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ server: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ refunded: 1, createdAt: -1 });

function hidePrivateProviderFields(_doc, ret) {
  delete ret.provider;
  delete ret.providerResponse;
  return ret;
}

orderSchema.set("toJSON", {
  transform: hidePrivateProviderFields,
});

orderSchema.set("toObject", {
  transform: hidePrivateProviderFields,
});

module.exports = mongoose.model("Order", orderSchema);

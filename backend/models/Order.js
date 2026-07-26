const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    service: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    otpCode: {
      type: String,
      default: "",
    },

    sms: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["waiting", "received", "expired", "cancelled"],
      default: "waiting",
    },

    price: {
      type: Number,
      required: true,
    },
operator: {
  type: String,
  default: "any",
  trim: true,
},
   provider: {
    type: String,
    enum: [
        "smsbower",
        "benotp"
    ],
    required: true
},

   providerOrderId: {
    type: String,
    required: true
},
    providerPrice: {
  type: Number,
  default: 0,
},

providerCurrency: {
  type: String,
  default: "USD",
},

refunded: {
  type: Boolean,
  default: false,
},

refundedAt: {
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
  }
);

module.exports = mongoose.model("Order", orderSchema);
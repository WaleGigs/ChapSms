const mongoose = require("mongoose");

const TRANSACTION_TYPES = [
  "deposit",
  "purchase",
  "refund",
  "withdraw",
];

const TRANSACTION_STATUSES = [
  "pending",
  "completed",
  "failed",
];

const TRANSACTION_ENVIRONMENTS = [
  "test",
  "live",
];

const BALANCE_FIELDS = [
  "testBalance",
  "balance",
];

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * live:
     *   Verified live Flutterwave payment or real SMS purchase.
     *
     * test:
     *   Flutterwave test payment. Test money must never pay a real provider.
     */
    environment: {
      type: String,
      enum: TRANSACTION_ENVIRONMENTS,
      required: true,
      default: "live",
    },

    /*
     * Records the exact balance changed by this transaction.
     */
    balanceField: {
      type: String,
      enum: BALANCE_FIELDS,
      required: true,
      default: "balance",
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
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
      default: null,
    },

    currency: {
      type: String,
      enum: ["NGN"],
      default: "NGN",
    },

    paymentMethod: {
      type: String,
      default: "",
      trim: true,
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

    /*
     * Real-money balance.
     *
     * Only verified Flutterwave LIVE payments may increase this field.
     * Real SMSBower/BenOTP purchases deduct only from this field.
     */
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * Development balance.
     *
     * Flutterwave TEST payments increase this field.
     * It is deliberately separated from real-money balance.
     */
    testBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN"],
    },

    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

walletSchema.index({
  "transactions.reference": 1,
});

walletSchema.index({
  "transactions.transactionId": 1,
});

walletSchema.index({
  "transactions.environment": 1,
});

walletSchema.virtual(
  "formattedBalance",
).get(function formattedBalance() {
  return Number(
    this.balance || 0,
  ).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
});

walletSchema.virtual(
  "formattedTestBalance",
).get(function formattedTestBalance() {
  return Number(
    this.testBalance || 0,
  ).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
});

walletSchema.methods.getBalanceForEnvironment =
  function getBalanceForEnvironment(
    environment,
  ) {
    return environment === "live"
      ? Number(this.balance || 0)
      : Number(this.testBalance || 0);
  };

walletSchema.set("toJSON", {
  virtuals: true,
});

walletSchema.set("toObject", {
  virtuals: true,
});

module.exports =
  mongoose.models.Wallet ||
  mongoose.model(
    "Wallet",
    walletSchema,
  );

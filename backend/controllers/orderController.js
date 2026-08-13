const crypto = require("node:crypto");

const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const providerManager = require(
  "../services/providers/providerManager"
);
const pricingService = require(
  "../services/pricingService"
);

const VALID_SERVERS = ["server1", "server2"];

function normalizeCountry(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeService(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeOperator(value) {
  return String(value || "any").trim().toLowerCase() || "any";
}

function normalizeServer(value) {
  return String(value || "").trim().toLowerCase();
}

function extractProviderError(error) {
  const code = String(error?.code || "").trim().toUpperCase();

  const messages = {
    NO_PRICE:
      "ChapsSms does not currently have a live price for this selection.",
    NO_NUMBERS:
      "ChapsSms does not currently have a number available for this selection.",
    NO_STOCK:
      "ChapsSms does not currently have a number available for this selection.",
    INVALID_COUNTRY:
      "This country is not currently supported on ChapsSms.",
    INVALID_SERVICE:
      "This service is not currently supported on ChapsSms.",
    PROVIDER_BALANCE_LOW:
      "ChapsSms service is temporarily unavailable. Please try another server.",
    INVALID_API_KEY:
      "ChapsSms service is temporarily unavailable. Please try again later.",
    INVALID_PRICE:
      "ChapsSms could not retrieve a valid price right now.",
    INVALID_PRICE_RESPONSE:
      "ChapsSms could not retrieve a live price right now.",
    INVALID_UPSTREAM_RESPONSE:
      "ChapsSms received an invalid response from the SMS service. Please try again.",
    EMPTY_RESPONSE:
      "ChapsSms could not complete the request right now.",
    PROVIDER_ERROR:
      "ChapsSms could not complete the request right now.",
    BENOTP_REQUEST_FAILED:
      "ChapsSms could not connect to the SMS service right now.",
    SMSBOWER_REQUEST_FAILED:
      "ChapsSms could not connect to the SMS service right now.",
    INVALID_PURCHASE_RESPONSE:
      "ChapsSms could not complete the number purchase. Please try again.",
  };

  if (messages[code]) {
    return messages[code];
  }

  const rawMessage = String(
    error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      ""
  );

  if (/benotp|ben otp|smsbower|sms bower/i.test(rawMessage)) {
    return "ChapsSms could not complete this request. Please try again.";
  }

  return rawMessage || "ChapsSms could not complete this request. Please try again.";
}

function getPublicOrderErrorCode(
  error,
  fallback = "CHAPSSMS_ORDER_FAILED"
) {
  const code = String(error?.code || "").trim().toUpperCase();

  const safeCodes = new Set([
    "INSUFFICIENT_WALLET_BALANCE",
    "UNSAFE_PAYMENT_CONFIGURATION",
    "INVALID_ENVIRONMENT_MODE",
    "INVALID_SERVER",
    "NO_PRICE",
    "NO_NUMBERS",
    "NO_STOCK",
    "INVALID_COUNTRY",
    "INVALID_SERVICE",
    "INVALID_PRICE",
    "OPERATION_NOT_SUPPORTED",
    "ORDER_NOT_FOUND",
  ]);

  if (safeCodes.has(code)) {
    return code;
  }

  return fallback;
}

function sanitizeOrder(order) {
  if (!order) {
    return order;
  }

  const data =
    typeof order.toObject === "function"
      ? order.toObject()
      : { ...order };

  /*
   * Legacy orders may have been created before serviceName/countryName
   * fields existed. If an older pricing snapshot contains friendly labels,
   * expose them before removing the private pricing snapshot.
   */
  if (!String(data.serviceName || "").trim()) {
    data.serviceName =
      String(
        data.pricingSnapshot?.serviceName ||
          data.pricingSnapshot?.service?.name ||
          ""
      ).trim();
  }

  if (!String(data.countryName || "").trim()) {
    data.countryName =
      String(
        data.pricingSnapshot?.countryName ||
          data.pricingSnapshot?.country?.name ||
          ""
      ).trim();
  }

  delete data.provider;
  delete data.providerResponse;
  delete data.providerPrice;
  delete data.providerCurrency;
  delete data.providerCostNgn;
  delete data.profit;
  delete data.financialStatus;
  delete data.pricingRule;
  delete data.pricingSnapshot;
  delete data.walletBalanceField;
  delete data.walletReservationReference;

  return data;
}

function sanitizeOrders(orders = []) {
  return orders.map(sanitizeOrder);
}

const VALID_ENVIRONMENTS = [
  "test",
  "live",
];

function normalizeEnvironment(
  value,
  fallback,
  variableName,
) {
  const environment =
    String(
      value || fallback,
    )
      .trim()
      .toLowerCase();

  if (
    !VALID_ENVIRONMENTS.includes(
      environment,
    )
  ) {
    const error =
      new Error(
        `${variableName} must be test or live`,
      );

    error.status = 500;
    error.code =
      "INVALID_ENVIRONMENT_MODE";

    throw error;
  }

  return environment;
}

function getPaymentEnvironment() {
  return normalizeEnvironment(
    process.env.PAYMENT_MODE,
    "test",
    "PAYMENT_MODE",
  );
}

function getSmsProviderEnvironment() {
  /*
   * SMSBower and BenOTP are live providers.
   * Defaulting this to live prevents accidental treatment as a mock.
   */
  return normalizeEnvironment(
    process.env.SMS_PROVIDER_MODE,
    "live",
    "SMS_PROVIDER_MODE",
  );
}

function getWalletBalanceField(
  environment,
) {
  return environment === "live"
    ? "balance"
    : "testBalance";
}

function getWalletBalance(
  wallet,
  balanceField,
) {
  return Number(
    wallet?.[balanceField] || 0,
  );
}

function createReservationReference(
  userId,
) {
  return [
    "ORDER",
    userId,
    Date.now(),
    crypto
      .randomBytes(5)
      .toString("hex"),
  ]
    .join("-")
    .toUpperCase();
}

async function refundReservedWallet({
  userId,
  amount,
  balanceField,
  environment,
  reservationReference,
  service,
  country,
  server,
  reason,
}) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount,
    ) ||
    numericAmount <= 0
  ) {
    return null;
  }

  const refundReference =
    `${reservationReference}-REFUND`
      .toUpperCase();

  const wallet =
    await Wallet.findOneAndUpdate(
      {
        user: userId,

        "transactions.reference": {
          $ne:
            refundReference,
        },
      },

      {
        $inc: {
          [balanceField]:
            numericAmount,
        },

        $set: {
          "transactions.$[purchase].status":
            "failed",

          "transactions.$[purchase].description":
            `${reason}: ${service} (${country})`,
        },

        $push: {
          transactions: {
            $each: [
              {
                type:
                  "refund",

                amount:
                  numericAmount,

                environment,

                balanceField,

                description:
                  `${reason}: ${service} (${country})`,

                status:
                  "completed",

                reference:
                  refundReference,

                server,

                currency:
                  "NGN",
              },
            ],

            $position: 0,
          },
        },
      },

      {
        new: true,
        runValidators: true,

        arrayFilters: [
          {
            "purchase.reference":
              reservationReference,
          },
        ],
      },
    );

  if (wallet) {
    return wallet;
  }

  return Wallet.findOne({
    user: userId,
  });
}

async function reconcileReservation({
  userId,
  balanceField,
  reservationReference,
  reservedAmount,
  finalAmount,
}) {
  const difference =
    Number(finalAmount) -
    Number(reservedAmount);

  if (
    !Number.isFinite(
      difference,
    )
  ) {
    const error =
      new Error(
        "Invalid wallet reconciliation amount",
      );

    error.status = 500;
    error.code =
      "INVALID_RECONCILIATION_AMOUNT";

    throw error;
  }

  if (difference > 0) {
    return Wallet.findOneAndUpdate(
      {
        user: userId,

        [balanceField]: {
          $gte: difference,
        },

        "transactions.reference":
          reservationReference,
      },

      {
        $inc: {
          [balanceField]:
            -difference,
        },

        $set: {
          "transactions.$.amount":
            finalAmount,
        },
      },

      {
        new: true,
        runValidators: true,
      },
    );
  }

  if (difference < 0) {
    return Wallet.findOneAndUpdate(
      {
        user: userId,

        "transactions.reference":
          reservationReference,
      },

      {
        $inc: {
          [balanceField]:
            Math.abs(
              difference,
            ),
        },

        $set: {
          "transactions.$.amount":
            finalAmount,
        },
      },

      {
        new: true,
        runValidators: true,
      },
    );
  }

  return Wallet.findOneAndUpdate(
    {
      user: userId,

      "transactions.reference":
        reservationReference,
    },

    {
      $set: {
        "transactions.$.amount":
          finalAmount,
      },
    },

    {
      new: true,
      runValidators: true,
    },
  );
}

async function completePurchaseTransaction({
  userId,
  reservationReference,
  orderId,
  amount,
  service,
  country,
  server,
}) {
  await Wallet.updateOne(
    {
      user: userId,

      "transactions.reference":
        reservationReference,
    },

    {
      $set: {
        "transactions.$.status":
          "completed",

        "transactions.$.amount":
          amount,

        "transactions.$.description":
          `${service} (${country}) - ${server}`,

        "transactions.$.orderId":
          orderId,
      },
    },

    {
      runValidators: true,
    },
  );
}

exports.createOrder =
  async (req, res) => {
    let purchasedProviderOrder =
      null;

    let walletWasDebited =
      false;

    let debitedAmount = 0;

    let reservationReference =
      "";

    let balanceField =
      "balance";

    let paymentEnvironment =
      "live";

    let normalizedCountry =
      "";

    let normalizedService =
      "";

    let normalizedServer =
      "";

    try {
      paymentEnvironment =
        getPaymentEnvironment();

      const smsProviderEnvironment =
        getSmsProviderEnvironment();

      /*
       * The current provider manager contains real SMSBower and BenOTP
       * integrations. It does not contain a mock provider.
       */
      if (
        smsProviderEnvironment ===
        "test"
      ) {
        return res
          .status(503)
          .json({
            success: false,

            code:
              "MOCK_SMS_PROVIDER_NOT_CONFIGURED",

            message:
              "Test number purchasing is disabled on ChapsSms because a mock SMS service is not configured. Test wallet funds cannot be used for live number purchases.",
          });
      }

      /*
       * Most important safety gate:
       * test payment money cannot reach a live SMS provider.
       */
      if (
        paymentEnvironment !==
        smsProviderEnvironment
      ) {
        return res
          .status(503)
          .json({
            success: false,

            code:
              "UNSAFE_PAYMENT_CONFIGURATION",

            message:
              "Number purchasing is temporarily disabled on ChapsSms because payment testing is still enabled. Switch the payment and SMS systems to live before accepting real purchases.",
          });
      }

      balanceField =
        getWalletBalanceField(
          paymentEnvironment,
        );

      const {
        country,
        service,
        countryName,
        serviceName,
        operator,
        server,
      } = req.body;

      if (
        !country ||
        !service
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Country and service are required",
          });
      }

      normalizedCountry =
        normalizeCountry(
          country,
        );

      normalizedService =
        normalizeService(
          service,
        );

      const normalizedCountryName =
        String(
          countryName || "",
        ).trim();

      const normalizedServiceName =
        String(
          serviceName || "",
        ).trim();

      const requestedOperator =
        normalizeOperator(
          operator,
        );

      normalizedServer =
        normalizeServer(
          server,
        );

      if (
        !VALID_SERVERS.includes(
          normalizedServer,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Select a valid SMS server",
          });
      }

      const normalizedOperator =
        await pricingService
          .resolveEffectiveOperator({
            server:
              normalizedServer,

            country:
              normalizedCountry,

            service:
              normalizedService,

            countryName:
              normalizedCountryName,

            serviceName:
              normalizedServiceName,

            requestedOperator,
          });

      const preliminaryQuote =
        await providerManager.getPrice({
          server:
            normalizedServer,

          country:
            normalizedCountry,

          service:
            normalizedService,

          operator:
            normalizedOperator,
        });

      const preliminaryPricing =
        await pricingService
          .resolveCustomerPricing({
            server:
              normalizedServer,

            country:
              normalizedCountry,

            service:
              normalizedService,

            countryName:
              normalizedCountryName,

            serviceName:
              normalizedServiceName,

            operator:
              normalizedOperator,

            providerPrice:
              preliminaryQuote.price,

            providerCurrency:
              preliminaryQuote.currency,
          });

      const reservedAmount =
        Number(
          preliminaryPricing
            .sellingPrice,
        );

      if (
        !Number.isFinite(
          reservedAmount,
        ) ||
        reservedAmount <= 0
      ) {
        return res
          .status(502)
          .json({
            success: false,
            message:
              "The calculated selling price is invalid",
          });
      }

      reservationReference =
        createReservationReference(
          req.user._id,
        );

      /*
       * Reserve/deduct the ChapsSmS wallet BEFORE purchasing
       * from SMSBower or BenOTP.
       */
      let wallet =
        await Wallet.findOneAndUpdate(
          {
            user:
              req.user._id,

            [balanceField]: {
              $gte:
                reservedAmount,
            },
          },

          {
            $inc: {
              [balanceField]:
                -reservedAmount,
            },

            $push: {
              transactions: {
                $each: [
                  {
                    type:
                      "purchase",

                    amount:
                      reservedAmount,

                    environment:
                      paymentEnvironment,

                    balanceField,

                    description:
                      `Reserved for ${normalizedService} (${normalizedCountry}) - ${normalizedServer}`,

                    status:
                      "pending",

                    reference:
                      reservationReference,

                    server:
                      normalizedServer,

                    currency:
                      "NGN",
                  },
                ],

                $position: 0,
              },
            },
          },

          {
            new: true,
            runValidators: true,
          },
        );

      if (!wallet) {
        const latestWallet =
          await Wallet.findOne({
            user:
              req.user._id,
          }).select(
            "balance testBalance",
          );

        if (!latestWallet) {
          return res
            .status(404)
            .json({
              success: false,
              code:
                "WALLET_NOT_FOUND",
              message:
                "Wallet not found",
            });
        }

        return res
          .status(400)
          .json({
            success: false,

            code:
              "INSUFFICIENT_WALLET_BALANCE",

            message:
              "Insufficient ChapsSmS wallet balance. Fund your live wallet before purchasing a number.",

            walletBalance:
              getWalletBalance(
                latestWallet,
                balanceField,
              ),

            requiredAmount:
              reservedAmount,

            paymentEnvironment,
          });
      }

      walletWasDebited =
        true;

      debitedAmount =
        reservedAmount;

      purchasedProviderOrder =
        await providerManager.buyNumber({
          server:
            normalizedServer,

          country:
            normalizedCountry,

          service:
            normalizedService,

          operator:
            normalizedOperator,
        });

      const providerPrice =
        Number(
          purchasedProviderOrder
            .providerPrice,
        );

      if (
        !Number.isFinite(
          providerPrice,
        ) ||
        providerPrice <= 0
      ) {
        const error =
          new Error(
            "Provider returned an invalid purchase price",
          );

        error.status = 502;
        error.code =
          "INVALID_PROVIDER_PRICE";

        throw error;
      }

      const providerCurrency =
        purchasedProviderOrder
          .providerCurrency ||
        preliminaryQuote.currency;

      const actualOperator =
        normalizeOperator(
          purchasedProviderOrder
            .operator ||
            normalizedOperator,
        );

      const finalPricing =
        await pricingService
          .resolveCustomerPricing({
            server:
              normalizedServer,

            country:
              normalizedCountry,

            service:
              normalizedService,

            countryName:
              normalizedCountryName,

            serviceName:
              normalizedServiceName,

            operator:
              actualOperator,

            providerPrice,

            providerCurrency,
          });

      const finalAmount =
        Number(
          finalPricing
            .sellingPrice,
        );

      if (
        !Number.isFinite(
          finalAmount,
        ) ||
        finalAmount <= 0
      ) {
        const error =
          new Error(
            "The final selling price is invalid",
          );

        error.status = 502;
        error.code =
          "INVALID_FINAL_PRICE";

        throw error;
      }

      wallet =
        await reconcileReservation({
          userId:
            req.user._id,

          balanceField,

          reservationReference,

          reservedAmount,

          finalAmount,
        });

      if (!wallet) {
        /*
         * The final provider price increased and the customer cannot
         * cover the difference. Cancel the provider activation and
         * return the reserved amount.
         */
        try {
          await providerManager.cancelOrder(
            purchasedProviderOrder
              .internalProvider,

            purchasedProviderOrder
              .providerOrderId,
          );
        } catch (cancelError) {
          console.error(
            "Final-price cancellation failed:",
            cancelError,
          );
        }

        await refundReservedWallet({
          userId:
            req.user._id,

          amount:
            reservedAmount,

          balanceField,

          environment:
            paymentEnvironment,

          reservationReference,

          service:
            normalizedService,

          country:
            normalizedCountry,

          server:
            normalizedServer,

          reason:
            "Automatic refund because the final price exceeded the available wallet balance",
        });

        walletWasDebited =
          false;

        purchasedProviderOrder =
          null;

        const latestWallet =
          await Wallet.findOne({
            user:
              req.user._id,
          });

        return res
          .status(400)
          .json({
            success: false,

            code:
              "INSUFFICIENT_FINAL_BALANCE",

            message:
              "The live provider price changed and your wallet could not cover the difference. The provider order was cancelled and your wallet was refunded.",

            walletBalance:
              getWalletBalance(
                latestWallet,
                balanceField,
              ),

            requiredAmount:
              finalAmount,
          });
      }

      debitedAmount =
        finalAmount;

      let order;

      try {
        order =
          await Order.create({
            user:
              req.user._id,

            customerEmail:
              req.user.email ||
              "",

            customerName:
              req.user.username ||
              [
                req.user
                  .firstName,
                req.user
                  .lastName,
              ]
                .filter(
                  Boolean,
                )
                .join(" ")
                .trim(),

            country:
              normalizedCountry,

            countryName:
              normalizedCountryName ||
              normalizedCountry,

            service:
              normalizedService,

            serviceName:
              normalizedServiceName ||
              normalizedService,

            operator:
              actualOperator,

            phoneNumber:
              purchasedProviderOrder
                .phoneNumber,

            price:
              finalAmount,

            sellingPrice:
              finalAmount,

            providerPrice,

            providerCurrency:
              finalPricing
                .providerCurrency,

            providerCostNgn:
              finalPricing
                .providerCostNgn,

            profit:
              finalPricing.profit,

            financialStatus:
              "charged",

            pricingRule:
              finalPricing
                .pricingRule ||
              null,

            pricingSnapshot:
              finalPricing
                .pricingSnapshot ||
              null,

            paymentEnvironment,

            walletBalanceField:
              balanceField,

            walletReservationReference:
              reservationReference,

            server:
              purchasedProviderOrder
                .server ||
              normalizedServer,

            provider:
              purchasedProviderOrder
                .internalProvider,

            providerOrderId:
              String(
                purchasedProviderOrder
                  .providerOrderId,
              ),

            providerStatus:
              String(
                purchasedProviderOrder
                  .providerStatus ||
                  "STATUS_WAIT_CODE",
              ),

            providerResponse:
              purchasedProviderOrder
                .raw,

            status:
              "waiting",

            refunded:
              false,
          });
      } catch (saveError) {
        throw saveError;
      }

      await completePurchaseTransaction({
        userId:
          req.user._id,

        reservationReference,

        orderId:
          order._id,

        amount:
          finalAmount,

        service:
          normalizedServiceName ||
          normalizedService,

        country:
          normalizedCountryName ||
          normalizedCountry,

        server:
          normalizedServer,
      });

      walletWasDebited =
        false;

      purchasedProviderOrder =
        null;

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Number purchased successfully",

          order:
            sanitizeOrder(
              order,
            ),

          walletBalance:
            getWalletBalance(
              wallet,
              balanceField,
            ),

          paymentEnvironment,
        });
    } catch (error) {
      if (
        purchasedProviderOrder
          ?.providerOrderId
      ) {
        try {
          await providerManager.cancelOrder(
            purchasedProviderOrder
              .internalProvider,

            purchasedProviderOrder
              .providerOrderId,
          );
        } catch (cancelError) {
          console.error(
            "Provider rollback failed:",
            cancelError,
          );
        }
      }

      if (
        walletWasDebited &&
        debitedAmount > 0 &&
        reservationReference
      ) {
        try {
          await refundReservedWallet({
            userId:
              req.user._id,

            amount:
              debitedAmount,

            balanceField,

            environment:
              paymentEnvironment,

            reservationReference,

            service:
              normalizedService ||
              "SMS",

            country:
              normalizedCountry ||
              "unknown",

            server:
              normalizedServer ||
              null,

            reason:
              "Automatic refund for failed number purchase",
          });
        } catch (refundError) {
          console.error(
            "Automatic wallet rollback failed:",
            refundError,
          );
        }
      }

      console.error(
        "Create order error:",
        error,
      );

      return res
        .status(
          error.status ||
            500,
        )
        .json({
          success: false,

          code:
            getPublicOrderErrorCode(
              error,
              "ORDER_CREATION_FAILED",
            ),

          message:
            extractProviderError(
              error,
            ) ||
            "Unable to create order",
        });
    }
  };

exports.checkOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.provider || !order.providerOrderId) {
      return res.status(400).json({
        success: false,
        message: "Order has no valid provider reference",
      });
    }

    if (["received", "expired", "cancelled"].includes(order.status)) {
      return res.json({
        success: true,
        order: sanitizeOrder(order),
      });
    }

    const providerOrder = await providerManager.getOrder(
      order.provider,
      order.providerOrderId
    );

    const providerStatus = String(
      providerOrder.providerStatus || providerOrder.status || ""
    )
      .trim()
      .toUpperCase();

    const normalizedStatus = String(
      providerOrder.status || "waiting"
    )
      .trim()
      .toLowerCase();

    const allowedStatuses = [
      "waiting",
      "received",
      "expired",
      "cancelled",
    ];

    order.providerStatus =
      providerStatus || order.providerStatus || "STATUS_WAIT_CODE";
    order.status = allowedStatuses.includes(normalizedStatus)
      ? normalizedStatus
      : "waiting";
    order.providerLastCheckedAt = new Date();

    if (providerOrder.raw !== undefined) {
      order.providerResponse = providerOrder.raw;
    }

    if (providerOrder.operator) {
      order.operator = normalizeOperator(providerOrder.operator);
    }

    const smsText = String(providerOrder.sms || "").trim();
    const directOtp = String(providerOrder.otpCode || "").trim();
    const otpMatch = smsText.match(/\b\d{4,8}\b/);
    const otpCode = directOtp || otpMatch?.[0] || "";

    if (smsText) {
      order.sms = smsText;
    }

    if (otpCode) {
      order.otpCode = otpCode;
      order.status = "received";
      order.financialStatus = "earned";
      order.otpReceivedAt = order.otpReceivedAt || new Date();

      try {
        const finishedOrder = await providerManager.finishOrder(
          order.provider,
          order.providerOrderId
        );

        if (finishedOrder?.providerStatus) {
          order.providerStatus = String(
            finishedOrder.providerStatus
          ).toUpperCase();
        }

        order.providerFinishedAt = new Date();
      } catch (finishError) {
        if (finishError.code !== "OPERATION_NOT_SUPPORTED") {
          console.error("Finish activation failed:", finishError);
        }
      }
    }

    if (order.status === "cancelled") {
      order.providerCancelledAt =
        order.providerCancelledAt || new Date();
    }

    await order.save();

    return res.json({
      success: true,
      order: sanitizeOrder(order),
    });
  } catch (error) {
    console.error("Check order error:", error);

    const temporaryFailure =
      Boolean(error.retryable) ||
      [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNABORTED",
        "EPIPE",
        "EAI_AGAIN",
        "ERR_NETWORK",
      ].includes(String(error.code || "").toUpperCase());

    return res
      .status(temporaryFailure ? 503 : error.status || 502)
      .json({
        success: false,
        temporary: temporaryFailure,
        message: temporaryFailure
          ? "The SMS server is temporarily unavailable. Please try again."
          : extractProviderError(error),
      });
  }
};

exports.cancelOrder =
  async (req, res) => {
    let claimedOrder =
      null;

    let providerCancelled =
      false;

    try {
      const order =
        await Order.findOne({
          _id:
            req.params.id,

          user:
            req.user._id,
        });

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Order not found",
          });
      }

      const paymentEnvironment =
        String(
          order.paymentEnvironment ||
            "live",
        )
          .trim()
          .toLowerCase();

      const balanceField =
        ["balance", "testBalance"].includes(
          order.walletBalanceField,
        )
          ? order.walletBalanceField
          : getWalletBalanceField(
              paymentEnvironment,
            );

      const refundAmount =
        Number(
          order.sellingPrice ||
            order.price,
        );

      if (
        !Number.isFinite(
          refundAmount,
        ) ||
        refundAmount <= 0
      ) {
        return res
          .status(500)
          .json({
            success: false,
            message:
              "Invalid refund amount.",
          });
      }

      if (order.refunded) {
        const wallet =
          await Wallet.findOne({
            user:
              req.user._id,
          });

        return res.json({
          success: true,
          refunded: true,

          walletBalance:
            getWalletBalance(
              wallet,
              balanceField,
            ),

          order:
            sanitizeOrder(
              order,
            ),

          message:
            "Order was already cancelled and refunded.",
        });
      }

      if (
        order.status ===
          "received" ||
        order.otpCode
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "OTP has already been received. This order cannot be cancelled.",
          });
      }

      /*
       * A previous request may have cancelled the provider but failed
       * before refunding MongoDB. In that state, retry only the refund.
       */
      const providerAlreadyCancelled =
        order.status ===
          "cancelled" &&
        !order.refunded;

      if (
        providerAlreadyCancelled
      ) {
        claimedOrder =
          await Order.findOneAndUpdate(
            {
              _id:
                order._id,

              user:
                req.user._id,

              status:
                "cancelled",

              refunded: {
                $ne: true,
              },
            },

            {
              $set: {
                status:
                  "cancelling",
              },
            },

            {
              returnDocument:
                "after",
            },
          );

        providerCancelled =
          true;
      } else {
        claimedOrder =
          await Order.findOneAndUpdate(
            {
              _id:
                order._id,

              user:
                req.user._id,

              refunded: {
                $ne: true,
              },

              status:
                "waiting",
            },

            {
              $set: {
                status:
                  "cancelling",
              },
            },

            {
              returnDocument:
                "after",
            },
          );
      }

      if (!claimedOrder) {
        const latestOrder =
          await Order.findById(
            order._id,
          );

        const wallet =
          await Wallet.findOne({
            user:
              req.user._id,
          });

        return res
          .status(409)
          .json({
            success: false,

            refunded:
              Boolean(
                latestOrder
                  ?.refunded,
              ),

            walletBalance:
              getWalletBalance(
                wallet,
                balanceField,
              ),

            order:
              sanitizeOrder(
                latestOrder,
              ),

            message:
              "Order is already being processed.",
          });
      }

      let providerResponse =
        null;

      if (
        !providerAlreadyCancelled
      ) {
        providerResponse =
          await providerManager.cancelOrder(
            claimedOrder
              .provider,

            claimedOrder
              .providerOrderId,
          );

        providerCancelled =
          true;
      }

      const refundReference =
        `ORDER-${claimedOrder._id}-CANCEL-REFUND`
          .toUpperCase();

      let wallet =
        await Wallet.findOneAndUpdate(
          {
            user:
              req.user._id,

            "transactions.reference": {
              $ne:
                refundReference,
            },
          },

          {
            $inc: {
              [balanceField]:
                refundAmount,
            },

            $push: {
              transactions: {
                $each: [
                  {
                    type:
                      "refund",

                    amount:
                      refundAmount,

                    environment:
                      paymentEnvironment,

                    balanceField,

                    description:
                      `Refund for cancelled ${claimedOrder.serviceName || claimedOrder.service} activation`,

                    status:
                      "completed",

                    reference:
                      refundReference,

                    orderId:
                      claimedOrder._id,

                    server:
                      claimedOrder.server,

                    currency:
                      "NGN",
                  },
                ],

                $position: 0,
              },
            },
          },

          {
            new: true,
            runValidators: true,
          },
        );

      if (!wallet) {
        wallet =
          await Wallet.findOne({
            user:
              req.user._id,
          });

        const refundExists =
          wallet?.transactions
            ?.some(
              (transaction) =>
                String(
                  transaction
                    .reference ||
                    "",
                ) ===
                refundReference,
            );

        if (!refundExists) {
          await Order.findByIdAndUpdate(
            claimedOrder._id,
            {
              status:
                providerCancelled
                  ? "cancelled"
                  : "waiting",

              refunded:
                false,

              financialStatus:
                "charged",

              providerStatus:
                providerResponse
                  ?.providerStatus ||
                claimedOrder
                  .providerStatus,

              providerCancelledAt:
                providerCancelled
                  ? new Date()
                  : claimedOrder
                      .providerCancelledAt,
            },
          );

          return res
            .status(500)
            .json({
              success: false,

              code:
                "WALLET_REFUND_FAILED",

              message:
                "The provider order was cancelled, but the wallet refund could not be completed. Retry cancellation to complete the refund.",
            });
        }
      }

      const updatedOrder =
        await Order.findByIdAndUpdate(
          claimedOrder._id,

          {
            $set: {
              status:
                "cancelled",

              refunded:
                true,

              refundedAt:
                new Date(),

              financialStatus:
                "refunded",

              providerStatus:
                providerResponse
                  ?.providerStatus ||
                claimedOrder
                  .providerStatus,

              providerCancelledAt:
                claimedOrder
                  .providerCancelledAt ||
                new Date(),

              providerResponse:
                providerResponse
                  ?.raw ??
                claimedOrder
                  .providerResponse,
            },
          },

          {
            returnDocument:
              "after",
          },
        );

      return res.json({
        success: true,
        refunded: true,
        refundAmount,

        walletBalance:
          getWalletBalance(
            wallet,
            balanceField,
          ),

        order:
          sanitizeOrder(
            updatedOrder,
          ),

        message:
          "Order cancelled and wallet refunded.",
      });
    } catch (error) {
      if (
        claimedOrder?._id
      ) {
        const fallbackStatus =
          providerCancelled
            ? "cancelled"
            : "waiting";

        await Order.findOneAndUpdate(
          {
            _id:
              claimedOrder._id,

            status:
              "cancelling",

            refunded: {
              $ne: true,
            },
          },

          {
            $set: {
              status:
                fallbackStatus,
            },
          },
        ).catch(
          () => null,
        );
      }

      console.error(
        "Cancel order error:",
        error,
      );

      return res
        .status(
          error.status ||
            500,
        )
        .json({
          success: false,

          code:
            getPublicOrderErrorCode(
              error,
              "ORDER_CANCELLATION_FAILED",
            ),

          message:
            extractProviderError(
              error,
            ),
        });
    }
  };

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      orders: sanitizeOrders(orders),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load orders",
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      order: sanitizeOrder(order),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load order",
    });
  }
};

const axios = require("axios");

const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const providerManager = require("../services/providers/providerManager");

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
  return String(value || "")
    .trim()
    .toLowerCase();
}

function calculateCustomerPrice(
  providerPrice,
  currency = "USD"
) {
  const exchangeRate =
    currency === "NGN"
      ? 1
      : Number(process.env.NGN_PER_USD);

  const markup =
    Number(process.env.PRICE_MARKUP_PERCENT || 0);

  const amount =
    Number(providerPrice) * exchangeRate;

  return Math.ceil(
    amount + amount * markup / 100
  );
}

function extractProviderError(error) {
  return (
    error.message ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    "Provider request failed"
  );
}exports.createOrder = async (req, res) => {
  try {
    const {
      country,
      service,
      operator,
      provider,
    } = req.body;

    if (!country || !service) {
      return res.status(400).json({
        success: false,
        message:
          "Country and service are required",
      });
    }

    const normalizedCountry =
      normalizeCountry(country);

    const normalizedService =
      normalizeService(service);

    const normalizedOperator =
      normalizeOperator(operator);

    const normalizedProvider = String(provider || "")
      .trim()
      .toLowerCase();

    if (!["benotp", "smsbower"].includes(normalizedProvider)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid SMS server",
      });
    }

    /*
     * Get a quote only for the wallet pre-check.
     *
     * providerManager.buyNumber() will later
     * obtain a quote and purchase from the same
     * provider, so this initial quote is not used
     * for final billing.
     */

    const preliminaryQuote =
      await providerManager.getPrice({
        provider: normalizedProvider,
        country: normalizedCountry,
        service: normalizedService,
      });

    const preliminaryCustomerPrice =
      calculateCustomerPrice(
        preliminaryQuote.price,
        preliminaryQuote.currency
      );

    if (
      !Number.isFinite(
        preliminaryCustomerPrice
      ) ||
      preliminaryCustomerPrice <= 0
    ) {
      return res.status(502).json({
        success: false,
        message:
          "The provider returned an invalid price",
      });
    }

    /*
     * Wallet pre-check.
     */

    const walletBefore =
      await Wallet.findOne({
        user: req.user._id,
      }).select("balance");

    if (!walletBefore) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (
      Number(walletBefore.balance) <
      preliminaryCustomerPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient wallet balance",
        walletBalance:
          walletBefore.balance,
        requiredAmount:
          preliminaryCustomerPrice,
      });
    }

    /*
     * Purchase the number.
     *
     * The updated providerManager.buyNumber()
     * performs the price lookup and purchase
     * against the same provider.
     */

    const providerOrder =
      await providerManager.buyNumber({
        provider: normalizedProvider,
        country: normalizedCountry,
        service: normalizedService,
        operator:
          normalizedOperator,
      });

    const providerPrice = Number(
      providerOrder.providerPrice
    );

    if (
      !Number.isFinite(providerPrice) ||
      providerPrice <= 0
    ) {
      /*
       * A number may already have been created,
       * so cancel it before returning an error.
       */

      try {
        await providerManager.cancelOrder(
          providerOrder.provider,
          providerOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error(
          "Unable to cancel activation after invalid provider price:",
          cancelError
        );
      }

      return res.status(502).json({
        success: false,
        message:
          "The provider did not return a valid purchase price",
      });
    }

    const providerCurrency =
      providerOrder.providerCurrency ||
      preliminaryQuote.currency;

    const finalCustomerPrice =
      calculateCustomerPrice(
        providerPrice,
        providerCurrency
      );

    if (
      !Number.isFinite(
        finalCustomerPrice
      ) ||
      finalCustomerPrice <= 0
    ) {
      try {
        await providerManager.cancelOrder(
          providerOrder.provider,
          providerOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error(
          "Unable to cancel activation after invalid customer price:",
          cancelError
        );
      }

      return res.status(502).json({
        success: false,
        message:
          "Unable to calculate the final order price",
      });
    }

    /*
     * Atomic wallet deduction using the actual
     * price of the provider that created the
     * activation.
     */

    const wallet =
      await Wallet.findOneAndUpdate(
        {
          user: req.user._id,
          balance: {
            $gte:
              finalCustomerPrice,
          },
        },
        {
          $inc: {
            balance:
              -finalCustomerPrice,
          },
          $push: {
            transactions: {
              $each: [
                {
                  type: "purchase",
                  amount:
                    finalCustomerPrice,
                  description: `${normalizedService} (${normalizedCountry})`,
                  status: "completed",
                },
              ],
              $position: 0,
            },
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

    if (!wallet) {
      try {
        await providerManager.cancelOrder(
          providerOrder.provider,
          providerOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error(
          "Unable to cancel activation after wallet deduction failure:",
          cancelError
        );
      }

      return res.status(400).json({
        success: false,
        message:
          "Insufficient wallet balance after provider purchase.",
        requiredAmount:
          finalCustomerPrice,
      });
    }

    let order;

    try {
      order = await Order.create({
        user: req.user._id,

        country:
          normalizedCountry,

        service:
          normalizedService,

        operator:
          providerOrder.operator ||
          normalizedOperator ||
          "any",

        phoneNumber:
          providerOrder.phoneNumber,

        price:
          finalCustomerPrice,

        providerPrice,

        providerCurrency,

        provider:
          providerOrder.provider,

        providerOrderId:
          String(
            providerOrder.providerOrderId
          ),

        providerStatus:
          providerOrder.providerStatus ||
          "STATUS_WAIT_CODE",

        providerResponse:
          providerOrder.raw,

        status: "waiting",

        refunded: false,
      });
    } catch (error) {
      /*
       * Roll back both the provider activation
       * and the wallet deduction.
       */

      try {
        await providerManager.cancelOrder(
          providerOrder.provider,
          providerOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error(
          "Provider cancellation failed during order rollback:",
          cancelError
        );
      }

      try {
        await Wallet.findOneAndUpdate(
          {
            user: req.user._id,
          },
          {
            $inc: {
              balance:
                finalCustomerPrice,
            },
            $push: {
              transactions: {
                $each: [
                  {
                    type: "refund",
                    amount:
                      finalCustomerPrice,
                    description:
                      "Automatic refund for failed order creation",
                    status:
                      "completed",
                  },
                ],
                $position: 0,
              },
            },
          },
          {
            runValidators: true,
          }
        );
      } catch (refundError) {
        console.error(
          "Wallet rollback failed after order creation error:",
          refundError
        );
      }

      throw error;
    }

    return res.status(201).json({
      success: true,
      order,
      walletBalance:
        wallet.balance,
    });
  } catch (error) {
    console.error(
      "Create order error:",
      {
        message: error.message,
        code: error.code,
        status: error.status,
        provider:
          error.provider,
      }
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          extractProviderError(
            error
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

    if (
      !order.provider ||
      !order.providerOrderId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order has no valid provider reference",
      });
    }

    /*
     * Do not poll completed orders again.
     */

    if (
      [
        "received",
        "expired",
        "cancelled",
      ].includes(
        String(order.status || "")
          .trim()
          .toLowerCase()
      )
    ) {
      return res.json({
        success: true,
        order,
      });
    }

    /*
     * Always check the same provider that
     * originally created this activation.
     */

    const providerOrder =
      await providerManager.getOrder(
        order.provider,
        order.providerOrderId
      );

    console.log(
      `[${order.provider}] check order response:`,
      providerOrder
    );

    const providerStatus = String(
      providerOrder.providerStatus ||
        providerOrder.status ||
        ""
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
      providerStatus ||
      order.providerStatus ||
      "STATUS_WAIT_CODE";

    order.status =
      allowedStatuses.includes(
        normalizedStatus
      )
        ? normalizedStatus
        : "waiting";

    order.providerLastCheckedAt =
      new Date();

    if (
      providerOrder.raw !== undefined
    ) {
      order.providerResponse =
        providerOrder.raw;
    }

    if (providerOrder.operator) {
      order.operator =
        providerOrder.operator;
    }

    const smsText = String(
      providerOrder.sms || ""
    ).trim();

    const directOtp = String(
      providerOrder.otpCode || ""
    ).trim();

    /*
     * Fallback extraction in case a provider
     * returns the OTP only inside the SMS text.
     */

    const otpMatch = smsText.match(
      /\b\d{4,8}\b/
    );

    const otpCode =
      directOtp ||
      otpMatch?.[0] ||
      "";

    if (smsText) {
      order.sms = smsText;
    }

    if (otpCode) {
      order.otpCode = otpCode;
      order.status = "received";

      /*
       * Some providers support explicitly
       * finishing an activation after OTP receipt.
       * BenOTP may not support this operation,
       * so failure here must not hide the OTP.
       */

      try {
        const finishedOrder =
          await providerManager.finishOrder(
            order.provider,
            order.providerOrderId
          );

        if (
          finishedOrder?.providerStatus
        ) {
          order.providerStatus = String(
            finishedOrder.providerStatus
          ).toUpperCase();
        }

        order.providerFinishedAt =
          new Date();
      } catch (finishError) {
        if (
          finishError.code !==
          "OPERATION_NOT_SUPPORTED"
        ) {
          console.error(
            `[${order.provider}] finish order failed:`,
            extractProviderError(
              finishError
            )
          );
        }
      }
    }

    if (
      order.status === "cancelled"
    ) {
      order.providerCancelledAt =
        order.providerCancelledAt ||
        new Date();
    }

    await order.save();

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Check order error:",
      {
        message: error.message,
        code: error.code,
        status: error.status,
        provider:
          error.provider,
      }
    );

    const temporaryFailure =
      Boolean(error.retryable) ||
      [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNABORTED",
        "EPIPE",
        "EAI_AGAIN",
        "ERR_NETWORK",
      ].includes(
        String(error.code || "")
          .toUpperCase()
      );

    return res
      .status(
        temporaryFailure
          ? 503
          : error.status || 502
      )
      .json({
        success: false,
        temporary:
          temporaryFailure,
        message: temporaryFailure
          ? "The SMS provider connection was interrupted. The order is still active and will be checked again."
          : extractProviderError(
              error
            ) ||
            "Failed to check order status",
      });
  }
};
exports.cancelOrder = async (req, res) => {
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

    if (order.refunded) {
      const wallet = await Wallet.findOne({
        user: req.user._id,
      });

      return res.json({
        success: true,
        refunded: true,
        walletBalance: wallet?.balance ?? 0,
        order,
      });
    }

    if (
      order.status === "received" ||
      order.otpCode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP has already been received. This order cannot be cancelled.",
      });
    }

    const refundAmount = Number(order.price);

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Invalid refund amount.",
      });
    }

    /*
     * Lock the order.
     */

    const claimedOrder =
      await Order.findOneAndUpdate(
        {
          _id: order._id,
          user: req.user._id,
          refunded: {
            $ne: true,
          },
          status: "waiting",
        },
        {
          $set: {
            status: "cancelling",
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "Order is already being processed.",
      });
    }

    /*
     * Cancel using the provider that
     * created the activation.
     */

    const providerResponse =
      await providerManager.cancelOrder(
        claimedOrder.provider,
        claimedOrder.providerOrderId
      );

    /*
     * Refund wallet.
     */

    const wallet =
      await Wallet.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          $inc: {
            balance: refundAmount,
          },
          $push: {
            transactions: {
              $each: [
                {
                  type: "refund",
                  amount: refundAmount,
                  description: `Refund for cancelled ${claimedOrder.service} activation`,
                  status: "completed",
                },
              ],
              $position: 0,
            },
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

    if (!wallet) {
      /*
       * Provider already cancelled.
       * Preserve retry state.
       */

      await Order.findByIdAndUpdate(
        claimedOrder._id,
        {
          status: "cancelled",
          refunded: false,
          providerStatus:
            providerResponse.providerStatus,
          providerCancelledAt:
            new Date(),
        }
      );

      return res.status(404).json({
        success: false,
        message:
          "Provider cancelled successfully but wallet was not found.",
      });
    }

    const updatedOrder =
      await Order.findByIdAndUpdate(
        claimedOrder._id,
        {
          $set: {
            status: "cancelled",
            refunded: true,
            refundedAt: new Date(),
            providerStatus:
              providerResponse.providerStatus,
            providerCancelledAt:
              new Date(),
            providerResponse:
              providerResponse.raw,
          },
        },
        {
          returnDocument: "after",
        }
      );

    return res.json({
      success: true,
      refunded: true,
      refundAmount,
      walletBalance:
        wallet.balance,
      wallet,
      order: updatedOrder,
      message:
        "Order cancelled and wallet refunded.",
    });
  } catch (error) {
    console.error(
      "Cancel order error:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          extractProviderError(error),
      });
  }
};

exports.getOrders = async (
  req,
  res
) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load orders",
    });
  }
};

exports.getOrder = async (
  req,
  res
) => {
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
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load order",
    });
  }
};
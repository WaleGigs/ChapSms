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
  return (
    error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    "Provider request failed"
  );
}

function sanitizeOrder(order) {
  if (!order) {
    return order;
  }

  const data =
    typeof order.toObject === "function"
      ? order.toObject()
      : { ...order };

  delete data.provider;
  delete data.providerResponse;
  delete data.providerPrice;
  delete data.providerCurrency;
  delete data.providerCostNgn;
  delete data.profit;
  delete data.financialStatus;
  delete data.pricingRule;
  delete data.pricingSnapshot;

  return data;
}

function sanitizeOrders(orders = []) {
  return orders.map(sanitizeOrder);
}

async function refundWalletAfterSaveFailure({
  userId,
  amount,
  service,
  country,
}) {
  try {
    await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: { balance: amount },
        $push: {
          transactions: {
            $each: [
              {
                type: "refund",
                amount,
                description: `Automatic refund for failed ${service} order (${country})`,
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
  } catch (walletError) {
    console.error("Automatic wallet rollback failed:", walletError);
  }
}

exports.createOrder = async (req, res) => {
  let purchasedProviderOrder = null;
  let walletWasDebited = false;
  let debitedAmount = 0;

  try {
    const {
      country,
      service,
      countryName,
      serviceName,
      operator,
      server,
    } = req.body;

    if (!country || !service) {
      return res.status(400).json({
        success: false,
        message: "Country and service are required",
      });
    }

    const normalizedCountry = normalizeCountry(country);
    const normalizedService = normalizeService(service);
    const normalizedCountryName = String(
      countryName || ""
    ).trim();
    const normalizedServiceName = String(
      serviceName || ""
    ).trim();
    const requestedOperator =
      normalizeOperator(operator);

    const normalizedServer =
      normalizeServer(server);

    if (!VALID_SERVERS.includes(normalizedServer)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid SMS server",
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
      await pricingService.resolveCustomerPricing({
        server: normalizedServer,
        country: normalizedCountry,
        service: normalizedService,
        countryName: normalizedCountryName,
        serviceName: normalizedServiceName,
        operator: normalizedOperator,
        providerPrice: preliminaryQuote.price,
        providerCurrency: preliminaryQuote.currency,
      });

    if (process.env.NODE_ENV !== "production") {
      console.log("[Pricing] purchase pre-check:", {
        server: normalizedServer,
        country: normalizedCountry,
        countryName: normalizedCountryName,
        service: normalizedService,
        serviceName: normalizedServiceName,
        operator: normalizedOperator,
        providerPrice: preliminaryQuote.price,
        providerCurrency: preliminaryQuote.currency,
        sellingPrice: preliminaryPricing.sellingPrice,
        pricingSource: preliminaryPricing.pricingSource,
        pricingRuleMatched:
          preliminaryPricing.pricingRuleMatched,
      });
    }

    const walletBefore = await Wallet.findOne({
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
      preliminaryPricing.sellingPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        walletBalance: walletBefore.balance,
        requiredAmount: preliminaryPricing.sellingPrice,
      });
    }

    purchasedProviderOrder = await providerManager.buyNumber({
      server: normalizedServer,
      country: normalizedCountry,
      service: normalizedService,
      operator: normalizedOperator,
    });

    const providerPrice = Number(
      purchasedProviderOrder.providerPrice
    );

    if (!Number.isFinite(providerPrice) || providerPrice <= 0) {
      try {
        await providerManager.cancelOrder(
          purchasedProviderOrder.internalProvider,
          purchasedProviderOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error("Invalid-price cancellation failed:", cancelError);
      }

      return res.status(502).json({
        success: false,
        message: "Provider returned an invalid purchase price",
      });
    }

    const providerCurrency =
      purchasedProviderOrder.providerCurrency ||
      preliminaryQuote.currency;

    const actualOperator = normalizeOperator(
      purchasedProviderOrder.operator || normalizedOperator
    );

    const finalPricing = await pricingService.resolveCustomerPricing({
      server: normalizedServer,
      country: normalizedCountry,
      service: normalizedService,
      countryName: normalizedCountryName,
      serviceName: normalizedServiceName,
      operator: actualOperator,
      providerPrice,
      providerCurrency,
    });

    debitedAmount = finalPricing.sellingPrice;

    const wallet = await Wallet.findOneAndUpdate(
      {
        user: req.user._id,
        balance: { $gte: debitedAmount },
      },
      {
        $inc: { balance: -debitedAmount },
        $push: {
          transactions: {
            $each: [
              {
                type: "purchase",
                amount: debitedAmount,
                description: `${normalizedService} (${normalizedCountry}) - ${normalizedServer}`,
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
          purchasedProviderOrder.internalProvider,
          purchasedProviderOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error("Insufficient-balance cancellation failed:", cancelError);
      }

      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    walletWasDebited = true;

    let order;

    try {
      order = await Order.create({
        user: req.user._id,
        customerEmail: req.user.email || "",
        customerName: [req.user.firstName, req.user.lastName]
          .filter(Boolean)
          .join(" "),
        country: normalizedCountry,
        service: normalizedService,
        operator: actualOperator,
        phoneNumber: purchasedProviderOrder.phoneNumber,
        price: finalPricing.sellingPrice,
        sellingPrice: finalPricing.sellingPrice,
        providerPrice,
        providerCurrency: finalPricing.providerCurrency,
        providerCostNgn: finalPricing.providerCostNgn,
        profit: finalPricing.profit,
        financialStatus: "charged",
        pricingRule: finalPricing.pricingRuleId,
        pricingSnapshot: finalPricing.pricingSnapshot,
        server: purchasedProviderOrder.server || normalizedServer,
        provider: purchasedProviderOrder.internalProvider,
        providerOrderId: String(
          purchasedProviderOrder.providerOrderId
        ),
        providerStatus:
          purchasedProviderOrder.providerStatus ||
          "STATUS_WAIT_CODE",
        providerResponse: purchasedProviderOrder.raw,
        status: "waiting",
        refunded: false,
      });
    } catch (saveError) {
      try {
        await providerManager.cancelOrder(
          purchasedProviderOrder.internalProvider,
          purchasedProviderOrder.providerOrderId
        );
      } catch (cancelError) {
        console.error("Order-save cancellation failed:", cancelError);
      }

      await refundWalletAfterSaveFailure({
        userId: req.user._id,
        amount: debitedAmount,
        service: normalizedService,
        country: normalizedCountry,
      });

      walletWasDebited = false;
      throw saveError;
    }

    return res.status(201).json({
      success: true,
      order: sanitizeOrder(order),
      walletBalance: wallet.balance,
    });
  } catch (error) {
    if (walletWasDebited && debitedAmount > 0) {
      await refundWalletAfterSaveFailure({
        userId: req.user._id,
        amount: debitedAmount,
        service: String(req.body.service || "service"),
        country: String(req.body.country || "country"),
      });
    }

    console.error("Create order error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: extractProviderError(error),
      code: error.code || "ORDER_CREATION_FAILED",
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

exports.cancelOrder = async (req, res) => {
  let claimedOrder = null;

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
      const wallet = await Wallet.findOne({ user: req.user._id });

      return res.json({
        success: true,
        refunded: true,
        walletBalance: wallet?.balance ?? 0,
        order: sanitizeOrder(order),
      });
    }

    if (order.status === "received" || order.otpCode) {
      return res.status(400).json({
        success: false,
        message:
          "OTP has already been received. This order cannot be cancelled.",
      });
    }

    const refundAmount = Number(order.sellingPrice || order.price);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid refund amount.",
      });
    }

    claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        user: req.user._id,
        refunded: { $ne: true },
        status: "waiting",
      },
      { $set: { status: "cancelling" } },
      { returnDocument: "after" }
    );

    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        message: "Order is already being processed.",
      });
    }

    const providerResponse = await providerManager.cancelOrder(
      claimedOrder.provider,
      claimedOrder.providerOrderId
    );

    const wallet = await Wallet.findOneAndUpdate(
      { user: req.user._id },
      {
        $inc: { balance: refundAmount },
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
      await Order.findByIdAndUpdate(claimedOrder._id, {
        status: "cancelled",
        refunded: false,
        financialStatus: "charged",
        providerStatus: providerResponse.providerStatus,
        providerCancelledAt: new Date(),
      });

      return res.status(404).json({
        success: false,
        message: "Provider cancelled successfully but wallet was not found.",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      claimedOrder._id,
      {
        $set: {
          status: "cancelled",
          refunded: true,
          refundedAt: new Date(),
          financialStatus: "refunded",
          providerStatus: providerResponse.providerStatus,
          providerCancelledAt: new Date(),
          providerResponse: providerResponse.raw,
        },
      },
      { returnDocument: "after" }
    );

    return res.json({
      success: true,
      refunded: true,
      refundAmount,
      walletBalance: wallet.balance,
      order: sanitizeOrder(updatedOrder),
      message: "Order cancelled and wallet refunded.",
    });
  } catch (error) {
    if (claimedOrder?._id) {
      await Order.findOneAndUpdate(
        {
          _id: claimedOrder._id,
          status: "cancelling",
          refunded: { $ne: true },
        },
        { $set: { status: "waiting" } }
      ).catch(() => null);
    }

    console.error("Cancel order error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: extractProviderError(error),
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
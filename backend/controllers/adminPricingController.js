const mongoose = require("mongoose");

const PricingRule = require("../models/PricingRule");
const Order = require("../models/Order");
const providerManager = require(
  "../services/providers/providerManager"
);
const pricingService = require(
  "../services/pricingService"
);

function parseBoolean(value, fallback = undefined) {
  if (value === undefined) {
    return fallback;
  }

  return ["true", "1", "yes"].includes(
    String(value).trim().toLowerCase()
  );
}

function parsePositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function createDateRange(query = {}) {
  const range = {};

  if (query.dateFrom) {
    const dateFrom = new Date(query.dateFrom);
    if (!Number.isNaN(dateFrom.getTime())) {
      range.$gte = dateFrom;
    }
  }

  if (query.dateTo) {
    const dateTo = new Date(query.dateTo);
    if (!Number.isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
      range.$lte = dateTo;
    }
  }

  return Object.keys(range).length ? range : null;
}

function ruleResponse(rule) {
  return {
    id: String(rule._id),
    server: rule.server,
    country: rule.country,
    countryName: rule.countryName,
    service: rule.service,
    serviceName: rule.serviceName,
    operator: rule.operator,
    pricingMode: rule.pricingMode,
    fixedSellingPrice: rule.fixedSellingPrice,
    markupPercent: rule.markupPercent,
    fixedMarkup: rule.fixedMarkup,
    minimumSellingPrice: rule.minimumSellingPrice,
    isActive: rule.isActive,
    notes: rule.notes,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}


async function deactivateCompetingRules(
  rule,
  userId
) {
  if (!rule?.isActive) {
    return;
  }

  await PricingRule.updateMany(
    {
      _id: {
        $ne: rule._id,
      },
      server: rule.server,
      country: rule.country,
      service: rule.service,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        updatedBy: userId,
      },
    }
  );
}

exports.getOperators = async (
  req,
  res
) => {
  try {
    const server =
      pricingService.normalizeServer(
        req.query.server
      );

    const country =
      pricingService.normalizeCountry(
        req.query.country
      );

    const service =
      pricingService.normalizeService(
        req.query.service
      );

    const result =
      await providerManager.getOperators({
        server,
        country,
        service,
      });

    const operators = (
      Array.isArray(result?.operators)
        ? result.operators
        : []
    )
      .map((operator) => {
        const id = String(
          operator.id ??
          operator.operator ??
          operator.providerId ??
          ""
        ).trim();

        const price = Number(
          operator.price
        );

        const stock = Number(
          operator.stock
        );

        if (
          !id ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          return null;
        }

        const currency = String(
          operator.currency ||
          result.currency ||
          "NGN"
        )
          .trim()
          .toUpperCase();

        return {
          id,
          operator: id,
          name:
            String(
              operator.name ||
              `Operator ${id}`
            ).trim(),
          price,
          stock:
            Number.isFinite(stock) &&
            stock >= 0
              ? stock
              : 0,
          currency,
          priceNgn:
            pricingService
              .convertProviderCostToNaira(
                price,
                currency
              ),
        };
      })
      .filter(Boolean)
      .sort((first, second) => {
        if (
          first.price !==
          second.price
        ) {
          return (
            first.price -
            second.price
          );
        }

        return (
          second.stock -
          first.stock
        );
      });

    if (!operators.length) {
      return res.status(409).json({
        success: false,
        message:
          "No operators are currently available for this country and service",
        code: "NO_OPERATORS",
      });
    }

    return res.json({
      success: true,
      server,
      country,
      service,
      currency:
        result.currency || null,
      operators,
    });
  } catch (error) {
    return res
      .status(
        error.status || 500
      )
      .json({
        success: false,
        message:
          error.message ||
          "Unable to load operators",
        code:
          error.code ||
          "OPERATORS_LOAD_FAILED",
      });
  }
};

exports.listRules = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 100000);
    const limit = parsePositiveInteger(req.query.limit, 25, 100);
    const filter = {};

    if (req.query.server) {
      filter.server = pricingService.normalizeServer(req.query.server);
    }

    if (req.query.country) {
      filter.country = pricingService.normalizeCountry(req.query.country);
    }

    if (req.query.service) {
      filter.service = pricingService.normalizeService(req.query.service);
    }

    const active = parseBoolean(req.query.isActive);
    if (active !== undefined) {
      filter.isActive = active;
    }

    const [rules, total] = await Promise.all([
      PricingRule.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PricingRule.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      rules: rules.map(ruleResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to load pricing rules",
      code: error.code || "PRICING_RULES_LOAD_FAILED",
    });
  }
};

exports.upsertRule = async (req, res) => {
  try {
    const input = pricingService.normalizeRuleInput(req.body);

    const rule = await PricingRule.findOneAndUpdate(
      {
        server: input.server,
        country: input.country,
        service: input.service,
        operator: input.operator,
      },
      {
        $set: {
          ...input,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          createdBy: req.user._id,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    await deactivateCompetingRules(
      rule,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      rule: ruleResponse(rule),
      message: "Pricing rule saved successfully",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A pricing rule already exists for this selection",
        code: "DUPLICATE_PRICING_RULE",
      });
    }

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to save pricing rule",
      code: error.code || "PRICING_RULE_SAVE_FAILED",
    });
  }
};

exports.updateRule = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pricing rule ID",
      });
    }

    const existing = await PricingRule.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Pricing rule not found",
      });
    }

    const input = pricingService.normalizeRuleInput({
      ...existing.toObject(),
      ...req.body,
    });

    Object.assign(existing, input, {
      updatedBy: req.user._id,
    });

    await existing.save();

    await deactivateCompetingRules(
      existing,
      req.user._id
    );

    return res.json({
      success: true,
      rule: ruleResponse(existing),
      message: "Pricing rule updated successfully",
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to update pricing rule",
      code: error.code || "PRICING_RULE_UPDATE_FAILED",
    });
  }
};

exports.disableRule = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pricing rule ID",
      });
    }

    const rule = await PricingRule.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isActive: false,
          updatedBy: req.user._id,
        },
      },
      { returnDocument: "after" }
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Pricing rule not found",
      });
    }

    return res.json({
      success: true,
      rule: ruleResponse(rule),
      message: "Pricing rule disabled",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to disable pricing rule",
    });
  }
};

exports.previewPricing = async (req, res) => {
  try {
    const server = pricingService.normalizeServer(req.body.server);
    const country = pricingService.normalizeCountry(req.body.country);
    const service = pricingService.normalizeService(req.body.service);
    const operator = pricingService.normalizeOperator(req.body.operator);

    const quote = await providerManager.getPrice({
      server,
      country,
      service,
      operator,
    });

    const hasDraftRule = Boolean(req.body.pricingMode);

    const pricing = await pricingService.resolveCustomerPricing({
      server,
      country,
      service,
      operator,
      providerPrice: quote.price,
      providerCurrency: quote.currency,
      draftRule: hasDraftRule ? req.body : null,
    });

    return res.json({
      success: true,
      preview: {
        server,
        country,
        service,
        operator,
        providerCost: pricing.providerPrice,
        providerCurrency: pricing.providerCurrency,
        providerCostNgn: pricing.providerCostNgn,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        stock: Number.isFinite(Number(quote.stock))
          ? Number(quote.stock)
          : 0,
        pricingMode: pricing.pricingMode,
        pricingSource: pricing.pricingSource,
        pricingRuleId: pricing.pricingRuleId
          ? String(pricing.pricingRuleId)
          : null,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to preview pricing",
      code: error.code || "PRICING_PREVIEW_FAILED",
    });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const match = {};
    const dateRange = createDateRange(req.query);

    if (dateRange) {
      match.createdAt = dateRange;
    }

    if (req.query.server) {
      match.server = pricingService.normalizeServer(req.query.server);
    }

    const [result] = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            { $match: { refunded: { $ne: true } } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: {
                  $sum: { $ifNull: ["$sellingPrice", "$price"] },
                },
                totalProviderCost: {
                  $sum: { $ifNull: ["$providerCostNgn", 0] },
                },
                totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
              },
            },
          ],
          statuses: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          servers: [
            { $match: { refunded: { $ne: true } } },
            {
              $group: {
                _id: "$server",
                orders: { $sum: 1 },
                revenue: {
                  $sum: { $ifNull: ["$sellingPrice", "$price"] },
                },
                providerCost: {
                  $sum: { $ifNull: ["$providerCostNgn", 0] },
                },
                profit: { $sum: { $ifNull: ["$profit", 0] } },
              },
            },
          ],
        },
      },
    ]);

    const totals = result?.totals?.[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalProviderCost: 0,
      totalProfit: 0,
    };

    const statuses = Object.fromEntries(
      (result?.statuses || []).map((item) => [item._id, item.count])
    );

    const servers = Object.fromEntries(
      (result?.servers || []).map((item) => [
        item._id,
        {
          orders: item.orders,
          revenue: item.revenue,
          providerCost: item.providerCost,
          profit: item.profit,
        },
      ])
    );

    return res.json({
      success: true,
      summary: {
        ...totals,
        waitingOrders: statuses.waiting || 0,
        receivedOrders: statuses.received || 0,
        cancelledOrders: statuses.cancelled || 0,
        expiredOrders: statuses.expired || 0,
        server1: servers.server1 || {
          orders: 0,
          revenue: 0,
          providerCost: 0,
          profit: 0,
        },
        server2: servers.server2 || {
          orders: 0,
          revenue: 0,
          providerCost: 0,
          profit: 0,
        },
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to load dashboard summary",
    });
  }
};

exports.getSales = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 100000);
    const limit = parsePositiveInteger(req.query.limit, 25, 100);
    const filter = {};
    const dateRange = createDateRange(req.query);

    if (dateRange) {
      filter.createdAt = dateRange;
    }

    if (req.query.server) {
      filter.server = pricingService.normalizeServer(req.query.server);
    }

    if (req.query.status) {
      filter.status = String(req.query.status).trim().toLowerCase();
    }

    if (req.query.country) {
      filter.country = pricingService.normalizeCountry(req.query.country);
    }

    if (req.query.service) {
      filter.service = pricingService.normalizeService(req.query.service);
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();
      filter.$or = [
        { customerEmail: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { otpCode: { $regex: search, $options: "i" } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "firstName lastName email")
        .lean(),
      Order.countDocuments(filter),
    ]);

    const sales = orders.map((order) => ({
      id: String(order._id),
      server: order.server,
      customer: {
        id: order.user?._id ? String(order.user._id) : null,
        firstName: order.user?.firstName || "",
        lastName: order.user?.lastName || "",
        email: order.customerEmail || order.user?.email || "",
      },
      country: order.country,
      service: order.service,
      operator: order.operator,
      phoneNumber: order.phoneNumber,
      otpCode: order.otpCode,
      status: order.status,
      providerCost: order.providerPrice,
      providerCurrency: order.providerCurrency,
      providerCostNgn: order.providerCostNgn,
      sellingPrice: order.sellingPrice || order.price,
      profit: order.profit,
      refunded: order.refunded,
      financialStatus: order.financialStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      otpReceivedAt: order.otpReceivedAt,
    }));

    return res.json({
      success: true,
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Unable to load sales records",
    });
  }
};
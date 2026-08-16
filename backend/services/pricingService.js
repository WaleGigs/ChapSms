const PricingRule = require("../models/PricingRule");

const VALID_SERVERS = new Set(["server1", "server2"]);
const VALID_PRICING_MODES = new Set([
  "fixed",
  "percentage",
  "cost_plus",
]);

function createPricingError(
  message,
  {
    code = "PRICING_ERROR",
    status = 400,
  } = {}
) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeServer(value) {
  const server = String(value || "").trim().toLowerCase();

  if (!VALID_SERVERS.has(server)) {
    throw createPricingError("Please select a valid server", {
      code: "INVALID_SERVER",
      status: 400,
    });
  }

  return server;
}

function normalizeCountry(value) {
  const country = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!country) {
    throw createPricingError("Country is required", {
      code: "COUNTRY_REQUIRED",
    });
  }

  return country;
}

function normalizeService(value) {
  const service = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (!service) {
    throw createPricingError("Service is required", {
      code: "SERVICE_REQUIRED",
    });
  }

  return service;
}

function normalizeDisplayName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeServiceDisplayName(value) {
  return normalizeDisplayName(value).replace(/\s+/g, "");
}

function normalizeOperator(value) {
  return String(value || "any").trim().toLowerCase() || "any";
}

function normalizeCurrency(value) {
  return String(value || "NGN").trim().toUpperCase();
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function convertProviderCostToNaira(providerPrice, providerCurrency) {
  const price = Number(providerPrice);

  if (!Number.isFinite(price) || price <= 0) {
    throw createPricingError("The server returned an invalid provider price", {
      code: "INVALID_PROVIDER_PRICE",
      status: 502,
    });
  }

  const currency = normalizeCurrency(providerCurrency);

  if (currency === "NGN") {
    return Math.ceil(price);
  }

  if (currency !== "USD") {
    throw createPricingError(
      `Unsupported provider currency: ${currency}`,
      {
        code: "UNSUPPORTED_PROVIDER_CURRENCY",
        status: 500,
      }
    );
  }

  const exchangeRate = Number(process.env.NGN_PER_USD);

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw createPricingError("NGN_PER_USD is not configured", {
      code: "EXCHANGE_RATE_NOT_CONFIGURED",
      status: 500,
    });
  }

  return Math.ceil(price * exchangeRate);
}

function normalizeRuleInput(input = {}) {
  const pricingMode = String(input.pricingMode || "fixed")
    .trim()
    .toLowerCase();

  if (!VALID_PRICING_MODES.has(pricingMode)) {
    throw createPricingError("Select a valid pricing mode", {
      code: "INVALID_PRICING_MODE",
    });
  }

  const normalized = {
    server: normalizeServer(input.server),
    country: normalizeCountry(input.country),
    countryName: String(input.countryName || "").trim(),
    service: normalizeService(input.service),
    serviceName: String(input.serviceName || "").trim(),
    operator: normalizeOperator(input.operator),
    pricingMode,
    fixedSellingPrice: finiteNonNegative(input.fixedSellingPrice),
    markupPercent: finiteNonNegative(input.markupPercent),
    fixedMarkup: finiteNonNegative(input.fixedMarkup),
    minimumSellingPrice: finiteNonNegative(input.minimumSellingPrice),
    isActive: input.isActive !== false,
    notes: String(input.notes || "").trim(),
  };

  if (
    pricingMode === "fixed" &&
    normalized.fixedSellingPrice <= 0
  ) {
    throw createPricingError(
      "Fixed selling price must be greater than zero",
      {
        code: "INVALID_FIXED_PRICE",
      }
    );
  }

  return normalized;
}

function ruleMatchesSelection(
  rule,
  {
    country,
    service,
    countryName = "",
    serviceName = "",
  }
) {
  const normalizedCountry = normalizeCountry(country);
  const normalizedService = normalizeService(service);
  const normalizedCountryName =
    normalizeDisplayName(countryName);
  const normalizedServiceName =
    normalizeServiceDisplayName(serviceName);

  const ruleCountry = normalizeCountry(rule.country);
  const ruleService = normalizeService(rule.service);
  const ruleCountryName =
    normalizeDisplayName(rule.countryName);
  const ruleServiceName =
    normalizeServiceDisplayName(rule.serviceName);

  const countryMatches =
    ruleCountry === normalizedCountry ||
    (
      normalizedCountryName &&
      ruleCountryName &&
      ruleCountryName === normalizedCountryName
    );

  const serviceMatches =
    ruleService === normalizedService ||
    (
      normalizedServiceName &&
      ruleServiceName &&
      ruleServiceName === normalizedServiceName
    );

  return countryMatches && serviceMatches;
}

function selectOperatorRule(
  rules,
  normalizedOperator
) {
  return (
    rules.find(
      (rule) =>
        normalizeOperator(rule.operator) ===
        normalizedOperator
    ) ||
    rules.find(
      (rule) =>
        normalizeOperator(rule.operator) ===
        "any"
    ) ||
    null
  );
}

async function findApplicableRule({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
  operator = "any",
}) {
  const normalizedServer = normalizeServer(server);
  const normalizedCountry = normalizeCountry(country);
  const normalizedService = normalizeService(service);
  const normalizedOperator = normalizeOperator(operator);

  const operators =
    normalizedOperator === "any"
      ? ["any"]
      : [normalizedOperator, "any"];

  /*
   * Fast path: exact provider IDs.
   */
  const exactRules = await PricingRule.find({
    server: normalizedServer,
    country: normalizedCountry,
    service: normalizedService,
    operator: { $in: operators },
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const exactRule = selectOperatorRule(
    exactRules,
    normalizedOperator
  );

  if (exactRule) {
    return exactRule;
  }

  /*
   * Compatibility path for rules saved with a display
   * label instead of the current provider ID.
   */
  const candidateRules = await PricingRule.find({
    server: normalizedServer,
    operator: { $in: operators },
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const matchingRules = candidateRules.filter(
    (rule) =>
      ruleMatchesSelection(rule, {
        country: normalizedCountry,
        service: normalizedService,
        countryName,
        serviceName,
      })
  );

  return selectOperatorRule(
    matchingRules,
    normalizedOperator
  );
}

async function findPreferredOperatorRule({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
}) {
  const normalizedServer =
    normalizeServer(server);

  const normalizedCountry =
    normalizeCountry(country);

  const normalizedService =
    normalizeService(service);

  const exactRules = await PricingRule.find({
    server: normalizedServer,
    country: normalizedCountry,
    service: normalizedService,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  let rules = exactRules;

  if (!rules.length) {
    const candidates = await PricingRule.find({
      server: normalizedServer,
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .lean();

    rules = candidates.filter(
      (rule) =>
        ruleMatchesSelection(rule, {
          country: normalizedCountry,
          service: normalizedService,
          countryName,
          serviceName,
        })
    );
  }

  return (
    rules.find(
      (rule) =>
        normalizeOperator(
          rule.operator
        ) !== "any"
    ) ||
    rules.find(
      (rule) =>
        normalizeOperator(
          rule.operator
        ) === "any"
    ) ||
    null
  );
}

async function resolveEffectiveOperator({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
  requestedOperator = "any",
}) {
  const normalizedRequestedOperator =
    normalizeOperator(
      requestedOperator
    );

  if (
    normalizedRequestedOperator !==
    "any"
  ) {
    return normalizedRequestedOperator;
  }

  const preferredRule =
    await findPreferredOperatorRule({
      server,
      country,
      service,
      countryName,
      serviceName,
    });

  return preferredRule
    ? normalizeOperator(
        preferredRule.operator
      )
    : "any";
}

function createDefaultRule({ server, country, service, operator }) {
  /*
   * No manual database rule:
   * use ChapsSms global Cheapest + Buffer pricing.
   *
   * Example:
   * provider cost = ₦850
   * buffer        = ₦200
   * floor         = ₦1,000
   * selling price = max(850 + 200, 1000) = ₦1,050
   *
   * provider cost = ₦45
   * selling price = max(45 + 200, 1000) = ₦1,000
   */
  const fixedMarkup = finiteNonNegative(
    process.env.AUTO_PRICING_BUFFER_NGN,
    200
  );

  const minimumSellingPrice = finiteNonNegative(
    process.env.AUTO_PRICING_MINIMUM_NGN,
    1000
  );

  return {
    _id: null,
    server,
    country,
    service,
    operator,
    pricingMode: "cost_plus",
    fixedSellingPrice: 0,
    markupPercent: 0,
    fixedMarkup,
    minimumSellingPrice,
    isActive: true,
    source: "automatic_cheapest_buffer",
  };
}

function calculateSellingPrice(providerCostNgn, rule) {
  let sellingPrice;

  switch (rule.pricingMode) {
    case "fixed":
      sellingPrice = Number(rule.fixedSellingPrice);
      break;

    case "cost_plus":
      sellingPrice =
        providerCostNgn + finiteNonNegative(rule.fixedMarkup, 0);
      break;

    case "percentage":
    default:
      sellingPrice =
        providerCostNgn *
        (1 + finiteNonNegative(rule.markupPercent, 0) / 100);
      break;
  }

  sellingPrice = Math.ceil(sellingPrice);
  sellingPrice = Math.max(
    sellingPrice,
    Math.ceil(finiteNonNegative(rule.minimumSellingPrice, 0))
  );

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw createPricingError("The configured selling price is invalid", {
      code: "INVALID_SELLING_PRICE",
      status: 500,
    });
  }

  if (sellingPrice < providerCostNgn) {
    throw createPricingError(
      "The configured selling price is lower than the current provider cost. The admin must update this pricing rule.",
      {
        code: "SELLING_PRICE_BELOW_COST",
        status: 409,
      }
    );
  }

  return sellingPrice;
}

async function resolveCustomerPricing({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
  operator = "any",
  providerPrice,
  providerCurrency,
  draftRule = null,
}) {
  const normalizedServer = normalizeServer(server);
  const normalizedCountry = normalizeCountry(country);
  const normalizedService = normalizeService(service);
  const normalizedOperator = normalizeOperator(operator);

  const providerCostNgn = convertProviderCostToNaira(
    providerPrice,
    providerCurrency
  );

  let rule;

  if (draftRule) {
    rule = {
      ...normalizeRuleInput({
        ...draftRule,
        server: normalizedServer,
        country: normalizedCountry,
        service: normalizedService,
        operator: normalizedOperator,
      }),
      _id: draftRule._id || null,
      source: "draft",
    };
  } else {
    rule = await findApplicableRule({
      server: normalizedServer,
      country: normalizedCountry,
      service: normalizedService,
      countryName,
      serviceName,
      operator: normalizedOperator,
    });
  }

  if (!rule) {
    rule = createDefaultRule({
      server: normalizedServer,
      country: normalizedCountry,
      service: normalizedService,
      operator: normalizedOperator,
    });
  }

  const sellingPrice = calculateSellingPrice(providerCostNgn, rule);
  const profit = sellingPrice - providerCostNgn;

  return {
    server: normalizedServer,
    country: normalizedCountry,
    service: normalizedService,
    operator: normalizedOperator,
    providerPrice: Number(providerPrice),
    providerCurrency: normalizeCurrency(providerCurrency),
    providerCostNgn,
    sellingPrice,
    profit,
    pricingRuleId: rule._id || null,
    pricingMode: rule.pricingMode,
    pricingSource: rule.source || "database",
    pricingRuleMatched: Boolean(rule._id),
    pricingSnapshot: {
      ruleId: rule._id ? String(rule._id) : null,
      pricingMode: rule.pricingMode,
      fixedSellingPrice: finiteNonNegative(rule.fixedSellingPrice),
      markupPercent: finiteNonNegative(rule.markupPercent),
      fixedMarkup: finiteNonNegative(rule.fixedMarkup),
      minimumSellingPrice: finiteNonNegative(rule.minimumSellingPrice),
      source: rule.source || "database",
      calculatedAt: new Date(),
    },
  };
}

module.exports = {
  VALID_SERVERS,
  VALID_PRICING_MODES,
  createPricingError,
  normalizeServer,
  normalizeCountry,
  normalizeService,
  normalizeDisplayName,
  normalizeServiceDisplayName,
  normalizeOperator,
  normalizeRuleInput,
  convertProviderCostToNaira,
  ruleMatchesSelection,
  findApplicableRule,
  findPreferredOperatorRule,
  resolveEffectiveOperator,
  resolveCustomerPricing,
};

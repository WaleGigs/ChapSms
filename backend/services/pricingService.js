const PricingRule = require("../models/PricingRule");

const VALID_SERVERS = new Set(["server1", "server2"]);
const VALID_PRICING_MODES = new Set([
  "fixed",
  "percentage",
  "cost_plus",
]);
const VALID_PRICING_STYLES = new Set([
  "cheapest_buffer",
  "fixed_operator",
]);

function createPricingError(message, { code = "PRICING_ERROR", status = 400 } = {}) {
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
    throw createPricingError("Country is required", { code: "COUNTRY_REQUIRED" });
  }
  return country;
}

function normalizeService(value) {
  const service = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!service) {
    throw createPricingError("Service is required", { code: "SERVICE_REQUIRED" });
  }
  return service;
}

function normalizeDisplayName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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

function normalizePricingStyle(value, operator = "any") {
  const style = String(value || "").trim().toLowerCase();
  if (VALID_PRICING_STYLES.has(style)) return style;

  /* Backward compatibility with rules saved before Pricing Style existed. */
  return normalizeOperator(operator) === "any"
    ? "cheapest_buffer"
    : "fixed_operator";
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
  if (currency === "NGN") return Math.ceil(price);
  if (currency !== "USD") {
    throw createPricingError(`Unsupported provider currency: ${currency}`, {
      code: "UNSUPPORTED_PROVIDER_CURRENCY",
      status: 500,
    });
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
  const pricingMode = String(input.pricingMode || "percentage")
    .trim()
    .toLowerCase();
  if (!VALID_PRICING_MODES.has(pricingMode)) {
    throw createPricingError("Select a valid pricing mode", {
      code: "INVALID_PRICING_MODE",
    });
  }

  const requestedOperator = normalizeOperator(input.operator);
  const pricingStyle = normalizePricingStyle(input.pricingStyle, requestedOperator);
  const operator = pricingStyle === "cheapest_buffer" ? "any" : requestedOperator;

  if (pricingStyle === "fixed_operator" && operator === "any") {
    throw createPricingError("Choose an operator for Fixed operator pricing", {
      code: "FIXED_OPERATOR_REQUIRED",
    });
  }

  const normalized = {
    server: normalizeServer(input.server),
    country: normalizeCountry(input.country),
    countryName: String(input.countryName || "").trim(),
    service: normalizeService(input.service),
    serviceName: String(input.serviceName || "").trim(),
    operator,
    pricingStyle,
    maxPriceBufferPercent: finiteNonNegative(input.maxPriceBufferPercent, 50),
    pricingMode,
    fixedSellingPrice: finiteNonNegative(input.fixedSellingPrice),
    markupPercent: finiteNonNegative(input.markupPercent),
    fixedMarkup: finiteNonNegative(input.fixedMarkup),
    minimumSellingPrice: finiteNonNegative(input.minimumSellingPrice),
    isActive: input.isActive !== false,
    notes: String(input.notes || "").trim(),
  };

  if (normalized.maxPriceBufferPercent > 500) {
    throw createPricingError("Max price buffer cannot be greater than 500%", {
      code: "INVALID_PRICE_BUFFER",
    });
  }

  if (pricingMode === "fixed" && normalized.fixedSellingPrice <= 0) {
    throw createPricingError("Fixed selling price must be greater than zero", {
      code: "INVALID_FIXED_PRICE",
    });
  }

  return normalized;
}

function ruleMatchesSelection(rule, { country, service, countryName = "", serviceName = "" }) {
  const normalizedCountry = normalizeCountry(country);
  const normalizedService = normalizeService(service);
  const normalizedCountryName = normalizeDisplayName(countryName);
  const normalizedServiceName = normalizeServiceDisplayName(serviceName);

  const countryMatches =
    normalizeCountry(rule.country) === normalizedCountry ||
    (normalizedCountryName &&
      normalizeDisplayName(rule.countryName) &&
      normalizeDisplayName(rule.countryName) === normalizedCountryName);

  const serviceMatches =
    normalizeService(rule.service) === normalizedService ||
    (normalizedServiceName &&
      normalizeServiceDisplayName(rule.serviceName) &&
      normalizeServiceDisplayName(rule.serviceName) === normalizedServiceName);

  return countryMatches && serviceMatches;
}

async function findRulesForSelection({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
}) {
  const normalizedServer = normalizeServer(server);
  const normalizedCountry = normalizeCountry(country);
  const normalizedService = normalizeService(service);

  const exact = await PricingRule.find({
    server: normalizedServer,
    country: normalizedCountry,
    service: normalizedService,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (exact.length) return exact;

  const candidates = await PricingRule.find({
    server: normalizedServer,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return candidates.filter((rule) =>
    ruleMatchesSelection(rule, {
      country: normalizedCountry,
      service: normalizedService,
      countryName,
      serviceName,
    })
  );
}

async function findPreferredOperatorRule(options) {
  const rules = await findRulesForSelection(options);
  return rules[0] || null;
}

async function findApplicableRule({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
  operator = "any",
}) {
  const rules = await findRulesForSelection({
    server,
    country,
    service,
    countryName,
    serviceName,
  });

  if (!rules.length) return null;

  const normalizedOperator = normalizeOperator(operator);
  const exact = rules.find(
    (rule) => normalizeOperator(rule.operator) === normalizedOperator
  );
  const automatic = rules.find(
    (rule) => normalizeOperator(rule.operator) === "any"
  );

  /* Newest strategy wins; exact is mainly for legacy explicit-operator rules. */
  return rules[0] || exact || automatic || null;
}

async function resolvePricingStrategy({
  server,
  country,
  service,
  countryName = "",
  serviceName = "",
  requestedOperator = "any",
}) {
  const requested = normalizeOperator(requestedOperator);

  if (requested !== "any") {
    return {
      operator: requested,
      pricingStyle: "fixed_operator",
      maxPriceBufferPercent: 0,
      rule: null,
      source: "customer_operator",
    };
  }

  const rule = await findPreferredOperatorRule({
    server,
    country,
    service,
    countryName,
    serviceName,
  });

  if (rule) {
    const pricingStyle = normalizePricingStyle(rule.pricingStyle, rule.operator);
    return {
      operator:
        pricingStyle === "fixed_operator"
          ? normalizeOperator(rule.operator)
          : "any",
      pricingStyle,
      maxPriceBufferPercent: finiteNonNegative(rule.maxPriceBufferPercent, 50),
      rule,
      source: "database",
    };
  }

  return {
    operator: "any",
    pricingStyle: "cheapest_buffer",
    maxPriceBufferPercent: finiteNonNegative(
      process.env.AUTO_PRICING_MAX_PRICE_BUFFER_PERCENT,
      50
    ),
    rule: null,
    source: "automatic_default",
  };
}

async function resolveEffectiveOperator(options) {
  return (await resolvePricingStrategy(options)).operator;
}

function createDefaultRule({ server, country, service, operator }) {
  return {
    _id: null,
    server,
    country,
    service,
    operator,
    pricingStyle: "cheapest_buffer",
    maxPriceBufferPercent: finiteNonNegative(
      process.env.AUTO_PRICING_MAX_PRICE_BUFFER_PERCENT,
      50
    ),
    pricingMode: "cost_plus",
    fixedSellingPrice: 0,
    markupPercent: 0,
    fixedMarkup: finiteNonNegative(process.env.AUTO_PRICING_BUFFER_NGN, 200),
    minimumSellingPrice: finiteNonNegative(
      process.env.AUTO_PRICING_MINIMUM_NGN,
      1000
    ),
    isActive: true,
    source: "automatic_cheapest_buffer",
  };
}

function roundUpToHundred(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.ceil(number / 100) * 100 : number;
}

function calculateSellingPrice(pricingBasisNgn, rule) {
  let sellingPrice;

  if (rule.pricingMode === "fixed") {
    sellingPrice = Number(rule.fixedSellingPrice);
  } else if (rule.pricingMode === "cost_plus") {
    sellingPrice = Math.ceil(
      pricingBasisNgn + finiteNonNegative(rule.fixedMarkup, 0)
    );
  } else {
    sellingPrice = roundUpToHundred(
      pricingBasisNgn *
        (1 + finiteNonNegative(rule.markupPercent, 0) / 100)
    );
  }

  sellingPrice = Math.max(
    Math.ceil(sellingPrice),
    Math.ceil(finiteNonNegative(rule.minimumSellingPrice, 0))
  );

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw createPricingError("The configured selling price is invalid", {
      code: "INVALID_SELLING_PRICE",
      status: 500,
    });
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
  pricingBasisNgn = null,
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
        operator:
          String(draftRule.pricingStyle) === "cheapest_buffer"
            ? "any"
            : normalizedOperator,
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

  const basisCandidate = Number(pricingBasisNgn);
  const effectiveBasisNgn =
    Number.isFinite(basisCandidate) && basisCandidate > 0
      ? Math.max(providerCostNgn, Math.ceil(basisCandidate))
      : providerCostNgn;

  const sellingPrice = calculateSellingPrice(effectiveBasisNgn, rule);
  if (sellingPrice < providerCostNgn) {
    throw createPricingError(
      "The configured selling price is lower than the current provider cost. Update this pricing rule.",
      { code: "SELLING_PRICE_BELOW_COST", status: 409 }
    );
  }

  const pricingStyle = normalizePricingStyle(rule.pricingStyle, rule.operator);
  const profit = sellingPrice - providerCostNgn;

  return {
    server: normalizedServer,
    country: normalizedCountry,
    service: normalizedService,
    operator: normalizedOperator,
    providerPrice: Number(providerPrice),
    providerCurrency: normalizeCurrency(providerCurrency),
    providerCostNgn,
    pricingBasisNgn: effectiveBasisNgn,
    sellingPrice,
    profit,
    pricingRuleId: rule._id || null,
    pricingMode: rule.pricingMode,
    pricingStyle,
    maxPriceBufferPercent: finiteNonNegative(rule.maxPriceBufferPercent, 50),
    pricingSource: rule.source || "database",
    pricingRuleMatched: Boolean(rule._id),
    pricingSnapshot: {
      ruleId: rule._id ? String(rule._id) : null,
      pricingMode: rule.pricingMode,
      pricingStyle,
      maxPriceBufferPercent: finiteNonNegative(rule.maxPriceBufferPercent, 50),
      pricingBasisNgn: effectiveBasisNgn,
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
  VALID_PRICING_STYLES,
  createPricingError,
  normalizeServer,
  normalizeCountry,
  normalizeService,
  normalizeDisplayName,
  normalizeServiceDisplayName,
  normalizeOperator,
  normalizePricingStyle,
  normalizeRuleInput,
  convertProviderCostToNaira,
  ruleMatchesSelection,
  findApplicableRule,
  findPreferredOperatorRule,
  resolvePricingStrategy,
  resolveEffectiveOperator,
  resolveCustomerPricing,
};

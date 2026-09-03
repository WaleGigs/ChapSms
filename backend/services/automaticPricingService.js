const Order = require("../models/Order");
const providerManager = require("./providers/providerManager");
const pricingService = require("./pricingService");

const selectionCache = new Map();

function positiveInteger(value, fallback, maximum = 20) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function getCacheTtlMs() {
  return positiveInteger(process.env.AUTO_OPERATOR_CACHE_TTL_MS, 15000, 120000);
}

function getHistoryLookbackDays() {
  return positiveInteger(process.env.AUTO_RELIABILITY_LOOKBACK_DAYS, 90, 365);
}

function getHistoryLimit() {
  return positiveInteger(process.env.AUTO_RELIABILITY_MAX_ORDERS, 1000, 5000);
}

function getMinimumReliableSamples() {
  return positiveInteger(process.env.AUTO_RELIABILITY_MIN_SAMPLES, 3, 50);
}

function getOperatorId(operator) {
  return String(
    operator?.id ?? operator?.operator ?? operator?.providerId ?? operator?.poolId ?? ""
  )
    .trim()
    .toLowerCase();
}

function getOperatorPrice(operator) {
  return Number(operator?.price ?? operator?.cost ?? operator?.amount);
}

function getOperatorStock(operator) {
  const stock = Number(operator?.stock ?? operator?.count ?? operator?.quantity ?? 0);
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

function getProviderReliability(operator) {
  for (const value of [
    operator?.successRate,
    operator?.success_rate,
    operator?.deliveryRate,
    operator?.delivery_rate,
    operator?.rate,
    operator?.quality,
  ]) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) continue;

    /* Accept either 0..1 or 0..100 provider metrics. */
    if (number <= 1) return number;
    if (number <= 100) return number / 100;
  }

  return null;
}

function normalizeCandidate(operator, fallbackCurrency) {
  const id = getOperatorId(operator);
  const providerPrice = getOperatorPrice(operator);
  const stock = getOperatorStock(operator);

  if (
    !id ||
    operator?.available === false ||
    stock <= 0 ||
    !Number.isFinite(providerPrice) ||
    providerPrice <= 0
  ) {
    return null;
  }

  const providerCurrency = String(
    operator?.currency || fallbackCurrency || "NGN"
  )
    .trim()
    .toUpperCase();

  let providerCostNgn;

  try {
    providerCostNgn = pricingService.convertProviderCostToNaira(
      providerPrice,
      providerCurrency
    );
  } catch {
    return null;
  }

  return {
    operator: id,
    name: String(operator?.name || operator?.label || `Operator ${id}`).trim(),
    providerPrice,
    providerCurrency,
    providerCostNgn,
    stock,
    providerReliability: getProviderReliability(operator),
  };
}

function wilsonLowerBound(successes, total, z = 1.96) {
  if (!Number.isFinite(total) || total <= 0) return null;

  const p = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = p + zSquared / (2 * total);
  const margin =
    z *
    Math.sqrt(
      (p * (1 - p) + zSquared / (4 * total)) / total
    );

  return Math.max(0, (center - margin) / denominator);
}

function hasDeliveredOtp(order) {
  return Boolean(
    order?.otpReceivedAt ||
      String(order?.otpCode || "").trim() ||
      String(order?.status || "").toLowerCase() === "received"
  );
}

async function loadHistoricalReliability({
  server,
  country,
  service,
  operators,
}) {
  const normalizedOperators = [
    ...new Set(
      (operators || [])
        .map((operator) => String(operator || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  if (!normalizedOperators.length) return new Map();

  const since = new Date(
    Date.now() - getHistoryLookbackDays() * 24 * 60 * 60 * 1000
  );

  try {
    const orders = await Order.find({
      server: String(server || "").trim().toLowerCase(),
      country: String(country || "").trim().toLowerCase(),
      service: String(service || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ""),
      operator: { $in: normalizedOperators },
      createdAt: { $gte: since },
      $or: [
        { status: { $in: ["received", "expired"] } },
        { otpReceivedAt: { $exists: true, $ne: null } },
        { otpCode: { $exists: true, $nin: ["", null] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(getHistoryLimit())
      .select("operator status otpCode otpReceivedAt createdAt")
      .lean();

    const stats = new Map();

    for (const operator of normalizedOperators) {
      stats.set(operator, {
        successCount: 0,
        failureCount: 0,
        sampleSize: 0,
        successRate: null,
        confidenceScore: null,
        proven: false,
      });
    }

    for (const order of orders) {
      const operator = String(order?.operator || "").trim().toLowerCase();
      const current = stats.get(operator);
      if (!current) continue;

      const success = hasDeliveredOtp(order);
      const status = String(order?.status || "").trim().toLowerCase();
      const failure = !success && status === "expired";

      /* Waiting/cancelling/cancelled orders do not prove OTP failure. */
      if (!success && !failure) continue;

      current.sampleSize += 1;
      if (success) current.successCount += 1;
      if (failure) current.failureCount += 1;
    }

    const minimumSamples = getMinimumReliableSamples();

    for (const current of stats.values()) {
      if (current.sampleSize > 0) {
        current.successRate =
          (current.successCount / current.sampleSize) * 100;
        current.confidenceScore = wilsonLowerBound(
          current.successCount,
          current.sampleSize
        );
        current.proven = current.sampleSize >= minimumSamples;
      }
    }

    return stats;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Automatic pricing] OTP reliability history unavailable; using live fallback:",
        error.message
      );
    }

    return new Map();
  }
}

function selectionScore(candidate) {
  const history = candidate?.history;

  if (history?.sampleSize > 0 && Number.isFinite(history.confidenceScore)) {
    return history.confidenceScore;
  }

  if (Number.isFinite(candidate?.providerReliability)) {
    return candidate.providerReliability;
  }

  /*
   * Unknown operators get a neutral conservative baseline.
   * This deliberately ranks a repeatedly failing operator below an untested one,
   * while requiring more than a single lucky success to look "certain".
   */
  return 0.25;
}

function rankCheapPool(cheapPool) {
  return [...cheapPool].sort((a, b) => {
    const scoreDifference = selectionScore(b) - selectionScore(a);
    if (scoreDifference !== 0) return scoreDifference;

    const aSamples = Number(a?.history?.sampleSize || 0);
    const bSamples = Number(b?.history?.sampleSize || 0);
    if (bSamples !== aSamples) return bSamples - aSamples;

    const aSuccessRate = Number(a?.history?.successRate ?? -1);
    const bSuccessRate = Number(b?.history?.successRate ?? -1);
    if (bSuccessRate !== aSuccessRate) return bSuccessRate - aSuccessRate;

    if (b.stock !== a.stock) return b.stock - a.stock;
    return a.providerCostNgn - b.providerCostNgn;
  });
}

async function buildCheapBand({
  candidates,
  maxPriceBufferPercent,
  server,
  country,
  service,
}) {
  const sorted = [...candidates].sort((a, b) =>
    a.providerCostNgn !== b.providerCostNgn
      ? a.providerCostNgn - b.providerCostNgn
      : b.stock - a.stock
  );

  const floorCostNgn = sorted[0]?.providerCostNgn || 0;
  const buffer = finiteNonNegative(maxPriceBufferPercent, 50);
  const pricingBasisNgn = Math.ceil(floorCostNgn * (1 + buffer / 100));

  /*
   * Price defines the eligible band. Reliability then decides which operator
   * inside that cheap band should be preferred. Cap only for pathological lists.
   */
  const cheapPool = sorted
    .filter((item) => item.providerCostNgn <= pricingBasisNgn)
    .slice(0, 50);

  const historyMap = await loadHistoricalReliability({
    server,
    country,
    service,
    operators: cheapPool.map((item) => item.operator),
  });

  const withHistory = cheapPool.map((item) => ({
    ...item,
    history:
      historyMap.get(item.operator) || {
        successCount: 0,
        failureCount: 0,
        sampleSize: 0,
        successRate: null,
        confidenceScore: null,
        proven: false,
      },
  }));

  const ranked = rankCheapPool(withHistory);

  return {
    floorCostNgn,
    pricingBasisNgn,
    buffer,
    ranked,
  };
}

function cacheKey({
  server,
  country,
  service,
  maxPriceBufferPercent,
  exchangeRate,
}) {
  return [server, country, service, maxPriceBufferPercent, exchangeRate]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function getCached(key) {
  const cached = selectionCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    selectionCache.delete(key);
    return null;
  }

  return cached;
}

function putCached(key, value) {
  selectionCache.set(key, {
    ...value,
    expiresAt: Date.now() + getCacheTtlMs(),
  });
}

async function quoteOperator({ server, country, service, operator }) {
  const quote = await providerManager.getPrice({
    server,
    country,
    service,
    operator,
  });

  const price = Number(quote?.price);
  const stock = Number(quote?.stock);

  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error("The selected operator returned an invalid price");
    error.status = 502;
    error.code = "INVALID_PRICE";
    throw error;
  }

  if (Number.isFinite(stock) && stock <= 0) {
    const error = new Error("The selected operator has no stock");
    error.status = 409;
    error.code = "NO_NUMBERS";
    throw error;
  }

  return quote;
}

function summarizeCandidate(item) {
  return {
    operator: item.operator,
    providerCostNgn: item.providerCostNgn,
    stock: item.stock,
    otpSuccessRate:
      Number.isFinite(item?.history?.successRate)
        ? Number(item.history.successRate.toFixed(1))
        : null,
    otpSuccessCount: Number(item?.history?.successCount || 0),
    otpFailureCount: Number(item?.history?.failureCount || 0),
    otpSampleSize: Number(item?.history?.sampleSize || 0),
    reliabilityProven: item?.history?.proven === true,
    reliabilityScore: Number(selectionScore(item).toFixed(4)),
  };
}

async function buildFreshSelection({
  server,
  country,
  service,
  maxPriceBufferPercent = 50,
}) {
  const response = await providerManager.getOperators({
    server,
    country,
    service,
  });

  const currency = response?.currency || "NGN";
  const candidates = (
    Array.isArray(response?.operators) ? response.operators : []
  )
    .map((item) => normalizeCandidate(item, currency))
    .filter(Boolean);

  if (!candidates.length) {
    const error = new Error("No operator with live stock is currently available");
    error.status = 409;
    error.code = "NO_NUMBERS";
    throw error;
  }

  const band = await buildCheapBand({
    candidates,
    maxPriceBufferPercent,
    server,
    country,
    service,
  });

  if (!band.ranked.length) {
    const error = new Error(
      "No operator is inside the configured cheapest price buffer"
    );
    error.status = 409;
    error.code = "NO_NUMBERS_IN_PRICE_BUFFER";
    throw error;
  }

  let lastError = null;

  for (const candidate of band.ranked) {
    try {
      const quote = await quoteOperator({
        server,
        country,
        service,
        operator: candidate.operator,
      });

      const freshCostNgn = pricingService.convertProviderCostToNaira(
        quote.price,
        quote.currency
      );

      if (freshCostNgn > band.pricingBasisNgn) continue;

      const selected = {
        ...candidate,
        providerCostNgn: freshCostNgn,
      };

      const historySamples = Number(selected?.history?.sampleSize || 0);

      return {
        operator: candidate.operator,
        quote,
        selected,
        candidateCount: candidates.length,
        eligibleCount: band.ranked.length,
        floorCostNgn: band.floorCostNgn,
        pricingBasisNgn: band.pricingBasisNgn,
        maxPriceBufferPercent: band.buffer,
        otpSuccessRate:
          Number.isFinite(selected?.history?.successRate)
            ? Number(selected.history.successRate.toFixed(1))
            : null,
        otpSuccessCount: Number(selected?.history?.successCount || 0),
        otpFailureCount: Number(selected?.history?.failureCount || 0),
        otpSampleSize: historySamples,
        reliabilityProven: selected?.history?.proven === true,
        cheapPool: band.ranked.map(summarizeCandidate),
        strategy:
          historySamples > 0
            ? "cheapest_buffer_historical_otp_reliability"
            : "cheapest_buffer_live_stock_fallback",
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;

  const error = new Error("No automatic operator could provide a valid live quote");
  error.status = 409;
  error.code = "NO_NUMBERS";
  throw error;
}

async function resolveAutomaticQuote({
  server,
  country,
  service,
  maxPriceBufferPercent = 50,
}) {
  const exchangeRate = await pricingService.getExchangeRate();
  const buffer = finiteNonNegative(maxPriceBufferPercent, 50);
  const key = cacheKey({
    server,
    country,
    service,
    maxPriceBufferPercent: buffer,
    exchangeRate: exchangeRate.rate,
  });

  const cached = getCached(key);

  if (cached?.operator) {
    try {
      const quote = await quoteOperator({
        server,
        country,
        service,
        operator: cached.operator,
      });

      const costNgn = pricingService.convertProviderCostToNaira(
        quote.price,
        quote.currency
      );

      if (costNgn <= cached.pricingBasisNgn) {
        return {
          ...cached,
          quote,
          selected: cached.selected
            ? { ...cached.selected, providerCostNgn: costNgn }
            : null,
          strategy: `${cached.strategy}_cached`,
        };
      }

      selectionCache.delete(key);
    } catch {
      selectionCache.delete(key);
    }
  }

  try {
    const selection = await buildFreshSelection({
      server,
      country,
      service,
      maxPriceBufferPercent: buffer,
    });

    putCached(key, {
      operator: selection.operator,
      selected: selection.selected,
      candidateCount: selection.candidateCount,
      eligibleCount: selection.eligibleCount,
      floorCostNgn: selection.floorCostNgn,
      pricingBasisNgn: selection.pricingBasisNgn,
      maxPriceBufferPercent: selection.maxPriceBufferPercent,
      otpSuccessRate: selection.otpSuccessRate,
      otpSuccessCount: selection.otpSuccessCount,
      otpFailureCount: selection.otpFailureCount,
      otpSampleSize: selection.otpSampleSize,
      reliabilityProven: selection.reliabilityProven,
      cheapPool: selection.cheapPool,
      strategy: selection.strategy,
    });

    return selection;
  } catch (operatorError) {
    try {
      const quote = await providerManager.getPrice({
        server,
        country,
        service,
        operator: "any",
      });

      const floorCostNgn = pricingService.convertProviderCostToNaira(
        quote.price,
        quote.currency
      );

      return {
        operator:
          String(quote?.operator || "any").trim().toLowerCase() || "any",
        quote,
        selected: null,
        candidateCount: 0,
        eligibleCount: 0,
        floorCostNgn,
        pricingBasisNgn: Math.ceil(floorCostNgn * (1 + buffer / 100)),
        maxPriceBufferPercent: buffer,
        otpSuccessRate: null,
        otpSuccessCount: 0,
        otpFailureCount: 0,
        otpSampleSize: 0,
        reliabilityProven: false,
        cheapPool: [],
        strategy: "provider_any_fallback_with_price_buffer",
      };
    } catch {
      throw operatorError;
    }
  }
}

module.exports = { resolveAutomaticQuote };
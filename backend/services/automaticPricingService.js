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
function getCandidateCount() {
  return positiveInteger(process.env.AUTO_PRICING_CANDIDATES, 5, 10);
}
function getCacheTtlMs() {
  return positiveInteger(process.env.AUTO_OPERATOR_CACHE_TTL_MS, 15000, 120000);
}
function getOperatorId(operator) {
  return String(
    operator?.id ?? operator?.operator ?? operator?.providerId ?? operator?.poolId ?? ""
  ).trim().toLowerCase();
}
function getOperatorPrice(operator) {
  return Number(operator?.price ?? operator?.cost ?? operator?.amount);
}
function getOperatorStock(operator) {
  const stock = Number(operator?.stock ?? operator?.count ?? operator?.quantity ?? 0);
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}
function getReliability(operator) {
  for (const value of [
    operator?.successRate,
    operator?.success_rate,
    operator?.deliveryRate,
    operator?.delivery_rate,
    operator?.rate,
    operator?.quality,
  ]) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}
function normalizeCandidate(operator, fallbackCurrency) {
  const id = getOperatorId(operator);
  const providerPrice = getOperatorPrice(operator);
  const stock = getOperatorStock(operator);
  if (
    !id || operator?.available === false || stock <= 0 ||
    !Number.isFinite(providerPrice) || providerPrice <= 0
  ) return null;

  const providerCurrency = String(operator?.currency || fallbackCurrency || "NGN")
    .trim().toUpperCase();

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
    reliability: getReliability(operator),
  };
}

function buildCheapBand(candidates, maxPriceBufferPercent) {
  const sorted = [...candidates].sort((a, b) =>
    a.providerCostNgn !== b.providerCostNgn
      ? a.providerCostNgn - b.providerCostNgn
      : b.stock - a.stock
  );

  const floorCostNgn = sorted[0]?.providerCostNgn || 0;
  const buffer = finiteNonNegative(maxPriceBufferPercent, 50);
  const pricingBasisNgn = Math.ceil(floorCostNgn * (1 + buffer / 100));

  /* Preserve the user's earlier "cheapest 5" requirement inside the buffer. */
  const cheapPool = sorted
    .filter((item) => item.providerCostNgn <= pricingBasisNgn)
    .slice(0, getCandidateCount());

  const hasReliability = cheapPool.some((item) =>
    Number.isFinite(item.reliability)
  );

  const ranked = [...cheapPool].sort((a, b) => {
    if (hasReliability) {
      const ar = Number.isFinite(a.reliability) ? a.reliability : -1;
      const br = Number.isFinite(b.reliability) ? b.reliability : -1;
      if (br !== ar) return br - ar;
    }
    if (b.stock !== a.stock) return b.stock - a.stock;
    return a.providerCostNgn - b.providerCostNgn;
  });

  return { floorCostNgn, pricingBasisNgn, buffer, ranked };
}

function cacheKey({ server, country, service, maxPriceBufferPercent }) {
  return [server, country, service, maxPriceBufferPercent]
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
  selectionCache.set(key, { ...value, expiresAt: Date.now() + getCacheTtlMs() });
}

async function quoteOperator({ server, country, service, operator }) {
  const quote = await providerManager.getPrice({ server, country, service, operator });
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

async function buildFreshSelection({
  server,
  country,
  service,
  maxPriceBufferPercent = 50,
}) {
  const response = await providerManager.getOperators({ server, country, service });
  const currency = response?.currency || "NGN";
  const candidates = (Array.isArray(response?.operators) ? response.operators : [])
    .map((item) => normalizeCandidate(item, currency))
    .filter(Boolean);

  if (!candidates.length) {
    const error = new Error("No operator with live stock is currently available");
    error.status = 409;
    error.code = "NO_NUMBERS";
    throw error;
  }

  const band = buildCheapBand(candidates, maxPriceBufferPercent);
  if (!band.ranked.length) {
    const error = new Error("No operator is inside the configured cheapest price buffer");
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

      return {
        operator: candidate.operator,
        quote,
        selected: { ...candidate, providerCostNgn: freshCostNgn },
        candidateCount: candidates.length,
        eligibleCount: band.ranked.length,
        floorCostNgn: band.floorCostNgn,
        pricingBasisNgn: band.pricingBasisNgn,
        maxPriceBufferPercent: band.buffer,
        cheapPool: band.ranked.map((item) => ({
          operator: item.operator,
          providerCostNgn: item.providerCostNgn,
          stock: item.stock,
        })),
        strategy: "cheapest_buffer_best_stock",
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
  const buffer = finiteNonNegative(maxPriceBufferPercent, 50);
  const key = cacheKey({ server, country, service, maxPriceBufferPercent: buffer });
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
        operator: String(quote?.operator || "any").trim().toLowerCase() || "any",
        quote,
        selected: null,
        candidateCount: 0,
        eligibleCount: 0,
        floorCostNgn,
        pricingBasisNgn: Math.ceil(floorCostNgn * (1 + buffer / 100)),
        maxPriceBufferPercent: buffer,
        cheapPool: [],
        strategy: "provider_any_fallback_with_price_buffer",
      };
    } catch {
      throw operatorError;
    }
  }
}

module.exports = { resolveAutomaticQuote };

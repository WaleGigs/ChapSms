const providerManager = require(
  "./providers/providerManager"
);
const pricingService = require(
  "./pricingService"
);

/*
 * ChapsSms automatic operator strategy
 * ------------------------------------
 * 1. Ignore operators/pools with no stock or invalid price.
 * 2. Convert every provider price to NGN.
 * 3. Sort by provider cost and keep only the cheapest N (default 5).
 * 4. Inside that cheap pool:
 *      - prefer a real reliability/rate field if a provider ever exposes one;
 *      - otherwise use live stock as the availability/stability signal;
 *      - use lower cost as the final tie-breaker.
 * 5. Fetch a fresh quote for the chosen operator.
 *
 * We deliberately do not retry a NUMBER PURCHASE here. This service only
 * performs safe read/quote operations. The existing order controller still
 * owns the one purchase attempt + automatic wallet rollback.
 */

const selectionCache = new Map();

function positiveNumber(
  value,
  fallback
) {
  const number = Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? number
    : fallback;
}

function positiveInteger(
  value,
  fallback,
  maximum = 20
) {
  const number =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return fallback;
  }

  return Math.min(
    number,
    maximum
  );
}

function getCandidateCount() {
  return positiveInteger(
    process.env
      .AUTO_PRICING_CANDIDATES,
    5,
    10
  );
}

function getCacheTtlMs() {
  return positiveInteger(
    process.env
      .AUTO_OPERATOR_CACHE_TTL_MS,
    15000,
    120000
  );
}

function getOperatorId(operator) {
  return String(
    operator?.id ??
      operator?.operator ??
      operator?.providerId ??
      operator?.poolId ??
      ""
  )
    .trim()
    .toLowerCase();
}

function getOperatorPrice(
  operator
) {
  return Number(
    operator?.price ??
      operator?.cost ??
      operator?.amount
  );
}

function getOperatorStock(
  operator
) {
  const stock =
    Number(
      operator?.stock ??
        operator?.count ??
        operator?.quantity ??
        0
    );

  return Number.isFinite(stock)
    ? Math.max(0, stock)
    : 0;
}

/*
 * Future-proof only:
 * current SMSBower + BenOTP operator lists do not expose a verified
 * delivery/success metric. If a provider later supplies one, ChapsSms
 * can use it without changing this strategy.
 */
function getReliability(
  operator
) {
  const possibilities = [
    operator?.successRate,
    operator?.success_rate,
    operator?.deliveryRate,
    operator?.delivery_rate,
    operator?.rate,
    operator?.quality,
  ];

  for (
    const value of possibilities
  ) {
    const number =
      Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return number;
    }
  }

  return null;
}

function normalizeCandidate(
  operator,
  fallbackCurrency
) {
  const id =
    getOperatorId(operator);

  const providerPrice =
    getOperatorPrice(operator);

  const stock =
    getOperatorStock(operator);

  const available =
    operator?.available !== false;

  if (
    !id ||
    !available ||
    stock <= 0 ||
    !Number.isFinite(
      providerPrice
    ) ||
    providerPrice <= 0
  ) {
    return null;
  }

  const providerCurrency =
    String(
      operator?.currency ||
        fallbackCurrency ||
        "NGN"
    )
      .trim()
      .toUpperCase();

  let providerCostNgn;

  try {
    providerCostNgn =
      pricingService
        .convertProviderCostToNaira(
          providerPrice,
          providerCurrency
        );
  } catch {
    return null;
  }

  if (
    !Number.isFinite(
      providerCostNgn
    ) ||
    providerCostNgn <= 0
  ) {
    return null;
  }

  return {
    id,
    operator: id,

    name:
      String(
        operator?.name ||
          operator?.label ||
          `Operator ${id}`
      ).trim(),

    providerPrice,
    providerCurrency,
    providerCostNgn,
    stock,

    reliability:
      getReliability(
        operator
      ),
  };
}

function rankCheapCandidates(
  candidates
) {
  const cheapCount =
    getCandidateCount();

  /*
   * FIRST: decide what "cheap" means.
   */
  const cheapest =
    [...candidates]
      .sort(
        (
          first,
          second
        ) => {
          const costDifference =
            first
              .providerCostNgn -
            second
              .providerCostNgn;

          if (
            costDifference !== 0
          ) {
            return costDifference;
          }

          return (
            second.stock -
            first.stock
          );
        }
      )
      .slice(
        0,
        cheapCount
      );

  const hasReliability =
    cheapest.some(
      (item) =>
        Number.isFinite(
          item.reliability
        )
    );

  /*
   * SECOND: from only the cheapest N, choose the option most likely
   * to remain available.
   *
   * Today this means stock first because that is the trustworthy
   * quality signal supplied by both current provider integrations.
   */
  return [...cheapest].sort(
    (
      first,
      second
    ) => {
      if (hasReliability) {
        const firstRate =
          Number.isFinite(
            first.reliability
          )
            ? first.reliability
            : -1;

        const secondRate =
          Number.isFinite(
            second.reliability
          )
            ? second.reliability
            : -1;

        if (
          secondRate !==
          firstRate
        ) {
          return (
            secondRate -
            firstRate
          );
        }
      }

      if (
        second.stock !==
        first.stock
      ) {
        return (
          second.stock -
          first.stock
        );
      }

      return (
        first.providerCostNgn -
        second.providerCostNgn
      );
    }
  );
}

function cacheKey({
  server,
  country,
  service,
}) {
  return [
    server,
    country,
    service,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
    )
    .join("|");
}

function getCachedSelection(
  key
) {
  const cached =
    selectionCache.get(key);

  if (!cached) {
    return null;
  }

  if (
    Date.now() >
    cached.expiresAt
  ) {
    selectionCache.delete(
      key
    );
    return null;
  }

  return cached;
}

function setCachedSelection(
  key,
  value
) {
  selectionCache.set(
    key,
    {
      ...value,
      expiresAt:
        Date.now() +
        getCacheTtlMs(),
    }
  );
}

function clearCachedSelection(
  key
) {
  selectionCache.delete(key);
}

async function quoteOperator({
  server,
  country,
  service,
  operator,
}) {
  const quote =
    await providerManager
      .getPrice({
        server,
        country,
        service,
        operator,
      });

  const price =
    Number(
      quote?.price
    );

  const stock =
    Number(
      quote?.stock
    );

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    const error =
      new Error(
        "The selected automatic operator returned an invalid price"
      );

    error.status = 502;
    error.code =
      "INVALID_PRICE";

    throw error;
  }

  /*
   * Some upstream price methods do not provide an exact stock count.
   * A known zero means unavailable; a missing/non-finite value is not
   * treated as a failure here.
   */
  if (
    Number.isFinite(stock) &&
    stock <= 0
  ) {
    const error =
      new Error(
        "The selected automatic operator has no stock"
      );

    error.status = 409;
    error.code =
      "NO_NUMBERS";

    throw error;
  }

  return quote;
}

async function buildFreshSelection({
  server,
  country,
  service,
}) {
  const response =
    await providerManager
      .getOperators({
        server,
        country,
        service,
      });

  const fallbackCurrency =
    response?.currency ||
    "NGN";

  const candidates =
    (
      Array.isArray(
        response?.operators
      )
        ? response.operators
        : []
    )
      .map((operator) =>
        normalizeCandidate(
          operator,
          fallbackCurrency
        )
      )
      .filter(Boolean);

  if (!candidates.length) {
    const error =
      new Error(
        "No affordable operator with live stock is currently available"
      );

    error.status = 409;
    error.code =
      "NO_NUMBERS";

    throw error;
  }

  const ranked =
    rankCheapCandidates(
      candidates
    );

  if (!ranked.length) {
    const error =
      new Error(
        "No automatic operator candidate is currently available"
      );

    error.status = 409;
    error.code =
      "NO_NUMBERS";

    throw error;
  }

  /*
   * Quoting is read-only, so it is safe to check the ranked cheap
   * candidates one by one if availability changed after getOperators().
   */
  let lastError = null;

  for (
    const candidate of ranked
  ) {
    try {
      const quote =
        await quoteOperator({
          server,
          country,
          service,
          operator:
            candidate.operator,
        });

      return {
        operator:
          candidate.operator,
        quote,
        selected:
          candidate,

        candidateCount:
          candidates.length,

        cheapPool:
          ranked.map(
            (item) => ({
              operator:
                item.operator,
              providerCostNgn:
                item.providerCostNgn,
              stock:
                item.stock,
            })
          ),

        strategy:
          "cheapest_candidates_then_best_stock",
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  const error =
    new Error(
      "No automatic operator could provide a valid quote"
    );

  error.status = 409;
  error.code =
    "NO_NUMBERS";
  throw error;
}

async function resolveAutomaticQuote({
  server,
  country,
  service,
}) {
  const key =
    cacheKey({
      server,
      country,
      service,
    });

  const cached =
    getCachedSelection(key);

  if (cached?.operator) {
    try {
      const quote =
        await quoteOperator({
          server,
          country,
          service,
          operator:
            cached.operator,
        });

      return {
        operator:
          cached.operator,
        quote,
        selected:
          cached.selected ||
          null,
        candidateCount:
          cached.candidateCount ||
          0,
        cheapPool:
          cached.cheapPool ||
          [],
        strategy:
          `${cached.strategy || "automatic"}_cached`,
      };
    } catch {
      clearCachedSelection(
        key
      );
    }
  }

  try {
    const selection =
      await buildFreshSelection({
        server,
        country,
        service,
      });

    setCachedSelection(
      key,
      {
        operator:
          selection.operator,
        selected:
          selection.selected,
        candidateCount:
          selection.candidateCount,
        cheapPool:
          selection.cheapPool,
        strategy:
          selection.strategy,
      }
    );

    return selection;
  } catch (operatorError) {
    /*
     * Resilience fallback:
     * if the provider's operator-list endpoint is temporarily unavailable,
     * keep ChapsSms usable with the provider's ordinary "any" quote.
     * The pricing service still applies the minimum-profit buffer, so this
     * fallback does NOT silently sell below the configured auto margin.
     */
    try {
      const quote =
        await providerManager
          .getPrice({
            server,
            country,
            service,
            operator: "any",
          });

      return {
        operator:
          String(
            quote?.operator ||
              "any"
          )
            .trim()
            .toLowerCase() ||
          "any",
        quote,
        selected: null,
        candidateCount: 0,
        cheapPool: [],
        strategy:
          "provider_any_fallback_with_buffer",
      };
    } catch {
      throw operatorError;
    }
  }
}

module.exports = {
  resolveAutomaticQuote,
};

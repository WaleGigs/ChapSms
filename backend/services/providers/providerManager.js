const smsbower = require("./smsBower");
const benotp = require("./benOtp");

const PROVIDERS = {
  smsbower,
  benotp,
};

function normalizeProviderName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function createManagerError(
  message,
  {
    code = "PROVIDER_MANAGER_ERROR",
    status = 500,
    retryable = false,
    provider,
    failures,
  } = {}
) {
  const error = new Error(message);

  error.code = code;
  error.status = status;
  error.retryable = retryable;

  if (provider) {
    error.provider = provider;
  }

  if (failures) {
    error.failures = failures;
  }

  return error;
}

function getProvider(providerName) {
  const normalizedName =
    normalizeProviderName(providerName);

  const provider = PROVIDERS[normalizedName];

  if (!provider) {
    throw createManagerError(
      `Unsupported SMS provider: ${providerName}`,
      {
        code: "UNSUPPORTED_PROVIDER",
        status: 500,
        retryable: false,
        provider: normalizedName || providerName,
      }
    );
  }

  return provider;
}

function getProviderPriority() {
  const primary = normalizeProviderName(
    process.env.PRIMARY_PROVIDER ||
      "smsbower"
  );

  const secondary = normalizeProviderName(
    process.env.SECONDARY_PROVIDER ||
      "benotp"
  );

  const priority = [];

  for (const providerName of [
    primary,
    secondary,
    ...Object.keys(PROVIDERS),
  ]) {
    if (
      PROVIDERS[providerName] &&
      !priority.includes(providerName)
    ) {
      priority.push(providerName);
    }
  }

  if (priority.length === 0) {
    throw createManagerError(
      "No SMS providers are configured",
      {
        code: "NO_PROVIDERS_CONFIGURED",
        status: 500,
        retryable: false,
      }
    );
  }

  return priority;
}

function isProviderEnabled(providerName) {
  const normalizedName =
    normalizeProviderName(providerName);

  const variableName =
    `${normalizedName.toUpperCase()}_ENABLED`;

  return (
    String(
      process.env[variableName] || "true"
    )
      .trim()
      .toLowerCase() !== "false"
  );
}

function serializeFailure(
  providerName,
  error
) {
  return {
    provider: providerName,
    message:
      error?.message ||
      "Provider request failed",
    code:
      error?.code ||
      "PROVIDER_ERROR",
    status:
      Number(error?.status) || 502,
    retryable:
      Boolean(error?.retryable),
  };
}

function createAllProvidersFailedError(
  failures
) {
  const details = failures
    .map(
      (failure) =>
        `${failure.provider}: ${failure.message}`
    )
    .join(" | ");

  return createManagerError(
    details
      ? `All SMS providers failed. ${details}`
      : "All SMS providers failed",
    {
      code: "ALL_PROVIDERS_FAILED",
      status: 503,
      retryable: false,
      failures,
    }
  );
}

/**
 * Executes an operation through one provider only.
 * Used when the customer explicitly selects a server.
 */
async function executeWithSelectedProvider(
  providerName,
  operationName,
  operation
) {
  const normalizedProviderName =
    normalizeProviderName(providerName);

  if (!PROVIDERS[normalizedProviderName]) {
    throw createManagerError(
      `Unsupported SMS provider: ${providerName}`,
      {
        code: "UNSUPPORTED_PROVIDER",
        status: 400,
        retryable: false,
        provider: normalizedProviderName || providerName,
      }
    );
  }

  if (!isProviderEnabled(normalizedProviderName)) {
    throw createManagerError(
      `${normalizedProviderName} is currently unavailable`,
      {
        code: "PROVIDER_DISABLED",
        status: 503,
        retryable: false,
        provider: normalizedProviderName,
      }
    );
  }

  const selectedProvider = getProvider(normalizedProviderName);

  try {
    const result = await operation(
      selectedProvider,
      normalizedProviderName
    );

    if (!result || typeof result !== "object") {
      throw createManagerError(
        `${normalizedProviderName} returned an invalid ${operationName} response`,
        {
          code: "INVALID_PROVIDER_RESPONSE",
          status: 502,
          retryable: false,
          provider: normalizedProviderName,
        }
      );
    }

    return {
      ...result,
      provider: result.provider || normalizedProviderName,
    };
  } catch (error) {
    error.provider = error.provider || normalizedProviderName;
    throw error;
  }
}

/**
 * Safe failover executor.
 *
 * Only use this before an activation has
 * successfully been created.
 */
async function executeWithFailover(
  operationName,
  operation
) {
  const failures = [];

  for (
    const providerName of
    getProviderPriority()
  ) {
    if (
      !isProviderEnabled(providerName)
    ) {
      failures.push({
        provider: providerName,
        message: "Provider is disabled",
        code: "PROVIDER_DISABLED",
        status: 503,
        retryable: true,
      });

      continue;
    }

    const provider =
      getProvider(providerName);

    try {
      const result = await operation(
        provider,
        providerName
      );

      if (
        !result ||
        typeof result !== "object"
      ) {
        throw createManagerError(
          `${providerName} returned an invalid ${operationName} response`,
          {
            code:
              "INVALID_PROVIDER_RESPONSE",
            status: 502,
            retryable: true,
            provider: providerName,
          }
        );
      }

      return {
        ...result,
        provider:
          result.provider ||
          providerName,
      };
    } catch (error) {
      const failure =
        serializeFailure(
          providerName,
          error
        );

      failures.push(failure);

      console.warn(
        `[providerManager] ${operationName} failed through ${providerName}`,
        failure
      );

      if (!error.retryable) {
        error.provider =
          error.provider ||
          providerName;

        error.failures =
          failures;

        throw error;
      }
    }
  }

  throw createAllProvidersFailedError(
    failures
  );
}

/**
 * Purchases a number.
 *
 * Price lookup and purchase are performed
 * against the same provider so that a quote
 * from one provider is not used for a purchase
 * from another provider.
 */
async function buyNumber(options = {}) {
  const operation = async (provider, providerName) => {
    let priceQuote = null;

    if (typeof provider.getPrice === "function") {
      priceQuote = await provider.getPrice(options);
    }

    const result = await provider.buyNumber(options);

    if (result?.orders && Array.isArray(result.orders)) {
      throw createManagerError(
        "Bulk provider responses are not supported by the current ChapsSmS order flow",
        {
          code: "BULK_ORDER_NOT_SUPPORTED",
          status: 400,
          retryable: false,
          provider: providerName,
        }
      );
    }

    if (!result?.providerOrderId || !result?.phoneNumber) {
      throw createManagerError(
        `${providerName} did not return a valid activation ID and phone number`,
        {
          code: "INVALID_PURCHASE_RESPONSE",
          status: 502,
          retryable: false,
          provider: providerName,
        }
      );
    }

    const returnedProviderPrice = Number(result.providerPrice);
    const quotedProviderPrice = Number(priceQuote?.price);

    const providerPrice =
      Number.isFinite(returnedProviderPrice) && returnedProviderPrice > 0
        ? returnedProviderPrice
        : Number.isFinite(quotedProviderPrice) && quotedProviderPrice > 0
          ? quotedProviderPrice
          : null;

    return {
      ...result,
      provider: providerName,
      providerOrderId: String(result.providerOrderId),
      phoneNumber: String(result.phoneNumber),
      providerPrice,
      providerCurrency:
        result.providerCurrency || priceQuote?.currency || null,
      priceQuote: priceQuote || null,
    };
  };

  if (options.provider) {
    return executeWithSelectedProvider(
      options.provider,
      "number purchase",
      operation
    );
  }

  return executeWithFailover("number purchase", operation);
}

async function getPrice(options = {}) {
  const operation = async (provider, providerName) => {
    const result = await provider.getPrice(options);
    const price = Number(result?.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw createManagerError(
        `${providerName} returned an invalid price`,
        {
          code: "INVALID_PRICE",
          status: 502,
          retryable: false,
          provider: providerName,
        }
      );
    }

    return {
      provider: providerName,
      service: result.service || options.service || null,
      country: result.country || options.country || null,
      price,
      stock: Number.isFinite(Number(result.stock))
        ? Number(result.stock)
        : 0,
      currency: result.currency || null,
      raw: result.raw ?? result,
    };
  };

  if (options.provider) {
    return executeWithSelectedProvider(
      options.provider,
      "price request",
      operation
    );
  }

  return executeWithFailover("price request", operation);
}

async function getBalance() {
  return executeWithFailover(
    "balance request",
    async (
      provider,
      providerName
    ) => {
      const result =
        await provider.getBalance();

      return {
        ...result,
        provider:
          result.provider ||
          providerName,
      };
    }
  );
}

async function getCountries() {
  return executeWithFailover(
    "countries request",
    async (
      provider,
      providerName
    ) => {
      const result =
        await provider.getCountries();

      return {
        provider: providerName,
        countries:
          result.countries ||
          result,
        raw:
          result.raw ??
          result,
      };
    }
  );
}

async function getServices() {
  return executeWithFailover(
    "services request",
    async (
      provider,
      providerName
    ) => {
      const result =
        await provider.getServices();

      return {
        provider: providerName,
        services:
          result.services ||
          result,
        raw:
          result.raw ??
          result,
      };
    }
  );
}

/**
 * Once an activation exists, failover is
 * prohibited. Every operation must use the
 * provider that owns the activation.
 */

async function getOrder(
  providerName,
  providerOrderId
) {
  const normalizedProviderName =
    normalizeProviderName(
      providerName
    );

  const provider =
    getProvider(
      normalizedProviderName
    );

  const result =
    await provider.getOrder(
      String(providerOrderId)
    );

  return {
    ...result,
    provider:
      result.provider ||
      normalizedProviderName,
    providerOrderId: String(
      result.providerOrderId ||
      providerOrderId
    ),
  };
}

async function getSms(
  providerName,
  providerOrderId
) {
  const normalizedProviderName =
    normalizeProviderName(
      providerName
    );

  const provider =
    getProvider(
      normalizedProviderName
    );

  const result =
    typeof provider.getSms ===
    "function"
      ? await provider.getSms(
          String(providerOrderId)
        )
      : await provider.getOrder(
          String(providerOrderId)
        );

  return {
    ...result,
    provider:
      result.provider ||
      normalizedProviderName,
    providerOrderId: String(
      result.providerOrderId ||
      providerOrderId
    ),
  };
}

async function cancelOrder(
  providerName,
  providerOrderId
) {
  const normalizedProviderName =
    normalizeProviderName(
      providerName
    );

  const provider =
    getProvider(
      normalizedProviderName
    );

  const result =
    await provider.cancelOrder(
      String(providerOrderId)
    );

  return {
    ...result,
    provider:
      result.provider ||
      normalizedProviderName,
    providerOrderId: String(
      result.providerOrderId ||
      providerOrderId
    ),
  };
}

async function finishOrder(
  providerName,
  providerOrderId
) {
  const normalizedProviderName =
    normalizeProviderName(
      providerName
    );

  const provider =
    getProvider(
      normalizedProviderName
    );

  if (
    typeof provider.finishOrder !==
    "function"
  ) {
    throw createManagerError(
      `${normalizedProviderName} does not support manually finishing an activation`,
      {
        code:
          "OPERATION_NOT_SUPPORTED",
        status: 400,
        retryable: false,
        provider:
          normalizedProviderName,
      }
    );
  }

  const result =
    await provider.finishOrder(
      String(providerOrderId)
    );

  return {
    ...result,
    provider:
      result.provider ||
      normalizedProviderName,
    providerOrderId: String(
      result.providerOrderId ||
      providerOrderId
    ),
  };
}

async function getProviderBalances() {
  const providerEntries =
    Object.entries(PROVIDERS);

  const results =
    await Promise.allSettled(
      providerEntries.map(
        async ([
          providerName,
          provider,
        ]) => {
          if (
            !isProviderEnabled(
              providerName
            )
          ) {
            return {
              provider:
                providerName,
              enabled: false,
              healthy: false,
              message:
                "Provider is disabled",
            };
          }

          const balance =
            await provider.getBalance();

          return {
            provider:
              providerName,
            enabled: true,
            healthy: true,
            ...balance,
          };
        }
      )
    );

  return results.map(
    (result, index) => {
      const providerName =
        providerEntries[index][0];

      if (
        result.status ===
        "fulfilled"
      ) {
        return result.value;
      }

      return {
        provider: providerName,
        enabled:
          isProviderEnabled(
            providerName
          ),
        healthy: false,
        message:
          result.reason?.message ||
          "Provider health check failed",
        code:
          result.reason?.code ||
          "PROVIDER_HEALTH_FAILED",
      };
    }
  );
}

module.exports = {
  buyNumber,
  getPrice,
  getBalance,
  getCountries,
  getServices,
  getOrder,
  getSms,
  cancelOrder,
  finishOrder,
  getProvider,
  getProviderBalances,
};
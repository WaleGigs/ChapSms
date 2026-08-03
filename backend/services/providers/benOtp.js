const axios = require("axios");
const https = require("https");
const dns = require("dns");

const PROVIDER_NAME = "benotp";

function getApiKey() {
  const apiKey = String(process.env.BENOTP_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("BENOTP_API_KEY is not configured");
  }

  return apiKey;
}

function ipv4Lookup(hostname, options, callback) {
  const lookupOptions =
    typeof options === "number"
      ? { family: options }
      : { ...options };

  dns.lookup(
    hostname,
    {
      ...lookupOptions,
      family: 4,
      all: false,
    },
    callback
  );
}

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  maxCachedSessions: 0,
  minVersion: "TLSv1.2",
  rejectUnauthorized: true,
  lookup: ipv4Lookup,
});

const BENOTP_BASE_URL = String(
  process.env.BENOTP_BASE_URL ||
    "https://benotp.com/stubs/handler.php"
).trim();

const api = axios.create({
  baseURL: BENOTP_BASE_URL,
  timeout: 30000,
  httpsAgent,
  family: 4,
  headers: {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 ChapsSmS/1.0",
  },
});

function normalizeRequired(value, fieldName) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}
function normalizeBenOtpCountry(country) {
  const value = normalizeRequired(
    country,
    "Country"
  )
    .trim()
    .toLowerCase();

  const map = {
    usa: "US",
    us: "US",
    "united states": "US",
    "united states of america": "US",

    uk: "GB",
    gb: "GB",
    "united kingdom": "GB",

    nigeria: "NG",
    ng: "NG",

    canada: "CA",
    ca: "CA",

    australia: "AU",
    au: "AU",

    france: "FR",
    fr: "FR",

    germany: "DE",
    de: "DE",
  };

  return map[value] || value.toUpperCase();
}
function getResponseText(data) {
  if (typeof data === "string") {
    return data.trim();
  }

  if (data === null || data === undefined) {
    return "";
  }

  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return String(data).trim();
}

function createProviderError(message, options = {}) {
  const error = new Error(message);

  error.provider = PROVIDER_NAME;
  error.status = options.status || 502;
  error.code = options.code || "BENOTP_ERROR";
  error.retryable = options.retryable ?? false;
  error.rawResponse = options.rawResponse;

  return error;
}

function isRetryableNetworkError(error) {
  const code = String(
    error?.code || ""
  ).toUpperCase();

  const message = String(
    error?.message || ""
  ).toLowerCase();

  const retryableCodes = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "ECONNREFUSED",
    "EPIPE",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
    "ERR_NETWORK",
    "ERR_SSL_BAD_RECORD_MAC",
    "ERR_TLS_HANDSHAKE_TIMEOUT",
    "UND_ERR_CONNECT_TIMEOUT",
  ]);

  return (
    retryableCodes.has(code) ||
    message.includes("socket disconnected") ||
    message.includes("before secure tls connection") ||
    message.includes("tls handshake")
  );
}

function classifyProviderError(responseText) {
  const value = String(responseText || "").trim();
  const upper = value.toUpperCase();

  if (!value) {
    return createProviderError("BenOTP returned an empty response", {
      code: "EMPTY_RESPONSE",
      retryable: true,
    });
  }

  if (
    upper.includes("NO_NUMBERS") ||
    upper.includes("NO_NUMBER") ||
    upper.includes("NO_STOCK") ||
    upper.includes("OUT_OF_STOCK")
  ) {
    return createProviderError("No BenOTP numbers are currently available", {
      status: 409,
      code: "NO_NUMBERS",
      retryable: true,
      rawResponse: value,
    });
  }

  if (
    upper.includes("NO_BALANCE") ||
    upper.includes("INSUFFICIENT") ||
    upper.includes("NOT_ENOUGH")
  ) {
    return createProviderError("BenOTP provider balance is insufficient", {
      status: 503,
      code: "PROVIDER_BALANCE_LOW",
      retryable: true,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_KEY") ||
    upper.includes("INVALID_KEY") ||
    upper.includes("WRONG_API_KEY") ||
    upper.includes("UNAUTHORIZED")
  ) {
    return createProviderError("BenOTP API key is invalid", {
      status: 500,
      code: "INVALID_API_KEY",
      retryable: false,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_SERVICE") ||
    upper.includes("INVALID_SERVICE")
  ) {
    return createProviderError("BenOTP service is invalid", {
      status: 400,
      code: "INVALID_SERVICE",
      retryable: false,
      rawResponse: value,
    });
  }

  if (
    upper.includes("BAD_COUNTRY") ||
    upper.includes("INVALID_COUNTRY")
  ) {
    return createProviderError("BenOTP country is invalid", {
      status: 400,
      code: "INVALID_COUNTRY",
      retryable: false,
      rawResponse: value,
    });
  }

  if (upper.startsWith("ERROR")) {
    return createProviderError(value, {
      status: 502,
      code: "PROVIDER_ERROR",
      retryable: true,
      rawResponse: value,
    });
  }

  return null;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function request(params, options = {}) {
  const maximumAttempts =
    options.retryable === false ? 1 : 3;

  let finalError = null;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[BenOTP] outgoing request:", {
          baseURL: BENOTP_BASE_URL,
          action: params.action,
          attempt,
          params: {
            ...params,
            api_key: "***hidden***",
          },
        });
      }

      const response = await api.get("", {
        params: {
          api_key: getApiKey(),
          ...params,
        },
        family: 4,
      });

      const responseText = getResponseText(
        response.data
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[BenOTP] incoming response:", {
          action: params.action,
          attempt,
          status: response.status,
          contentType:
            response.headers?.["content-type"],
          data: response.data,
        });
      }

      const providerError =
        classifyProviderError(responseText);

      if (providerError) {
        throw providerError;
      }

      return {
        data: response.data,
        text: responseText,
      };
    } catch (error) {
      if (error?.provider === PROVIDER_NAME) {
        const retryableProviderError =
          options.retryable !== false &&
          Boolean(error.retryable);

        finalError = error;

        if (
          !retryableProviderError ||
          attempt === maximumAttempts
        ) {
          throw error;
        }
      } else {
        const responseText = getResponseText(
          error?.response?.data
        );

        const status = Number(
          error?.response?.status
        );

        const retryable =
          options.retryable !== false &&
          (
            isRetryableNetworkError(error) ||
            (
              Number.isFinite(status) &&
              status >= 500
            )
          );

        finalError = createProviderError(
          responseText ||
            error?.message ||
            "BenOTP request failed",
          {
            status: status || 502,
            code:
              error?.code ||
              "BENOTP_REQUEST_FAILED",
            retryable,
            rawResponse: responseText,
          }
        );

        console.error("[BenOTP] request failed:", {
          baseURL: BENOTP_BASE_URL,
          action: params.action,
          attempt,
          maximumAttempts,
          code: error?.code,
          message: error?.message,
          status: error?.response?.status,
          retryable,
        });

        if (
          !retryable ||
          attempt === maximumAttempts
        ) {
          throw finalError;
        }
      }

      const delay =
        750 * 2 ** (attempt - 1);

      await wait(delay);
    }
  }

  throw (
    finalError ||
    createProviderError(
      "BenOTP request failed",
      {
        code: "BENOTP_REQUEST_FAILED",
        retryable: true,
      }
    )
  );
}

function parseBalance(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Supports likely formats such as:
   * ACCESS_BALANCE:1400
   * BALANCE:1400
   * 1400
   */
  const parts = value.split(":");
  const numericValue = Number(parts[parts.length - 1]);

  if (!Number.isFinite(numericValue)) {
    throw createProviderError(
      `Unable to parse BenOTP balance response: ${value}`,
      {
        code: "INVALID_BALANCE_RESPONSE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  return numericValue;
}

function parsePrice(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Documented format:
   * ACCESS_PRICE:FINAL_PRICE:STOCK_QUANTITY
   *
   * Example:
   * ACCESS_PRICE:1021.25:50
   */
  const parts = value.split(":");

  if (parts[0]?.toUpperCase() !== "ACCESS_PRICE") {
    throw createProviderError(
      `Unexpected BenOTP price response: ${value}`,
      {
        code: "INVALID_PRICE_RESPONSE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  const price = Number(parts[1]);
  const stock = Number(parts[2]);

  if (!Number.isFinite(price) || price <= 0) {
    throw createProviderError(
      `Invalid BenOTP price response: ${value}`,
      {
        code: "INVALID_PRICE",
        retryable: false,
        rawResponse: value,
      }
    );
  }

  return {
    price,
    stock: Number.isFinite(stock) ? stock : 0,
    currency: process.env.BENOTP_CURRENCY || "NGN",
    raw: value,
  };
}

function parseSingleNumber(responseText) {
  const value = String(responseText || "").trim();

  /*
   * Documented single-number format:
   * ACCESS_NUMBER:ORDER_ID:PHONE_NUMBER
   */
  const parts = value.split(":");

  if (parts[0]?.toUpperCase() !== "ACCESS_NUMBER") {
    throw createProviderError(
      `Unexpected BenOTP number response: ${value}`,
      {
        code: "INVALID_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  const providerOrderId = String(parts[1] || "").trim();

  /*
   * Joining the remaining parts is defensive in case the provider
   * ever includes another colon-delimited component.
   */
  const phoneNumber = parts.slice(2).join(":").trim();

  if (!providerOrderId || !phoneNumber) {
    throw createProviderError(
      `BenOTP returned an incomplete number response: ${value}`,
      {
        code: "INCOMPLETE_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    providerOrderId,
    phoneNumber,
    status: "waiting",
    providerStatus: "STATUS_WAIT_CODE",
    raw: value,
  };
}

function parseBulkNumbers(responseText) {
  const value = String(responseText || "").trim();
  const parts = value.split(":");

  /*
   * Documented bulk format:
   * ACCESS_BATCH:QUANTITY:ORDER_ID1:PHONE1:ORDER_ID2:PHONE2...
   */
  if (parts[0]?.toUpperCase() !== "ACCESS_BATCH") {
    return null;
  }

  const quantity = Number(parts[1]);
  const values = parts.slice(2);
  const orders = [];

  for (let index = 0; index < values.length; index += 2) {
    const providerOrderId = String(values[index] || "").trim();
    const phoneNumber = String(values[index + 1] || "").trim();

    if (providerOrderId && phoneNumber) {
      orders.push({
        provider: PROVIDER_NAME,
        providerOrderId,
        phoneNumber,
        status: "waiting",
        providerStatus: "STATUS_WAIT_CODE",
      });
    }
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    orders.length === 0
  ) {
    throw createProviderError(
      `Invalid BenOTP bulk-number response: ${value}`,
      {
        code: "INVALID_BATCH_RESPONSE",
        retryable: true,
        rawResponse: value,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    quantity,
    orders,
    raw: value,
  };
}

function parseStatus(responseText) {
  const value = String(responseText || "").trim();
  const upper = value.toUpperCase();

  if (upper === "STATUS_WAIT_CODE") {
    return {
      provider: PROVIDER_NAME,
      status: "waiting",
      providerStatus: "STATUS_WAIT_CODE",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  if (upper.startsWith("STATUS_OK:")) {
    const otpCode = value.slice(value.indexOf(":") + 1).trim();

    return {
      provider: PROVIDER_NAME,
      status: "received",
      providerStatus: "STATUS_OK",
      otpCode,
      sms: otpCode,
      raw: value,
    };
  }

  if (upper === "STATUS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      status: "cancelled",
      providerStatus: "STATUS_CANCEL",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  if (upper === "NO_ACTIVATION") {
    return {
      provider: PROVIDER_NAME,
      status: "expired",
      providerStatus: "NO_ACTIVATION",
      otpCode: "",
      sms: "",
      raw: value,
    };
  }

  throw createProviderError(
    `Unexpected BenOTP status response: ${value}`,
    {
      code: "INVALID_STATUS_RESPONSE",
      retryable: true,
      rawResponse: value,
    }
  );
}

async function getBalance() {
  const response = await request(
    {
      action: "getBalance",
    },
    {
      retryable: true,
    }
  );

  return {
    provider: PROVIDER_NAME,
    balance: parseBalance(response.text),
    currency: process.env.BENOTP_CURRENCY || "NGN",
    raw: response.text,
  };
}

function parseJsonResponse(
  value,
  responseText,
  collectionName
) {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw createProviderError(
        `Unable to parse BenOTP ${collectionName} response: ${responseText}`,
        {
          code: `INVALID_${collectionName.toUpperCase()}_RESPONSE`,
          retryable: true,
          rawResponse: responseText,
        }
      );
    }
  }

  return parsed;
}

function getCollectionSize(value) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value).length;
  }

  return 0;
}

function unwrapProviderCollection(
  payload,
  keys = []
) {
  const candidates = [
    ...keys.map((key) => payload?.[key]),
    ...keys.map((key) => payload?.data?.[key]),
    ...keys.map((key) => payload?.result?.[key]),
    payload?.data,
    payload?.result,
    payload?.response,
    payload,
  ];

  return (
    candidates.find(
      (candidate) =>
        getCollectionSize(candidate) > 0
    ) ?? null
  );
}

async function getServices() {
  const response = await request(
    {
      action: "getServices",
    },
    {
      retryable: true,
    }
  );

  const parsedResponse = parseJsonResponse(
    response.data,
    response.text,
    "services"
  );

  const services = unwrapProviderCollection(
    parsedResponse,
    [
      "services",
      "service",
      "serviceList",
      "items",
    ]
  );

  const serviceCount =
    getCollectionSize(services);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[BenOTP] resolved service count:",
      serviceCount
    );
  }

  if (serviceCount === 0) {
    throw createProviderError(
      "BenOTP returned an empty services catalog",
      {
        code: "EMPTY_SERVICES_RESPONSE",
        retryable: true,
        rawResponse:
          response.text ||
          JSON.stringify(response.data),
      }
    );
  }

  return services;
}

async function getCountries() {
  const response = await request(
    {
      action: "getCountries",
    },
    {
      retryable: true,
    }
  );

  const parsedResponse = parseJsonResponse(
    response.data,
    response.text,
    "countries"
  );

  const countries = unwrapProviderCollection(
    parsedResponse,
    [
      "countries",
      "country",
      "countryList",
      "items",
    ]
  );

  const countryCount =
    getCollectionSize(countries);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[BenOTP] resolved country count:",
      countryCount
    );
  }

  if (countryCount === 0) {
    throw createProviderError(
      "BenOTP returned an empty countries catalog",
      {
        code: "EMPTY_COUNTRIES_RESPONSE",
        retryable: true,
        rawResponse:
          response.text ||
          JSON.stringify(response.data),
      }
    );
  }

  return countries;
}

async function getPrice({
  service,
  country,
  operator = "default",
  areaCode,
  pool,
}) {
  const normalizedCountry =
    normalizeBenOtpCountry(country);

  const normalizedOperator =
    String(operator || "default")
      .trim()
      .toLowerCase() ||
    "default";

  const effectivePool =
    pool ||
    (
      normalizedOperator !==
      "default"
        ? normalizedOperator
        : ""
    );

  const response = await request(
    {
      action: "getPrice",
      service: normalizeRequired(
        service,
        "Service"
      ),
      country: normalizedCountry,
      ...(areaCode
        ? {
            areacode: String(
              areaCode
            ).trim(),
          }
        : {}),
      ...(effectivePool
        ? {
            pool: String(
              effectivePool
            ).trim(),
          }
        : {}),
    },
    {
      retryable: true,
    }
  );

  return {
    provider: PROVIDER_NAME,
    service: String(service).trim(),
    country: normalizedCountry,
    operator:
      effectivePool ||
      normalizedOperator ||
      "default",
    ...parsePrice(response.text),
  };
}

async function getOperators({
  service,
  country,
}) {
  const configuredPools =
    String(
      process.env.BENOTP_POOLS ||
      ""
    )
      .split(",")
      .map((value) =>
        value.trim()
      )
      .filter(Boolean);

  const pools =
    configuredPools.length
      ? configuredPools
      : ["default"];

  const results =
    await Promise.allSettled(
      pools.map(
        async (poolId) => {
          const quote =
            await getPrice({
              service,
              country,
              operator:
                poolId,
              pool:
                poolId ===
                "default"
                  ? ""
                  : poolId,
            });

          return {
            id: poolId,
            operator:
              poolId,
            name:
              poolId ===
              "default"
                ? "Default BenOTP pool"
                : `Pool ${poolId}`,
            price:
              quote.price,
            stock:
              quote.stock,
            currency:
              quote.currency,
          };
        }
      )
    );

  const operators =
    results
      .filter(
        (result) =>
          result.status ===
          "fulfilled"
      )
      .map(
        (result) =>
          result.value
      )
      .sort(
        (
          first,
          second
        ) =>
          first.price -
          second.price
      );

  if (!operators.length) {
    const firstFailure =
      results.find(
        (result) =>
          result.status ===
          "rejected"
      );

    throw (
      firstFailure?.reason ||
      createProviderError(
        "No BenOTP pools are currently available",
        {
          status: 409,
          code:
            "NO_OPERATORS",
          retryable: true,
        }
      )
    );
  }

  return {
    provider:
      PROVIDER_NAME,
    service:
      String(
        service
      ).trim(),
    country:
      normalizeBenOtpCountry(
        country
      ),
    currency:
      operators[0]
        .currency,
    operators,
    raw:
      operators,
  };
}

async function buyNumber({
  service,
  country,
  operator = "default",
  areaCode,
  quantity = 1,
  pool,
}) {
  const normalizedQuantity =
    Number(quantity);

  if (
    !Number.isInteger(
      normalizedQuantity
    ) ||
    normalizedQuantity < 1 ||
    normalizedQuantity > 10
  ) {
    throw createProviderError(
      "BenOTP quantity must be an integer between 1 and 10",
      {
        status: 400,
        code: "INVALID_QUANTITY",
        retryable: false,
      }
    );
  }

  const normalizedCountry =
    normalizeBenOtpCountry(country);

  const normalizedOperator =
    String(operator || "default")
      .trim()
      .toLowerCase() ||
    "default";

  const effectivePool =
    pool ||
    (
      normalizedOperator !==
      "default"
        ? normalizedOperator
        : ""
    );

  const response = await request(
    {
      action: "getNumber",
      service: normalizeRequired(
        service,
        "Service"
      ),
      country: normalizedCountry,
      quantity: normalizedQuantity,
      ...(areaCode
        ? {
            areacode: String(
              areaCode
            ).trim(),
          }
        : {}),
      ...(effectivePool
        ? {
            pool: String(
              effectivePool
            ).trim(),
          }
        : {}),
    },
    {
      retryable: false,
    }
  );

  const bulkResult =
    parseBulkNumbers(response.text);

  if (bulkResult) {
    return bulkResult;
  }

  const parsed =
    parseSingleNumber(
      response.text
    );

  return {
    ...parsed,
    operator:
      effectivePool ||
      normalizedOperator ||
      "default",
  };
}

async function getOrder(orderId) {
  const response = await request(
    {
      action: "getStatus",
      order_id: normalizeRequired(orderId, "BenOTP order ID"),
    },
    {
      retryable: true,
    }
  );

  return {
    providerOrderId: String(orderId),
    ...parseStatus(response.text),
  };
}

async function getSms(orderId) {
  return getOrder(orderId);
}

async function cancelOrder(orderId) {
  const normalizedOrderId = normalizeRequired(
    orderId,
    "BenOTP order ID"
  );

  const response = await request(
    {
      action: "setStatus",
      order_id: normalizedOrderId,
      status: 8,
    },
    {
      /*
       * Cancellation is a mutation. Do not automatically repeat it after
       * an uncertain network failure.
       */
      retryable: false,
    }
  );

  const value = response.text.trim();
  const upper = value.toUpperCase();

  if (upper === "ACCESS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "cancelled",
      providerStatus: "ACCESS_CANCEL",
      refundConfirmed: true,
      raw: value,
    };
  }

  if (upper === "STATUS_CANCEL") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "cancelled",
      providerStatus: "STATUS_CANCEL",
      refundConfirmed: true,
      raw: value,
    };
  }

  if (upper === "CANCEL_FAILED:OTP_ALREADY_RECEIVED") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "received",
      providerStatus: "CANCEL_FAILED:OTP_ALREADY_RECEIVED",
      refundConfirmed: false,
      raw: value,
    };
  }

  if (upper === "NO_ACTIVATION") {
    return {
      provider: PROVIDER_NAME,
      providerOrderId: normalizedOrderId,
      status: "expired",
      providerStatus: "NO_ACTIVATION",
      refundConfirmed: false,
      raw: value,
    };
  }

  throw createProviderError(
    `Unexpected BenOTP cancellation response: ${value}`,
    {
      code: "INVALID_CANCEL_RESPONSE",
      retryable: false,
      rawResponse: value,
    }
  );
}

module.exports = {
  name: PROVIDER_NAME,
  getBalance,
  getServices,
  getCountries,
  getOperators,
  getPrice,
  buyNumber,
  getOrder,
  getSms,
  cancelOrder,
};
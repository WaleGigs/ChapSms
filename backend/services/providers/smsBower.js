const axios = require("axios");
const https = require("https");

const PROVIDER_NAME = "smsbower";

function getApiKey() {
  const apiKey = String(
    process.env.SMSBOWER_API_KEY || ""
  ).trim();

  if (!apiKey) {
    throw new Error(
      "SMSBOWER_API_KEY is not configured"
    );
  }

  return apiKey;
}

const httpsAgent = new https.Agent({
  keepAlive: false,
  maxCachedSessions: 0,
  rejectUnauthorized: true,
});

const api = axios.create({
  baseURL:
    process.env.SMSBOWER_BASE_URL ||
    "https://smsbower.page/stubs/handler_api.php",
  timeout: 20000,
  httpsAgent,
  headers: {
    Accept:
      "application/json, text/plain, */*",
    "User-Agent": "ChapsSmS/1.0",
    Connection: "close",
  },
});

function normalizeRequired(
  value,
  fieldName
) {
  const normalized = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  if (!normalized) {
    throw createProviderError(
      `${fieldName} is required`,
      {
        status: 400,
        code: `INVALID_${fieldName
          .toUpperCase()
          .replace(/\s+/g, "_")}`,
        retryable: false,
      }
    );
  }

  return normalized;
}
function normalizeSmsBowerService(service) {
  const value = normalizeRequired(
    service,
    "Service"
  );

  const serviceMap = {
    telegram: "tg",
    tg: "tg",

    whatsapp: "wa",
    wa: "wa",

    facebook: "fb",
    fb: "fb",

    instagram: "ig",
    ig: "ig",

    twitter: "tv",
    x: "tv",
    tv: "tv",

    google: "go",
    gmail: "go",
    youtube: "go",
    go: "go",

    microsoft: "mm",
    outlook: "mm",
    hotmail: "mm",
    live: "mm",
    mm: "mm",
  };

  return serviceMap[value] || value;
}
function normalizeSmsBowerCountry(
  country
) {
  const value = normalizeRequired(
    country,
    "Country"
  );

  const countryMap = {
  usa: "12",
  us: "12",
  "united states": "12",
  "united states of america": "12",
  america: "12",

  uk: "16",
  gb: "16",
  "united kingdom": "16",
  england: "16",

  canada: "36",
  ca: "36",

  nigeria: "19",
  ng: "19",
};

  return countryMap[value] || value;
}
function normalizeOrderId(orderId) {
  const normalized = String(
    orderId || ""
  ).trim();

  if (!normalized) {
    throw createProviderError(
      "SMSBower activation ID is required",
      {
        status: 400,
        code: "INVALID_ORDER_ID",
        retryable: false,
      }
    );
  }

  return normalized;
}

function responseToText(data) {
  if (typeof data === "string") {
    return data.trim();
  }

  if (
    data === null ||
    data === undefined
  ) {
    return "";
  }

  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return String(data).trim();
}

function createProviderError(
  message,
  options = {}
) {
  const error = new Error(message);

  error.provider = PROVIDER_NAME;
  error.status = options.status || 502;
  error.code =
    options.code || "SMSBOWER_ERROR";
  error.retryable =
    options.retryable ?? false;
  error.rawResponse =
    options.rawResponse;

  return error;
}

function isRetryableNetworkError(
  error
) {
  const code = String(
    error.code || ""
  ).toUpperCase();

  return new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "EPIPE",
    "ENETUNREACH",
    "EAI_AGAIN",
    "ERR_NETWORK",
    "ERR_SSL_BAD_RECORD_MAC",
  ]).has(code);
}

function classifyProviderError(value) {
  const text = String(
    value || ""
  ).trim();

  const upper = text.toUpperCase();

  if (!text) {
    return createProviderError(
      "SMSBower returned an empty response",
      {
        code: "EMPTY_RESPONSE",
        retryable: true,
      }
    );
  }
      if (
    upper === "NO_NUMBERS" ||
    upper === "NO_NUMBER" ||
    upper.includes("NO NUMBERS")
  ) {
    return createProviderError(
      "No SMSBower numbers are currently available",
      {
        status: 409,
        code: "NO_NUMBERS",
        retryable: true,
        rawResponse: text,
      }
    );
  }

  if (
    upper.includes("NO_BALANCE") ||
    upper.includes(
      "INSUFFICIENT BALANCE"
    ) ||
    upper.includes("NOT_ENOUGH")
  ) {
    return createProviderError(
      "SMSBower provider balance is insufficient",
      {
        status: 503,
        code: "PROVIDER_BALANCE_LOW",
        retryable: true,
        rawResponse: text,
      }
    );
  }

  if (upper === "BAD_KEY") {
    return createProviderError(
      "SMSBower API key is invalid",
      {
        status: 500,
        code: "INVALID_API_KEY",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (upper === "BAD_SERVICE") {
    return createProviderError(
      "SMSBower service is invalid",
      {
        status: 400,
        code: "INVALID_SERVICE",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (upper === "BAD_ACTION") {
    return createProviderError(
      "SMSBower action is invalid",
      {
        status: 500,
        code: "INVALID_ACTION",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (upper === "BAD_STATUS") {
    return createProviderError(
      "SMSBower activation status is invalid",
      {
        status: 400,
        code: "INVALID_STATUS",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (upper === "NO_ACTIVATION") {
    return createProviderError(
      "SMSBower activation was not found",
      {
        status: 404,
        code: "NO_ACTIVATION",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (
    upper === "EARLY_CANCEL_DENIED"
  ) {
    return createProviderError(
      "SMSBower cancellation is not available yet. Try again after two minutes.",
      {
        status: 409,
        code: "EARLY_CANCEL_DENIED",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  if (
    upper.startsWith("ERROR") ||
    upper.includes("SERVER_ERROR")
  ) {
    return createProviderError(
      text,
      {
        status: 502,
        code: "PROVIDER_ERROR",
        retryable: true,
        rawResponse: text,
      }
    );
  }

  return null;
}

async function request(
  params,
  options = {}
) {
  try {
    const response = await api.get(
      "",
      {
        params: {
          api_key: getApiKey(),
          ...params,
        },
      }
    );

    const text = responseToText(
      response.data
    );

    const providerError =
      classifyProviderError(text);

    if (providerError) {
      throw providerError;
    }

    return {
      data: response.data,
      text,
    };
  } catch (error) {
    if (
      error.provider === PROVIDER_NAME
    ) {
      throw error;
    }

    const responseText =
      responseToText(
        error.response?.data
      );

    const status = Number(
      error.response?.status || 502
    );

    throw createProviderError(
      responseText ||
        error.message ||
        "SMSBower request failed",
      {
        status,
        code:
          error.code ||
          "SMSBOWER_REQUEST_FAILED",
        retryable:
          options.retryable ??
          (
            isRetryableNetworkError(
              error
            ) ||
            status >= 500
          ),
        rawResponse: responseText,
      }
    );
  }
}

function parseBalance(value) {
  const text = String(
    value || ""
  ).trim();

  const parts = text.split(":");

  if (
    parts[0]?.toUpperCase() !==
    "ACCESS_BALANCE"
  ) {
    throw createProviderError(
      `Unexpected SMSBower balance response: ${text}`,
      {
        code:
          "INVALID_BALANCE_RESPONSE",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  const balance = Number(parts[1]);

  if (!Number.isFinite(balance)) {
    throw createProviderError(
      `Invalid SMSBower balance: ${text}`,
      {
        code: "INVALID_BALANCE",
        retryable: false,
        rawResponse: text,
      }
    );
  }

  return balance;
}
function parseNumberResponse(data, text) {
  /*
   * getNumberV2 normally returns JSON:
   *
   * {
   *   activationId,
   *   phoneNumber,
   *   activationCost,
   *   countryCode,
   *   activationOperator
   * }
   */

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const providerOrderId =
      data.activationId ??
      data.activation_id ??
      data.id;

    const phoneNumber =
      data.phoneNumber ??
      data.phone_number ??
      data.number;

    if (
      providerOrderId &&
      phoneNumber
    ) {
      return {
        provider: PROVIDER_NAME,
        providerOrderId: String(
          providerOrderId
        ),
        phoneNumber: String(
          phoneNumber
        ),
        providerPrice: Number(
          data.activationCost ??
            data.price ??
            0
        ),
        providerCurrency:
          process.env
            .SMSBOWER_CURRENCY ||
          "USD",
        operator: String(
          data.activationOperator ||
            "any"
        ),
        countryCode:
          data.countryCode ?? null,
        canGetAnotherSms:
          Boolean(
            data.canGetAnotherSms
          ),
        status: "waiting",
        providerStatus:
          "STATUS_WAIT_CODE",
        raw: data,
      };
    }
  }

  /*
   * Classic API format:
   * ACCESS_NUMBER:ACTIVATION_ID:PHONE
   */

  const parts = String(
    text || ""
  )
    .trim()
    .split(":");

  if (
    parts[0]?.toUpperCase() !==
    "ACCESS_NUMBER"
  ) {
    throw createProviderError(
      `Unexpected SMSBower number response: ${text}`,
      {
        code:
          "INVALID_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: text,
      }
    );
  }

  const providerOrderId = String(
    parts[1] || ""
  ).trim();

  const phoneNumber = parts
    .slice(2)
    .join(":")
    .trim();

  if (
    !providerOrderId ||
    !phoneNumber
  ) {
    throw createProviderError(
      `Incomplete SMSBower number response: ${text}`,
      {
        code:
          "INCOMPLETE_NUMBER_RESPONSE",
        retryable: true,
        rawResponse: text,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    providerOrderId,
    phoneNumber,
    providerPrice: 0,
    providerCurrency:
      process.env
        .SMSBOWER_CURRENCY ||
      "USD",
    operator: "any",
    status: "waiting",
    providerStatus:
      "STATUS_WAIT_CODE",
    raw: text,
  };
}

function parseStatus(value) {
  const text = String(
    value || ""
  ).trim();

  const upper =
    text.toUpperCase();

  if (
    upper === "STATUS_WAIT_CODE"
  ) {
    return {
      provider: PROVIDER_NAME,
      status: "waiting",
      providerStatus:
        "STATUS_WAIT_CODE",
      otpCode: "",
      sms: "",
      raw: text,
    };
  }

  if (
    upper.startsWith(
      "STATUS_WAIT_RETRY:"
    )
  ) {
    const lastCode = text
      .slice(
        text.indexOf(":") + 1
      )
      .trim();

    return {
      provider: PROVIDER_NAME,
      status: "waiting",
      providerStatus:
        "STATUS_WAIT_RETRY",
      otpCode: "",
      sms: lastCode,
      raw: text,
    };
  }

  if (
    upper.startsWith(
      "STATUS_OK:"
    )
  ) {
    const otpCode = text
      .slice(
        text.indexOf(":") + 1
      )
      .trim();

    return {
      provider: PROVIDER_NAME,
      status: "received",
      providerStatus:
        "STATUS_OK",
      otpCode,
      sms: otpCode,
      raw: text,
    };
  }

  if (
    upper === "STATUS_CANCEL"
  ) {
    return {
      provider: PROVIDER_NAME,
      status: "cancelled",
      providerStatus:
        "STATUS_CANCEL",
      otpCode: "",
      sms: "",
      raw: text,
    };
  }

  throw createProviderError(
    `Unexpected SMSBower status response: ${text}`,
    {
      code:
        "INVALID_STATUS_RESPONSE",
      retryable: true,
      rawResponse: text,
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
    balance: parseBalance(
      response.text
    ),
    currency:
      process.env.SMSBOWER_CURRENCY ||
      "USD",
    raw: response.text,
  };
}

async function getServices() {
  const response = await request(
    {
      action: "getServicesList",
    },
    {
      retryable: true,
    }
  );

  let result = response.data;

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      throw createProviderError(
        "Unable to parse SMSBower services response",
        {
          code:
            "INVALID_SERVICES_RESPONSE",
          retryable: true,
          rawResponse: response.text,
        }
      );
    }
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    throw createProviderError(
      "SMSBower returned an invalid services response",
      {
        code:
          "INVALID_SERVICES_RESPONSE",
        retryable: true,
        rawResponse: response.text,
      }
    );
  }

  return result.services || result;
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

  let result = response.data;

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      throw createProviderError(
        "Unable to parse SMSBower countries response",
        {
          code:
            "INVALID_COUNTRIES_RESPONSE",
          retryable: true,
          rawResponse: response.text,
        }
      );
    }
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    throw createProviderError(
      "SMSBower returned an invalid countries response",
      {
        code:
          "INVALID_COUNTRIES_RESPONSE",
        retryable: true,
        rawResponse: response.text,
      }
    );
  }

    return result;
    
}
    async function getPrice({ service, country }) {
  // Normalize first
  const normalizedService = normalizeSmsBowerService(service);
  const normalizedCountry = normalizeSmsBowerCountry(country);

  console.log("SMSBower getPrice input:", {
    service,
    country,
  });

  console.log("SMSBower normalized:", {
    service: normalizedService,
    country: normalizedCountry,
  });

  const response = await request(
    {
      action: "getPrices",
      service: normalizedService,
      country: normalizedCountry,
    },
    {
      retryable: true,
    }
  );

  console.log("SMSBower raw price response:", response.text);

  let prices = response.data;

  if (typeof prices === "string") {
    try {
      prices = JSON.parse(prices);
    } catch {
      throw createProviderError(
        "Unable to parse SMSBower price response",
        {
          code: "INVALID_PRICE_RESPONSE",
          retryable: true,
          rawResponse: response.text,
        }
      );
    }
  }

  const entry =
    prices?.[normalizedCountry]?.[normalizedService];

  if (!entry) {
    throw createProviderError(
      "No SMSBower pricing is available for this country and service",
      {
        status: 409,
        code: "NO_PRICE",
        retryable: true,
        rawResponse: response.text,
      }
    );
  }

  const price = Number(entry.cost);
  const stock = Number(entry.count);

  if (!Number.isFinite(price) || price <= 0) {
    throw createProviderError(
      "SMSBower returned an invalid price",
      {
        code: "INVALID_PRICE",
        retryable: true,
        rawResponse: response.text,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    service: normalizedService,
    country: normalizedCountry,
    price,
    stock: Number.isFinite(stock) ? stock : 0,
    currency:
      process.env.SMSBOWER_CURRENCY || "USD",
    raw: prices,
  };
}

async function buyNumber({
  service,
  country,
  maxPrice,
  minPrice,
  providerIds,
  exceptProviderIds,
  phoneException,
  userId,
}) {
  // Normalize first
  const normalizedService =
    normalizeSmsBowerService(service);

  const normalizedCountry =
    normalizeSmsBowerCountry(country);

  console.log("SMSBower buyNumber input:", {
    service,
    country,
  });

  console.log("SMSBower buyNumber normalized:", {
    service: normalizedService,
    country: normalizedCountry,
  });

  const response = await request(
    {
      action: "getNumberV2",
      service: normalizedService,
      country: normalizedCountry,
      ...(maxPrice !== undefined
        ? { maxPrice }
        : {}),
      ...(minPrice !== undefined
        ? { minPrice }
        : {}),
      ...(providerIds
        ? { providerIds }
        : {}),
      ...(exceptProviderIds
        ? { exceptProviderIds }
        : {}),
      ...(phoneException
        ? { phoneException }
        : {}),
      ...(userId
        ? { userID: userId }
        : {}),
    },
    {
      retryable: false,
    }
  );

  console.log(
    "SMSBower raw purchase response:",
    response.text
  );

  return parseNumberResponse(
    response.data,
    response.text
  );
}
async function getOrder(orderId) {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const response = await request(
    {
      action: "getStatus",
      id: normalizedOrderId,
    },
    {
      retryable: true,
    }
  );

  return {
    providerOrderId:
      normalizedOrderId,
    ...parseStatus(response.text),
  };
}

async function getSms(orderId) {
  return getOrder(orderId);
}

async function setStatus(
  orderId,
  status
) {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const response = await request(
    {
      action: "setStatus",
      id: normalizedOrderId,
      status,
    },
    {
      retryable: false,
    }
  );

  return response.text.trim();
}

async function cancelOrder(orderId) {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const responseText =
    await setStatus(
      normalizedOrderId,
      8
    );

  const upper =
    responseText.toUpperCase();

  if (
    upper === "ACCESS_CANCEL" ||
    upper === "STATUS_CANCEL"
  ) {
    return {
      provider: PROVIDER_NAME,
      providerOrderId:
        normalizedOrderId,
      status: "cancelled",
      providerStatus: upper,
      refundConfirmed: true,
      raw: responseText,
    };
  }

  throw createProviderError(
    `Unexpected SMSBower cancellation response: ${responseText}`,
    {
      code:
        "INVALID_CANCEL_RESPONSE",
      retryable: false,
      rawResponse: responseText,
    }
  );
}

async function finishOrder(orderId) {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const responseText =
    await setStatus(
      normalizedOrderId,
      6
    );

  if (
    responseText.toUpperCase() !==
    "ACCESS_ACTIVATION"
  ) {
    throw createProviderError(
      `Unexpected SMSBower completion response: ${responseText}`,
      {
        code:
          "INVALID_FINISH_RESPONSE",
        retryable: false,
        rawResponse: responseText,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    providerOrderId:
      normalizedOrderId,
    status: "received",
    providerStatus:
      "ACCESS_ACTIVATION",
    raw: responseText,
  };
}

async function requestAnotherSms(
  orderId
) {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const responseText =
    await setStatus(
      normalizedOrderId,
      3
    );

  if (
    responseText.toUpperCase() !==
    "ACCESS_RETRY_GET"
  ) {
    throw createProviderError(
      `Unexpected SMSBower retry response: ${responseText}`,
      {
        code:
          "INVALID_RETRY_RESPONSE",
        retryable: false,
        rawResponse: responseText,
      }
    );
  }

  return {
    provider: PROVIDER_NAME,
    providerOrderId:
      normalizedOrderId,
    status: "waiting",
    providerStatus:
      "ACCESS_RETRY_GET",
    raw: responseText,
  };
}

module.exports = {
  name: PROVIDER_NAME,
  getBalance,
  getServices,
  getCountries,
  getPrice,
  buyNumber,
  getOrder,
  getSms,
  cancelOrder,
  finishOrder,
  requestAnotherSms,
};
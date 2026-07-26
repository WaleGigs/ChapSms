const axios = require("axios");

const FIVE_SIM_PRICES_URL = "https://5sim.net/v1/guest/prices";

const CACHE_DURATION_MS = 60 * 1000;

let catalogCache = null;
let catalogCacheExpiresAt = 0;

const countryNames = {
  usa: "United States",
  england: "United Kingdom",
  nigeria: "Nigeria",
  canada: "Canada",
  germany: "Germany",
  france: "France",
  india: "India",
  brazil: "Brazil",
  southafrica: "South Africa",
  indonesia: "Indonesia",
  philippines: "Philippines",
  netherlands: "Netherlands",
  poland: "Poland",
  spain: "Spain",
  italy: "Italy",
  mexico: "Mexico",
  argentina: "Argentina",
  australia: "Australia",
  turkey: "Turkey",
  ukraine: "Ukraine",
};

const countryFlags = {
  usa: "🇺🇸",
  england: "🇬🇧",
  nigeria: "🇳🇬",
  canada: "🇨🇦",
  germany: "🇩🇪",
  france: "🇫🇷",
  india: "🇮🇳",
  brazil: "🇧🇷",
  southafrica: "🇿🇦",
  indonesia: "🇮🇩",
  philippines: "🇵🇭",
  netherlands: "🇳🇱",
  poland: "🇵🇱",
  spain: "🇪🇸",
  italy: "🇮🇹",
  mexico: "🇲🇽",
  argentina: "🇦🇷",
  australia: "🇦🇺",
  turkey: "🇹🇷",
  ukraine: "🇺🇦",
};

function formatName(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function calculateCustomerPrice(providerPrice) {
  const exchangeRate = Number(process.env.NGN_PER_USD);
  const markupPercent = Number(
    process.env.PRICE_MARKUP_PERCENT || 0
  );

  const numericProviderPrice = Number(providerPrice);

  if (
    !Number.isFinite(numericProviderPrice) ||
    numericProviderPrice <= 0
  ) {
    throw new Error("5SIM returned an invalid price");
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("NGN_PER_USD is not configured correctly");
  }

  if (!Number.isFinite(markupPercent) || markupPercent < 0) {
    throw new Error(
      "PRICE_MARKUP_PERCENT is not configured correctly"
    );
  }

  const convertedPrice = numericProviderPrice * exchangeRate;
  const markup = convertedPrice * (markupPercent / 100);

  return Math.ceil(convertedPrice + markup);
}

function getAvailableOperatorEntries(operators) {
  if (!operators || typeof operators !== "object") {
    return [];
  }

  return Object.entries(operators)
    .map(([operator, details]) => ({
      operator,
      ...details,
    }))
    .filter((entry) => {
      return (
        entry &&
        Number(entry.count) > 0 &&
        Number(entry.cost) > 0
      );
    });
}

function summarizeProduct(operators) {
  const entries = getAvailableOperatorEntries(operators);

  if (entries.length === 0) {
    return null;
  }

  const available = entries.reduce(
    (total, entry) => total + Number(entry.count || 0),
    0
  );

  const cheapestEntry = entries.reduce((cheapest, entry) => {
    if (!cheapest) return entry;

    return Number(entry.cost) < Number(cheapest.cost)
      ? entry
      : cheapest;
  }, null);

  const validRates = entries
    .map((entry) => Number(entry.rate))
    .filter((rate) => Number.isFinite(rate));

  const bestRate = validRates.length
    ? Math.max(...validRates)
    : null;

  return {
    available,
    providerPrice: Number(cheapestEntry.cost),
    priceNgn: calculateCustomerPrice(cheapestEntry.cost),
    preferredOperator: cheapestEntry.operator,
    deliveryRate: bestRate,
  };
}

async function buildCatalog() {
  const { data } = await axios.get(FIVE_SIM_PRICES_URL, {
    headers: {
      Accept: "application/json",
    },
    timeout: 15000,
  });

  if (!data || typeof data !== "object") {
    throw new Error("5SIM returned an invalid catalog response");
  }

  const countries = [];
  const servicesMap = new Map();

  for (const [countryCode, products] of Object.entries(data)) {
    if (!products || typeof products !== "object") {
      continue;
    }

    const countryServices = [];
    let totalAvailable = 0;
    let lowestPrice = Infinity;

    for (const [serviceId, operators] of Object.entries(products)) {
      const summary = summarizeProduct(operators);

      if (!summary) {
        continue;
      }

      totalAvailable += summary.available;
      lowestPrice = Math.min(
        lowestPrice,
        summary.priceNgn
      );

      const service = {
        id: serviceId,
        name: formatName(serviceId),
        available: summary.available,
        price: summary.priceNgn,
        providerPrice: summary.providerPrice,
        preferredOperator: summary.preferredOperator,
        deliveryRate: summary.deliveryRate,
      };

      countryServices.push(service);

      const existingService = servicesMap.get(serviceId);

      if (!existingService) {
        servicesMap.set(serviceId, {
          id: serviceId,
          name: formatName(serviceId),
          available: summary.available,
          fromPrice: summary.priceNgn,
          deliveryRate: summary.deliveryRate,
        });
      } else {
        existingService.available += summary.available;
        existingService.fromPrice = Math.min(
          existingService.fromPrice,
          summary.priceNgn
        );

        if (
          summary.deliveryRate !== null &&
          (
            existingService.deliveryRate === null ||
            summary.deliveryRate > existingService.deliveryRate
          )
        ) {
          existingService.deliveryRate =
            summary.deliveryRate;
        }
      }
    }

    if (countryServices.length === 0) {
      continue;
    }

    countryServices.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    countries.push({
      code: countryCode,
      name:
        countryNames[countryCode] ||
        formatName(countryCode),
      flag: countryFlags[countryCode] || "🌍",
      available: totalAvailable,
      fromPrice:
        lowestPrice === Infinity ? 0 : lowestPrice,
      services: countryServices,
    });
  }

  countries.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const services = Array.from(
    servicesMap.values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return {
    success: true,
    currency: "NGN",
    updatedAt: new Date().toISOString(),
    countries,
    services,
  };
}

exports.getCatalog = async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.refresh === "true";

    if (
      !forceRefresh &&
      catalogCache &&
      now < catalogCacheExpiresAt
    ) {
      return res.json({
        ...catalogCache,
        cached: true,
      });
    }

    const catalog = await buildCatalog();

    catalogCache = catalog;
    catalogCacheExpiresAt =
      now + CACHE_DURATION_MS;

    return res.json({
      ...catalog,
      cached: false,
    });
  } catch (error) {
    console.error(
      "Catalog error:",
      error.response?.data || error.message
    );

    return res.status(
      error.response ? 502 : 500
    ).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Unable to load live catalog",
    });
  }
};
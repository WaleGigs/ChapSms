"use client";

function getTikTokQueue() {
  if (
    typeof window === "undefined" ||
    !window.ttq
  ) {
    return null;
  }

  return window.ttq;
}

export function trackTikTokEvent(
  eventName,
  parameters = {}
) {
  const ttq = getTikTokQueue();

  if (
    !ttq ||
    typeof ttq.track !== "function"
  ) {
    return false;
  }

  ttq.track(eventName, parameters);
  return true;
}

export function trackCompleteRegistration() {
  return trackTikTokEvent(
    "CompleteRegistration"
  );
}

export function trackInitiateCheckout({
  value,
  currency = "NGN",
  description = "ChapsSms wallet funding started",
} = {}) {
  const amount = Number(value);

  return trackTikTokEvent(
    "InitiateCheckout",
    {
      ...(Number.isFinite(amount) && amount > 0
        ? {
            value: amount,
            currency,
          }
        : {}),
      description,
    }
  );
}

/*
 * IMPORTANT BUSINESS MAPPING
 * --------------------------
 * A successful wallet funding is the point where ChapsSms actually
 * receives customer money. That is therefore the TikTok standard
 * Purchase conversion used for ad reporting/value measurement.
 *
 * Do NOT also report a later wallet-balance spend as another Purchase,
 * otherwise the same customer money would be counted twice as revenue.
 */
export function trackWalletFundingPurchase({
  value,
  currency = "NGN",
  gateway = "",
  reference = "",
} = {}) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  return trackTikTokEvent(
    "Purchase",
    {
      value: amount,
      currency,
      content_type: "product",
      content_ids: reference
        ? [String(reference)]
        : ["wallet-funding"],
      description: gateway
        ? `ChapsSms wallet funded via ${gateway}`
        : "ChapsSms wallet funded",
    }
  );
}

/*
 * This is intentionally a custom event rather than another Purchase.
 * The money was already counted when the wallet was funded.
 */
export function trackNumberPurchased({
  value,
  currency = "NGN",
  orderId,
  serviceName = "Virtual number",
} = {}) {
  const amount = Number(value);

  return trackTikTokEvent(
    "NumberPurchased",
    {
      ...(Number.isFinite(amount) && amount > 0
        ? {
            value: amount,
            currency,
          }
        : {}),
      content_type: "product",
      ...(orderId
        ? {
            content_ids: [String(orderId)],
          }
        : {}),
      description: String(
        serviceName || "Virtual number"
      ),
    }
  );
}

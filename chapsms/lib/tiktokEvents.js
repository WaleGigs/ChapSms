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
  const ttq =
    getTikTokQueue();

  if (
    !ttq ||
    typeof ttq.track !== "function"
  ) {
    return false;
  }

  ttq.track(
    eventName,
    parameters
  );

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
} = {}) {
  const amount =
    Number(value);

  return trackTikTokEvent(
    "InitiateCheckout",
    {
      ...(Number.isFinite(amount) &&
      amount > 0
        ? {
            value: amount,
            currency,
          }
        : {}),
    }
  );
}

/*
 * Wallet funding is a ChapsSms-specific action rather than an actual
 * SMS-number purchase, so this is intentionally a CUSTOM TikTok event.
 *
 * TikTok custom events can be used for reporting/audiences, but standard
 * events are generally the better choice for campaign optimization.
 */
export function trackWalletFunded({
  value,
  currency = "NGN",
  description =
    "ChapsSms wallet funded",
} = {}) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return false;
  }

  return trackTikTokEvent(
    "WalletFunded",
    {
      value: amount,
      currency,
      description,
    }
  );
}

/*
 * Use Purchase for the actual successful SMS-number purchase.
 * Fire this ONLY after your ChapsSms backend confirms the order.
 */
export function trackPurchase({
  value,
  currency = "NGN",
  contentId,
  description =
    "Virtual number purchase",
} = {}) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return false;
  }

  return trackTikTokEvent(
    "Purchase",
    {
      value: amount,
      currency,
      description,
      content_type:
        "product",
      ...(contentId
        ? {
            content_ids: [
              String(
                contentId
              ),
            ],
          }
        : {}),
    }
  );
}
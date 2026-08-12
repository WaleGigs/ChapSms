"use client";

const configuredApiUrl = String(
  process.env.NEXT_PUBLIC_API_URL || ""
)
  .trim()
  .replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = Math.max(
  10000,
  Number(
    process.env.NEXT_PUBLIC_API_TIMEOUT_MS ||
      75000
  )
);

const BACKEND_WARM_TTL_MS =
  10 * 60 * 1000;

let warmupPromise = null;
let backendWarmUntil = 0;

function getApiUrl() {
  if (!configuredApiUrl) {
    const error = new Error(
      "NEXT_PUBLIC_API_URL is not configured"
    );

    error.code =
      "API_URL_MISSING";

    throw error;
  }

  return configuredApiUrl;
}

function createApiError(
  response,
  data
) {
  const error = new Error(
    data?.message ||
      `Request failed with status ${response.status}`
  );

  error.status =
    response.status;

  error.code =
    data?.code ||
    "API_REQUEST_FAILED";

  error.data = data || {};

  return error;
}

function createRequestController(
  externalSignal,
  timeoutMs
) {
  const controller =
    new AbortController();

  let timedOut = false;

  const abortFromExternal =
    () => {
      if (
        !controller.signal.aborted
      ) {
        controller.abort(
          externalSignal?.reason
        );
      }
    };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener(
        "abort",
        abortFromExternal,
        {
          once: true,
        }
      );
    }
  }

  const timer =
    window.setTimeout(
      () => {
        timedOut = true;

        if (
          !controller.signal
            .aborted
        ) {
          controller.abort();
        }
      },
      Math.max(
        1000,
        Number(
          timeoutMs ||
            DEFAULT_TIMEOUT_MS
        )
      )
    );

  return {
    signal:
      controller.signal,

    didTimeout() {
      return timedOut;
    },

    cleanup() {
      window.clearTimeout(
        timer
      );

      externalSignal
        ?.removeEventListener?.(
          "abort",
          abortFromExternal
        );
    },
  };
}

/**
 * Start the Render/API connection before the customer presses Login.
 *
 * This is a real visitor-triggered warm-up request, not an artificial
 * keep-alive scheduler. If the backend is already awake, it returns quickly.
 * If a free Render instance is asleep, waking starts while the customer is
 * still reading/typing on the page.
 */
export async function warmBackend({
  force = false,
} = {}) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  const now = Date.now();

  if (
    !force &&
    backendWarmUntil > now
  ) {
    return true;
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise =
    (async () => {
      const controller =
        new AbortController();

      const timer =
        window.setTimeout(
          () =>
            controller.abort(),
          70000
        );

      try {
        const response =
          await fetch(
            `${getApiUrl()}/cors-test`,
            {
              method: "GET",
              cache: "no-store",

              /*
               * No cookies are needed for this public health/warm-up route.
               * Keeping this request simple also avoids an unnecessary CORS
               * preflight.
               */
              credentials:
                "omit",

              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          return false;
        }

        backendWarmUntil =
          Date.now() +
          BACKEND_WARM_TTL_MS;

        return true;
      } catch {
        /*
         * Warming is best-effort. Do not show an error just because the
         * pre-warm request failed; the actual auth request will report
         * a useful message if the backend is unavailable.
         */
        return false;
      } finally {
        window.clearTimeout(
          timer
        );

        warmupPromise = null;
      }
    })();

  return warmupPromise;
}

async function request(
  path,
  {
    method = "GET",
    body,
    token,
    signal,
    timeoutMs =
      DEFAULT_TIMEOUT_MS,
  } = {}
) {
  const headers = {
    Accept:
      "application/json",
  };

  if (body !== undefined) {
    headers[
      "Content-Type"
    ] = "application/json";
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const requestController =
    createRequestController(
      signal,
      timeoutMs
    );

  let response;

  try {
    response = await fetch(
      `${getApiUrl()}${path}`,
      {
        method,
        headers,

        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                body
              ),

        cache: "no-store",

        credentials:
          "include",

        signal:
          requestController
            .signal,
      }
    );
  } catch (cause) {
    const timedOut =
      requestController
        .didTimeout();

    const error = new Error(
      timedOut
        ? "ChapsSms is taking longer than expected to respond. Please try again."
        : "Unable to reach the ChapsSms server. Check your connection and try again."
    );

    error.code =
      timedOut
        ? "REQUEST_TIMEOUT"
        : "NETWORK_ERROR";

    error.cause = cause;

    throw error;
  } finally {
    requestController.cleanup();
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response
          .json()
          .catch(
            () => ({})
          )
      : {
          message:
            await response.text(),
        };

  if (!response.ok) {
    throw createApiError(
      response,
      data
    );
  }

  /*
   * Any successful API request proves the backend is awake.
   */
  backendWarmUntil =
    Date.now() +
    BACKEND_WARM_TTL_MS;

  return data;
}

/*
 * Begin waking the backend as soon as this client module loads.
 * AuthContext imports authService, so this normally starts before the
 * customer finishes typing their email/password.
 */
if (
  typeof window !==
  "undefined" &&
  !window
    .__chapsSmsBackendWarmupStarted
) {
  window
    .__chapsSmsBackendWarmupStarted =
    true;

  Promise.resolve()
    .then(
      () => warmBackend()
    )
    .catch(() => false);
}

export const authService = {
  warmBackend,

  register(payload) {
    return request(
      "/auth/register",
      {
        method: "POST",
        body: payload,

        /*
         * Registration may include email delivery and can legitimately
         * take longer than a normal read request.
         */
        timeoutMs: 90000,
      }
    );
  },

  login(payload) {
    /*
     * Do not wait for warmBackend() here. The warm-up request may already
     * be in progress, and sending login immediately lets Render queue the
     * real request behind the same spin-up instead of adding another wait.
     */
    return request(
      "/auth/login",
      {
        method: "POST",
        body: payload,
        timeoutMs: 75000,
      }
    );
  },

  google(credential) {
    return request(
      "/auth/google",
      {
        method: "POST",
        body: {
          credential,
        },
        timeoutMs: 75000,
      }
    );
  },

  verifyEmail(payload) {
    return request(
      "/auth/verify-email",
      {
        method: "POST",
        body: payload,
      }
    );
  },

  resendVerification(
    email
  ) {
    return request(
      "/auth/resend-verification",
      {
        method: "POST",
        body: {
          email,
        },
        timeoutMs: 90000,
      }
    );
  },

  forgotPassword(email) {
    return request(
      "/auth/forgot-password",
      {
        method: "POST",
        body: {
          email,
        },
        timeoutMs: 90000,
      }
    );
  },

  resetPassword(
    payload
  ) {
    return request(
      "/auth/reset-password",
      {
        method: "POST",
        body: payload,
      }
    );
  },

  changePassword(
    payload,
    token
  ) {
    return request(
      "/auth/change-password",
      {
        method: "POST",
        body: payload,
        token,
      }
    );
  },

  getMe(token) {
    return request(
      "/auth/me",
      {
        token,
      }
    );
  },
};

export default authService;

"use client";

const configuredApiUrl = String(
  process.env.NEXT_PUBLIC_API_URL || "",
)
  .trim()
  .replace(/\/+$/, "");

function getApiUrl() {
  if (!configuredApiUrl) {
    const error = new Error(
      "NEXT_PUBLIC_API_URL is not configured",
    );

    error.code = "API_URL_MISSING";
    throw error;
  }

  return configuredApiUrl;
}

function createApiError(response, data) {
  const error = new Error(
    data?.message ||
      `Request failed with status ${response.status}`,
  );

  error.status = response.status;
  error.code =
    data?.code ||
    "API_REQUEST_FAILED";
  error.data = data || {};

  return error;
}

async function request(
  path,
  {
    method = "GET",
    body,
    token,
    signal,
  } = {},
) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

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
            : JSON.stringify(body),
        cache: "no-store",
        credentials: "include",
        signal,
      },
    );
  } catch (cause) {
    const error = new Error(
      "Unable to reach the ChapsSmS server",
    );

    error.code =
      cause?.name === "AbortError"
        ? "REQUEST_TIMEOUT"
        : "NETWORK_ERROR";

    error.cause = cause;
    throw error;
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  const data =
    contentType.includes(
      "application/json",
    )
      ? await response
          .json()
          .catch(() => ({}))
      : {
          message:
            await response.text(),
        };

  if (!response.ok) {
    throw createApiError(
      response,
      data,
    );
  }

  return data;
}

function normalizeEmailPayload(
  value,
) {
  if (
    value &&
    typeof value === "object"
  ) {
    return value;
  }

  return {
    email: String(value || "")
      .trim()
      .toLowerCase(),
  };
}

/*
 * Named exports
 * -------------
 * These support pages that import functions directly:
 *
 * import {
 *   resetPassword,
 *   forgotPassword,
 * } from "@/services/auth.service";
 */

export function register(payload) {
  return request(
    "/auth/register",
    {
      method: "POST",
      body: payload,
    },
  );
}

export function login(payload) {
  return request(
    "/auth/login",
    {
      method: "POST",
      body: payload,
    },
  );
}

export function googleAuth(
  credential,
) {
  return request(
    "/auth/google",
    {
      method: "POST",
      body: {
        credential,
      },
    },
  );
}

/*
 * Alias retained for code that imports or calls `google`.
 */
export const google =
  googleAuth;

export function verifyEmail(
  payload,
) {
  return request(
    "/auth/verify-email",
    {
      method: "POST",
      body: payload,
    },
  );
}

export function resendVerification(
  emailOrPayload,
) {
  return request(
    "/auth/resend-verification",
    {
      method: "POST",
      body:
        normalizeEmailPayload(
          emailOrPayload,
        ),
    },
  );
}

/*
 * Alias for pages using the backend controller-style name.
 */
export const resendVerificationCode =
  resendVerification;

export const resendCode =
  resendVerification;

export function forgotPassword(
  emailOrPayload,
) {
  return request(
    "/auth/forgot-password",
    {
      method: "POST",
      body:
        normalizeEmailPayload(
          emailOrPayload,
        ),
    },
  );
}

export function resetPassword(
  payload,
) {
  return request(
    "/auth/reset-password",
    {
      method: "POST",
      body: payload,
    },
  );
}

export function changePassword(
  payload,
  token,
) {
  return request(
    "/auth/change-password",
    {
      method: "POST",
      body: payload,
      token,
    },
  );
}

export function getMe(token) {
  return request(
    "/auth/me",
    {
      token,
    },
  );
}

/*
 * Object export
 * -------------
 * This keeps AuthContext and pages using authService.method() working.
 */
export const authService = {
  register,
  login,
  google: googleAuth,
  googleAuth,
  verifyEmail,
  resendVerification,
  resendVerificationCode,
  resendCode,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};

export default authService;
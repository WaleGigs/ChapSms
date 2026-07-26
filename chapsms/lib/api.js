const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://127.0.0.1:5050/api";

function cleanToken(value) {
  if (!value) {
    return null;
  }

  let token = String(value).trim();

  /*
   * Fix tokens previously stored with:
   * JSON.stringify(token)
   *
   * Example:
   * "eyJhbGciOi..."
   */
  if (
    token.startsWith('"') &&
    token.endsWith('"')
  ) {
    try {
      token = JSON.parse(token);
    } catch {
      token = token.slice(1, -1);
    }
  }

  token = String(token)
    .replace(/^Bearer\s+/i, "")
    .trim();

  return token || null;
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawToken =
    localStorage.getItem("chapsms-token") ||
    sessionStorage.getItem("chapsms-token");

  const token = cleanToken(rawToken);

  /*
   * Rewrite an incorrectly stored token
   * into the correct raw-token format.
   */
  if (token && rawToken !== token) {
    if (
      localStorage.getItem("chapsms-token")
    ) {
      localStorage.setItem(
        "chapsms-token",
        token
      );
    }

    if (
      sessionStorage.getItem(
        "chapsms-token"
      )
    ) {
      sessionStorage.setItem(
        "chapsms-token",
        token
      );
    }
  }

  return token;
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    "chapsms-token"
  );

  localStorage.removeItem(
    "chapsms-user"
  );

  sessionStorage.removeItem(
    "chapsms-token"
  );

  sessionStorage.removeItem(
    "chapsms-user"
  );
}

export async function api(
  endpoint,
  options = {}
) {
  const token = getStoredToken();

  const headers = new Headers(
    options.headers || {}
  );

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (
    options.body !== undefined &&
    !isFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (
    token &&
    !headers.has("Authorization")
  ) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
        cache: "no-store",
      }
    );
  } catch (error) {
    const networkError = new Error(
      "Unable to connect to the backend server"
    );

    networkError.cause = error;
    networkError.status = 0;

    throw networkError;
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data = {};

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data = await response.json();
    } else {
      const text =
        await response.text();

      data = text
        ? { message: text }
        : {};
    }
  } catch {
    data = {};
  }

  if (!response.ok) {
    const requestError = new Error(
      data?.message ||
        (response.status === 401
          ? "Your session is invalid or has expired"
          : `Request failed with status ${response.status}`)
    );

    requestError.status =
      response.status;

    requestError.data = data;

    /*
     * Do not use console.error here.
     * Next.js treats console.error as a
     * development error overlay.
     */
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.warn(
        `API request failed: ${endpoint}`,
        {
          status: response.status,
          data,
        }
      );
    }

    throw requestError;
  }

  return data;
}

export {
  API_URL,
  getStoredToken,
  clearStoredSession,
};
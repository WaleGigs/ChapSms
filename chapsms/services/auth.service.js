import { api } from "@/lib/api";

export function registerUser(data) {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function verifyUserEmail(data) {
  return api("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function resendVerificationCode(data) {
  return api("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function loginUser(data) {
  const body =
    typeof data === "object"
      ? {
          email: String(data.email || "")
            .trim()
            .toLowerCase(),
          password: String(data.password || ""),
        }
      : {};

  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function forgotPassword(data) {
  const email =
    typeof data === "string"
      ? data.trim().toLowerCase()
      : String(data?.email || "")
          .trim()
          .toLowerCase();

  return api("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email,
    }),
  });
}

export function resetPassword(data) {
  return api("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function changePassword(data) {
  return api("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return api("/auth/me");
}
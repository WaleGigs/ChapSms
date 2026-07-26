"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  verifyUserEmail,
  resendVerificationCode,
} from "@/services/auth.service";

const AuthContext = createContext(null);

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem(
      "chapsms-token"
    ) ||
    sessionStorage.getItem(
      "chapsms-token"
    )
  );
}

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser =
    localStorage.getItem(
      "chapsms-user"
    ) ||
    sessionStorage.getItem(
      "chapsms-user"
    );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
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

function storeCurrentUser(currentUser) {
  if (typeof window === "undefined") {
    return;
  }

  if (
    localStorage.getItem(
      "chapsms-token"
    )
  ) {
    localStorage.setItem(
      "chapsms-user",
      JSON.stringify(currentUser)
    );
  }

  if (
    sessionStorage.getItem(
      "chapsms-token"
    )
  ) {
    sessionStorage.setItem(
      "chapsms-user",
      JSON.stringify(currentUser)
    );
  }
}

export function AuthProvider({
  children,
}) {
  const [user, setUser] = useState(
    null
  );

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        const token =
          getStoredToken();

        if (!token) {
          if (active) {
            setUser(null);
          }

          return;
        }

        /*
         * Restore the cached user immediately
         * while validating the JWT.
         */
        const storedUser =
          getStoredUser();

        if (
          active &&
          storedUser
        ) {
          setUser(storedUser);
        }

        const response =
          await getCurrentUser();

        const currentUser =
          response?.user ||
          response;

        if (!currentUser) {
          throw new Error(
            "The server did not return the current user"
          );
        }

        if (!active) {
          return;
        }

        setUser(currentUser);
        storeCurrentUser(
          currentUser
        );
      } catch (error) {
        console.error(
          "Authentication restoration failed:",
          error
        );

        /*
         * Clear the session only when the
         * backend rejects the token.
         */
        if (
          error?.status === 401
        ) {
          clearStoredSession();

          if (active) {
            setUser(null);
          }

          return;
        }

        /*
         * Preserve the cached user during
         * temporary backend/network failures.
         */
        const storedUser =
          getStoredUser();

        if (
          active &&
          storedUser
        ) {
          setUser(storedUser);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  async function login({
    email,
    password,
    rememberMe = true,
  }) {
    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    const response =
      await loginUser({
        email: normalizedEmail,
        password,
      });

    if (
      !response?.token ||
      !response?.user
    ) {
      throw new Error(
        "The server returned an invalid login response"
      );
    }

    clearStoredSession();

    const storage =
      rememberMe
        ? localStorage
        : sessionStorage;

    storage.setItem(
      "chapsms-token",
      response.token
    );

    storage.setItem(
      "chapsms-user",
      JSON.stringify(
        response.user
      )
    );

    setUser(response.user);

    return response;
  }

  async function signup(data) {
    return registerUser({
      ...data,

      email: String(
        data?.email || ""
      )
        .trim()
        .toLowerCase(),
    });
  }

  async function refreshUser() {
    const response =
      await getCurrentUser();

    const currentUser =
      response?.user ||
      response;

    if (!currentUser) {
      throw new Error(
        "Unable to retrieve the current user"
      );
    }

    setUser(currentUser);

    storeCurrentUser(
      currentUser
    );

    return currentUser;
  }

  function logout() {
    clearStoredSession();
    setUser(null);
  }

  async function verifyEmail(data) {
    return verifyUserEmail({
      email: String(
        data?.email || ""
      )
        .trim()
        .toLowerCase(),

      code: String(
        data?.code ||
          data?.verificationCode ||
          ""
      ).trim(),
    });
  }

  async function resendVerification(
    email
  ) {
    const normalizedEmail =
      typeof email === "string"
        ? email
            .trim()
            .toLowerCase()
        : String(
            email?.email || ""
          )
            .trim()
            .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        "Email address is required"
      );
    }

    return resendVerificationCode({
      email: normalizedEmail,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        signup,
        logout,
        refreshUser,
        verifyEmail,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
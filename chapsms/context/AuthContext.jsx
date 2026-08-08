"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authService } from "@/services/auth.service";

const AuthContext =
  createContext(null);

const TOKEN_KEYS = [
  "chapsms-token",
  "chapsms_token",
  "authToken",
  "token",
];

export const LOGIN_ANNOUNCEMENT_KEY =
  "chapsms:show-login-announcement";

function getStoredToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (const key of TOKEN_KEYS) {
    const persistent =
      window.localStorage.getItem(
        key
      );

    if (persistent) {
      return persistent;
    }
  }

  for (const key of TOKEN_KEYS) {
    const temporary =
      window.sessionStorage.getItem(
        key
      );

    if (temporary) {
      return temporary;
    }
  }

  return "";
}

function clearStoredTokens() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  for (const key of TOKEN_KEYS) {
    window.localStorage.removeItem(
      key
    );

    window.sessionStorage.removeItem(
      key
    );
  }
}

function storeToken(
  token,
  rememberMe
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  clearStoredTokens();

  const storage =
    rememberMe
      ? window.localStorage
      : window.sessionStorage;

  for (const key of TOKEN_KEYS) {
    storage.setItem(
      key,
      token
    );
  }
}

function queueLoginAnnouncement(
  user
) {
  if (
    typeof window ===
    "undefined" ||
    !user ||
    user?.role === "admin"
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      LOGIN_ANNOUNCEMENT_KEY,
      JSON.stringify({
        createdAt:
          Date.now(),
        userId:
          String(
            user?._id ||
              user?.id ||
              user?.email ||
              ""
          ),
      })
    );
  } catch {
    // The login still succeeds if sessionStorage is unavailable.
  }
}

function clearLoginAnnouncement() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      LOGIN_ANNOUNCEMENT_KEY
    );
  } catch {
    // Ignore storage failures during logout.
  }
}

function notifyAuthChanged() {
  if (
    typeof window !==
    "undefined"
  ) {
    window.dispatchEvent(
      new Event(
        "chapsms-auth-change"
      )
    );
  }
}

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState("");

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const establishSession =
    useCallback(
      (
        response,
        rememberMe = true
      ) => {
        const nextToken =
          String(
            response?.token || ""
          ).trim();

        if (!nextToken) {
          const error =
            new Error(
              "The server did not return an authentication token"
            );

          error.code =
            "AUTH_TOKEN_MISSING";

          throw error;
        }

        storeToken(
          nextToken,
          rememberMe
        );

        setToken(nextToken);
        setUser(
          response?.user || null
        );

        /*
         * Every explicit successful login queues one WhatsApp
         * announcement for the customer dashboard.
         *
         * This runs for BOTH:
         * - email/password login
         * - Google login
         *
         * Session restoration after a refresh does NOT queue it.
         */
        queueLoginAnnouncement(
          response?.user
        );

        notifyAuthChanged();

        return response;
      },
      []
    );

  const logout = useCallback(
    async () => {
      clearStoredTokens();
      clearLoginAnnouncement();
      setToken("");
      setUser(null);
      notifyAuthChanged();
    },
    []
  );

  const refreshUser =
    useCallback(
      async (
        explicitToken
      ) => {
        const activeToken =
          explicitToken ||
          token ||
          getStoredToken();

        if (!activeToken) {
          setUser(null);
          return null;
        }

        const response =
          await authService.getMe(
            activeToken
          );

        const nextUser =
          response?.user ||
          null;

        setToken(activeToken);
        setUser(nextUser);

        return nextUser;
      },
      [token]
    );

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const storedToken =
        getStoredToken();

      if (!storedToken) {
        if (active) {
          setAuthLoading(false);
        }

        return;
      }

      try {
        const response =
          await authService.getMe(
            storedToken
          );

        if (!active) {
          return;
        }

        setToken(storedToken);
        setUser(
          response?.user ||
          null
        );
      } catch (error) {
        console.error(
          "Session restoration failed:",
          error
        );

        clearStoredTokens();
        clearLoginAnnouncement();

        if (active) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const signup = useCallback(
    (payload) =>
      authService.register(
        payload
      ),
    []
  );

  const login = useCallback(
    async (payload) => {
      const response =
        await authService.login({
          email: payload.email,
          password:
            payload.password,
        });

      return establishSession(
        response,
        payload.rememberMe !==
          false
      );
    },
    [establishSession]
  );

  const googleLogin =
    useCallback(
      async (
        credential,
        {
          rememberMe = true,
        } = {}
      ) => {
        const response =
          await authService.google(
            credential
          );

        return establishSession(
          response,
          rememberMe
        );
      },
      [establishSession]
    );

  const updateUser =
    useCallback(
      (value) => {
        setUser((current) =>
          typeof value ===
          "function"
            ? value(current)
            : value
        );
      },
      []
    );

  const value = useMemo(
    () => ({
      user,
      token,
      authLoading,
      isAuthenticated:
        Boolean(
          user && token
        ),
      signup,
      register: signup,
      login,
      googleLogin,
      logout,
      refreshUser,
      refreshAuth:
        refreshUser,
      setUser: updateUser,
      updateUser,
    }),
    [
      user,
      token,
      authLoading,
      signup,
      login,
      googleLogin,
      logout,
      refreshUser,
      updateUser,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
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

export default AuthContext;
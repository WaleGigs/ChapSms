"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-gsi-script";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "Google authentication is only available in the browser."
        )
      );
      return;
    }

    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        resolve(window.google);
      });

      existingScript.addEventListener("error", () => {
        reject(
          new Error("Unable to load Google authentication.")
        );
      });

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google);

    script.onerror = () => {
      reject(
        new Error("Unable to load Google authentication.")
      );
    };

    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({
  onCredential,
  disabled = false,
  textx = "Continue with Google",
}) {
  const initializedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  /*
   * Detect ChapsSmS theme
   */
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const updateTheme = () => {
      const html = document.documentElement;

      const dark =
        html.getAttribute("data-theme") === "dark" ||
        html.classList.contains("dark");

      setIsDark(dark);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * Load Google Identity Services
   */
  useEffect(() => {
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        setReady(true);
      })
      .catch((error) => {
        console.error("Google Auth:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Initialize Google authentication
   */
  useEffect(() => {
    if (!ready || typeof window === "undefined") {
      return;
    }

    if (!window.google?.accounts?.id) {
      return;
    }

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing."
      );
      return;
    }

    /*
     * Only initialize once.
     */
    if (initializedRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,

      callback: (response) => {
        if (disabled) {
          return;
        }

        if (!response?.credential) {
          return;
        }

        onCredential?.(response.credential);
      },

      auto_select: false,

      cancel_on_tap_outside: true,
    });

    initializedRef.current = true;
  }, [ready, disabled, onCredential]);

  /*
   * Trigger Google authentication
   */
  const handleGoogleLogin = () => {
    if (disabled || !ready) {
      return;
    }

    if (!window.google?.accounts?.id) {
      console.error(
        "Google authentication is not ready."
      );
      return;
    }

    /*
     * Open Google's authentication flow.
     */
    window.google.accounts.id.prompt((notification) => {
      if (
        notification?.isNotDisplayed?.() ||
        notification?.isSkippedMoment?.()
      ) {
        console.warn(
          "Google authentication prompt was not displayed."
        );
      }
    });
  };

  /*
   * ChapsSmS UI colors
   *
   * These are deliberately matched to the
   * login card rather than Google's default
   * black button.
   */
  const buttonStyles = isDark
    ? {
        background:
          "rgba(30, 41, 59, 0.72)",
        border:
          "1px solid rgba(71, 85, 105, 0.55)",
        color: "#f8fafc",
        hoverBackground:
          "rgba(51, 65, 85, 0.82)",
      }
    : {
        background: "#ffffff",
        border:
          "1px solid #d1d5db",
        color: "#111827",
        hoverBackground:
          "#f8fafc",
      };

  if (!ready) {
    return (
      <div className="w-full">
        <div
          className="
            h-12
            w-full
            animate-pulse
            rounded-xl
            border
            border-[var(--border)]
            bg-[var(--muted)]
          "
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={handleGoogleLogin}
        className="
          group
          relative
          flex
          h-12
          w-full
          items-center
          justify-center
          gap-3
          overflow-hidden
          rounded-xl
          font-medium
          text-sm
          transition-all
          duration-200
          ease-out
          active:scale-[0.99]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
        style={{
          background: buttonStyles.background,
          border: buttonStyles.border,
          color: buttonStyles.color,
          boxShadow: isDark
            ? "0 1px 2px rgba(0,0,0,0.12)"
            : "0 1px 2px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={(event) => {
          if (!disabled) {
            event.currentTarget.style.background =
              buttonStyles.hoverBackground;
          }
        }}
        onMouseLeave={(event) => {
          if (!disabled) {
            event.currentTarget.style.background =
              buttonStyles.background;
          }
        }}
        aria-label={textx}
      >
        {/* Google logo */}
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
            bg-white
          "
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.19Z"
            />
            <path
              fill="#34A853"
              d="M12 21.8c2.63 0 4.84-.87 6.45-2.38l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.51A9.74 9.74 0 0 0 12 21.8Z"
            />
            <path
              fill="#FBBC05"
              d="M6.53 13.88a5.85 5.85 0 0 1 0-3.76V7.61H3.28a9.8 9.8 0 0 0 0 8.78l3.25-2.51Z"
            />
            <path
              fill="#EA4335"
              d="M12 6.09c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.17 14.63 2.2 12 2.2a9.74 9.74 0 0 0-8.72 5.41l3.25 2.51C6.3 7.81 8.46 6.09 12 6.09Z"
            />
          </svg>
        </span>

        <span className="truncate">
          {textx}
        </span>
      </button>
    </div>
  );
}
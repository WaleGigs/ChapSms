"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";

function getGoogleClientId() {
  return String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
}

function loadGoogleIdentityServices() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in can only run in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (window.__chapsSmsGsiScriptPromise) {
    return window.__chapsSmsGsiScriptPromise;
  }

  window.__chapsSmsGsiScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${GOOGLE_GSI_SRC}"]`
    );

    const finish = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
        return;
      }

      reject(new Error("Google sign-in loaded, but the Google Identity API is unavailable."));
    };

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve(window.google);
        return;
      }

      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Google sign-in.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  }).catch((error) => {
    delete window.__chapsSmsGsiScriptPromise;
    throw error;
  });

  return window.__chapsSmsGsiScriptPromise;
}

function normalizeButtonText(value) {
  const allowed = new Set([
    "signin_with",
    "signup_with",
    "continue_with",
    "signin",
  ]);

  const normalized = String(value || "continue_with").trim();
  return allowed.has(normalized) ? normalized : "continue_with";
}

function getButtonWidth(element) {
  const parentWidth =
    element?.parentElement?.getBoundingClientRect?.().width ||
    element?.getBoundingClientRect?.().width ||
    320;

  return Math.max(200, Math.min(400, Math.floor(parentWidth)));
}

export default function GoogleAuthButton({
  onCredential,
  disabled = false,
  text = "continue_with",
  className = "",
}) {
  const buttonContainerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);

  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;

    if (typeof window !== "undefined") {
      window.__chapsSmsGoogleCredentialHandler = onCredential;
    }
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver = null;
    let resizeTimer = null;

    const clientId = getGoogleClientId();

    if (!clientId) {
      setError(
        "Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to the frontend environment."
      );
      setReady(false);
      return undefined;
    }

    async function setupGoogleButton() {
      try {
        setError("");
        setReady(false);

        await loadGoogleIdentityServices();

        if (cancelled || !buttonContainerRef.current) {
          return;
        }

        const googleId = window.google?.accounts?.id;

        if (!googleId) {
          throw new Error("Google Identity Services is unavailable.");
        }

        /*
         * Google recommends initialize() only once per page. In Next.js dev,
         * React Strict Mode / HMR can mount effects more than once, so keep the
         * initialized client ID on window and reuse it instead of reinitializing.
         */
        if (window.__chapsSmsGoogleInitializedClientId !== clientId) {
          googleId.initialize({
            client_id: clientId,
            callback: (response) => {
              const credential = String(response?.credential || "").trim();

              if (!credential) {
                console.error("Google sign-in returned no credential.");
                return;
              }

              const handler =
                window.__chapsSmsGoogleCredentialHandler ||
                onCredentialRef.current;

              if (typeof handler !== "function") {
                console.error("Google sign-in credential handler is missing.");
                return;
              }

              Promise.resolve(handler(credential, response)).catch((handlerError) => {
                console.error("Google authentication callback failed:", handlerError);
              });
            },
            ux_mode: "popup",
            auto_select: false,
            use_fedcm_for_button: true,
          });

          window.__chapsSmsGoogleInitializedClientId = clientId;
        }

        const render = () => {
          const target = buttonContainerRef.current;

          if (!target || cancelled) {
            return;
          }

          target.innerHTML = "";

          googleId.renderButton(target, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: normalizeButtonText(text),
            shape: "rectangular",
            logo_alignment: "left",
            width: getButtonWidth(target),
          });

          setReady(true);
        };

        render();

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(render, 100);
          });

          if (buttonContainerRef.current.parentElement) {
            resizeObserver.observe(buttonContainerRef.current.parentElement);
          }
        }

        /*
         * Deliberately DO NOT call google.accounts.id.prompt() here.
         * This component is the explicit "Continue with Google" button, not One Tap.
         * Avoiding prompt() also avoids FedCM prompt moment/status handling that is
         * unnecessary for a user-clicked button.
         */
      } catch (setupError) {
        if (cancelled) {
          return;
        }

        console.error("Google sign-in setup failed:", setupError);
        setReady(false);
        setError(
          setupError?.message ||
            "Google sign-in could not be loaded. Please refresh and try again."
        );
      }
    }

    setupGoogleButton();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.clearTimeout(resizeTimer);
    };
  }, [text]);

  return (
    <div className={className}>
      <div
        className={`relative w-full overflow-hidden rounded-md ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
        aria-disabled={disabled ? "true" : "false"}
      >
        {!ready && !error ? (
          <div className="flex h-11 w-full items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-semibold text-[var(--muted-foreground)]">
            Loading Google sign-in...
          </div>
        ) : null}

        <div
          ref={buttonContainerRef}
          className={ready ? "flex w-full justify-center" : "hidden"}
        />
      </div>

      {error ? (
        <p className="mt-2 text-center text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

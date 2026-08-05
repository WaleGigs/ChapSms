"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LoaderCircle,
} from "lucide-react";

const GOOGLE_SCRIPT_ID =
  "google-identity-services";

const GOOGLE_SCRIPT_SRC =
  "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  if (
    typeof window ===
    "undefined"
  ) {
    return Promise.reject(
      new Error(
        "Google authentication requires a browser"
      )
    );
  }

  if (
    window.google?.accounts?.id
  ) {
    return Promise.resolve();
  }

  const existing =
    document.getElementById(
      GOOGLE_SCRIPT_ID
    );

  if (existing) {
    return new Promise(
      (resolve, reject) => {
        existing.addEventListener(
          "load",
          resolve,
          { once: true }
        );

        existing.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Could not load Google authentication"
              )
            ),
          { once: true }
        );
      }
    );
  }

  return new Promise(
    (resolve, reject) => {
      const script =
        document.createElement(
          "script"
        );

      script.id =
        GOOGLE_SCRIPT_ID;

      script.src =
        GOOGLE_SCRIPT_SRC;

      script.async = true;
      script.defer = true;

      script.onload = resolve;

      script.onerror = () =>
        reject(
          new Error(
            "Could not load Google authentication"
          )
        );

      document.head.appendChild(
        script
      );
    }
  );
}

export default function GoogleAuthButton({
  onCredential,
  disabled = false,
  text = "continue_with",
}) {
  const containerRef =
    useRef(null);

  const callbackRef =
    useRef(onCredential);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    callbackRef.current =
      onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let resizeTimer = null;

    const clientId =
      String(
        process.env
          .NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
          ""
      ).trim();

    if (!clientId) {
      setLoading(false);
      setError(
        "Google login is not configured"
      );

      return undefined;
    }

    function renderButton() {
      if (
        cancelled ||
        !containerRef.current ||
        !window.google?.accounts?.id
      ) {
        return;
      }

      const width = Math.max(
        220,
        Math.min(
          400,
          Math.floor(
            containerRef.current
              .getBoundingClientRect()
              .width
          ) || 320
        )
      );

      containerRef.current
        .replaceChildren();

      window.google.accounts.id
        .initialize({
          client_id: clientId,
          callback: (
            response
          ) => {
            const credential =
              String(
                response?.credential ||
                  ""
              ).trim();

            if (!credential) {
              setError(
                "Google did not return a valid credential"
              );

              return;
            }

            Promise.resolve(
              callbackRef.current?.(
                credential
              )
            ).catch((callbackError) => {
              console.error(
                "Google callback failed:",
                callbackError
              );
            });
          },
          auto_select: false,
          cancel_on_tap_outside:
            true,
        });

      window.google.accounts.id
        .renderButton(
          containerRef.current,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "rectangular",
            logo_alignment: "left",
            width,
          }
        );

      setLoading(false);
      setError("");
    }

    loadGoogleScript()
      .then(() => {
        if (!cancelled) {
          renderButton();
        }
      })
      .catch((scriptError) => {
        if (!cancelled) {
          setLoading(false);
          setError(
            scriptError?.message ||
              "Could not load Google authentication"
          );
        }
      });

    function handleResize() {
      window.clearTimeout(
        resizeTimer
      );

      resizeTimer =
        window.setTimeout(
          renderButton,
          150
        );
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      cancelled = true;

      window.clearTimeout(
        resizeTimer
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [text]);

  return (
    <div className="w-full">
      <div className="relative min-h-11 w-full">
        <div
          ref={containerRef}
          className={
            disabled
              ? "pointer-events-none opacity-60"
              : ""
          }
        />

        {loading ? (
          <div className="absolute inset-0 flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-semibold text-[var(--muted-foreground)]">
            <LoaderCircle
              className="mr-2 animate-spin"
              size={17}
            />
            Loading Google…
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-center text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

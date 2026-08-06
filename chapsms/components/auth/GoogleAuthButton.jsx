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

function waitForGoogleIdentity(
  timeoutMilliseconds = 10000,
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const startedAt =
        Date.now();

      const interval =
        window.setInterval(
          () => {
            if (
              window.google
                ?.accounts?.id
            ) {
              window.clearInterval(
                interval,
              );

              resolve();
              return;
            }

            if (
              Date.now() -
                startedAt >=
              timeoutMilliseconds
            ) {
              window.clearInterval(
                interval,
              );

              reject(
                new Error(
                  "Google authentication did not become ready",
                ),
              );
            }
          },
          100,
        );
    },
  );
}

async function loadGoogleScript() {
  if (
    typeof window ===
    "undefined"
  ) {
    throw new Error(
      "Google authentication requires a browser",
    );
  }

  if (
    window.google?.accounts?.id
  ) {
    return;
  }

  let script =
    document.getElementById(
      GOOGLE_SCRIPT_ID,
    );

  if (!script) {
    script =
      document.createElement(
        "script",
      );

    script.id =
      GOOGLE_SCRIPT_ID;

    script.src =
      GOOGLE_SCRIPT_SRC;

    script.async = true;
    script.defer = true;

    document.head.appendChild(
      script,
    );
  }

  await waitForGoogleIdentity();
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
          "",
      ).trim();

    if (!clientId) {
      setLoading(false);

      setError(
        "Google login is not configured",
      );

      return undefined;
    }

    function renderButton() {
      if (
        cancelled ||
        !containerRef.current ||
        !window.google
          ?.accounts?.id
      ) {
        return;
      }

      const width =
        Math.max(
          220,
          Math.min(
            400,
            Math.floor(
              containerRef.current
                .getBoundingClientRect()
                .width,
            ) || 320,
          ),
        );

      containerRef.current
        .replaceChildren();

      window.google.accounts.id
        .initialize({
          client_id:
            clientId,

          callback: (
            response,
          ) => {
            const credential =
              String(
                response
                  ?.credential ||
                  "",
              ).trim();

            if (!credential) {
              setError(
                "Google did not return a valid credential",
              );

              return;
            }

            Promise.resolve(
              callbackRef.current?.(
                credential,
              ),
            ).catch(
              (
                callbackError,
              ) => {
                console.error(
                  "Google callback failed:",
                  callbackError,
                );
              },
            );
          },

          auto_select: false,
          cancel_on_tap_outside:
            true,
          ux_mode: "popup",
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
            logo_alignment:
              "left",
            width,
          },
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
      .catch(
        (
          scriptError,
        ) => {
          if (cancelled) {
            return;
          }

          console.error(
            "Google Identity Services failed:",
            {
              origin:
                window.location
                  .origin,
              error:
                scriptError,
            },
          );

          setLoading(false);

          setError(
            scriptError?.message ||
              "Could not load Google authentication",
          );
        },
      );

    function handleResize() {
      window.clearTimeout(
        resizeTimer,
      );

      resizeTimer =
        window.setTimeout(
          renderButton,
          150,
        );
    }

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      cancelled = true;

      window.clearTimeout(
        resizeTimer,
      );

      window.removeEventListener(
        "resize",
        handleResize,
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

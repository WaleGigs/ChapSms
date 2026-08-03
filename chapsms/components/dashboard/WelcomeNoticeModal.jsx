"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Headphones,
  Megaphone,
  MessageCircleMore,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const NOTICE_VERSION = "welcome-notice-v1";

export default function WelcomeNoticeModal({
  whatsappChannelUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "",
  supportUrl =
    process.env.NEXT_PUBLIC_SUPPORT_URL || "/support",
}) {
  const { user, authLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const userIdentifier = useMemo(() => {
    return String(
      user?._id ||
        user?.id ||
        user?.email ||
        "member"
    )
      .trim()
      .toLowerCase();
  }, [user]);

  const storageKey = useMemo(() => {
    return `chapsms:${NOTICE_VERSION}:${userIdentifier}`;
  }, [userIdentifier]);

  useEffect(() => {
    if (authLoading || !user || user?.role === "admin") {
      return;
    }

    let timer;

    try {
      const dismissed = localStorage.getItem(storageKey);

      if (!dismissed) {
        timer = window.setTimeout(() => {
          setOpen(true);
        }, 450);
      }
    } catch {
      timer = window.setTimeout(() => {
        setOpen(true);
      }, 450);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [authLoading, storageKey, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        dismissNotice();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function dismissNotice() {
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // Keep closing even when localStorage is unavailable.
    }

    setOpen(false);
  }

  function handleWhatsAppClick(event) {
    if (!whatsappChannelUrl) {
      event.preventDefault();
      return;
    }

    dismissNotice();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismissNotice();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-notice-title"
        aria-describedby="welcome-notice-description"
        className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_35px_100px_-25px_rgba(15,23,42,0.65)] dark:bg-slate-950"
      >
        <button
          type="button"
          onClick={dismissNotice}
          aria-label="Close platform notice"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={20} />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 px-6 pb-10 pt-12 text-center text-white sm:px-8">
          <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-indigo-400/30 blur-3xl" />

          <div className="relative">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/10 shadow-xl backdrop-blur">
              <Megaphone size={34} />
            </span>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-blue-100">
              Platform notice
            </p>

            <h2
              id="welcome-notice-title"
              className="mx-auto mt-3 max-w-sm text-3xl font-black tracking-tight sm:text-[34px]"
            >
              Welcome to ChapsSmS
            </h2>
          </div>
        </div>

        <div className="px-5 pb-6 pt-7 sm:px-8 sm:pb-8">
          <button
            type="button"
            onClick={dismissNotice}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-base font-black text-white shadow-xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 active:translate-y-0"
          >
            Got it — let&apos;s go!
          </button>

          <p
            id="welcome-notice-description"
            className="mx-auto mt-8 max-w-sm text-center text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base"
          >
            Stay informed through our WhatsApp channel for service updates,
            downtime notices, maintenance information, and new feature
            announcements.
          </p>

          <div className="mt-7 space-y-3">
            <a
              href={whatsappChannelUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              aria-disabled={!whatsappChannelUrl}
              className={`group flex min-h-[78px] items-center gap-4 rounded-2xl px-4 text-white shadow-lg transition sm:px-5 ${
                whatsappChannelUrl
                  ? "bg-gradient-to-r from-emerald-600 to-green-500 hover:-translate-y-0.5 hover:shadow-xl"
                  : "cursor-not-allowed bg-slate-400 opacity-70"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <MessageCircleMore size={24} />
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="block font-black">
                  Join WhatsApp Channel
                </span>

                <span className="mt-0.5 block text-xs text-white/80 sm:text-sm">
                  Updates and announcements
                </span>
              </span>

              <ArrowRight
                size={19}
                className="shrink-0 transition group-hover:translate-x-1"
              />
            </a>

            <a
              href={supportUrl}
              onClick={dismissNotice}
              className="group flex min-h-[78px] items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-950 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-blue-800 dark:hover:bg-blue-950/40 sm:px-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Headphones size={23} />
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="block font-black">
                  Contact Support
                </span>

                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  We&apos;re here to help
                </span>
              </span>

              <ArrowRight
                size={19}
                className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
              />
            </a>
          </div>

          {!whatsappChannelUrl ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Add NEXT_PUBLIC_WHATSAPP_CHANNEL_URL to your frontend .env file
              to activate the WhatsApp button.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
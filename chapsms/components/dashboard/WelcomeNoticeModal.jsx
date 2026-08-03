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

const NOTICE_VERSION = "welcome-notice-v2";

export default function WelcomeNoticeModal({
  whatsappChannelUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "",
  supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL || "/support",
}) {
  const { user, authLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const userIdentifier = useMemo(() => {
    return String(user?._id || user?.id || user?.email || "member")
      .trim()
      .toLowerCase();
  }, [user]);

  const storageKey = useMemo(
    () => `chapsms:${NOTICE_VERSION}:${userIdentifier}`,
    [userIdentifier],
  );

  useEffect(() => {
    if (authLoading || !user || user?.role === "admin") return undefined;

    let timer;

    try {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        timer = window.setTimeout(() => setOpen(true), 350);
      }
    } catch {
      timer = window.setTimeout(() => setOpen(true), 350);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [authLoading, storageKey, user]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") dismissNotice();
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
      // The modal still closes when localStorage is unavailable.
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-5 py-6 backdrop-blur-sm sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismissNotice();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-notice-title"
        aria-describedby="welcome-notice-description"
        className="relative my-auto max-h-[calc(100dvh-3rem)] w-[min(100%,360px)] overflow-y-auto rounded-[26px] border border-white/10 bg-[var(--card)] shadow-[0_35px_100px_-25px_rgba(15,23,42,0.65)] sm:w-full sm:max-w-[440px] sm:rounded-[30px]"
      >
        <button
          type="button"
          onClick={dismissNotice}
          aria-label="Close platform notice"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4 sm:h-10 sm:w-10"
        >
          <X size={19} />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 px-5 pb-7 pt-8 text-center text-white sm:px-8 sm:pb-10 sm:pt-12">
          <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-indigo-400/30 blur-3xl" />

          <div className="relative">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 shadow-xl backdrop-blur sm:h-20 sm:w-20">
              <Megaphone size={28} className="sm:hidden" />
              <Megaphone size={34} className="hidden sm:block" />
            </span>

            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.26em] text-blue-100 sm:mt-6 sm:text-xs sm:tracking-[0.28em]">
              Platform notice
            </p>

            <h2
              id="welcome-notice-title"
              className="mx-auto mt-2 max-w-sm text-[28px] font-black leading-tight tracking-tight sm:mt-3 sm:text-[34px]"
            >
              Welcome to ChapsSmS
            </h2>
          </div>
        </div>

        <div className="px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
          <button
            type="button"
            onClick={dismissNotice}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 active:translate-y-0 sm:min-h-14 sm:text-base"
          >
            Got it — let&apos;s go!
          </button>

          <p
            id="welcome-notice-description"
            className="mx-auto mt-5 max-w-sm text-center text-sm leading-6 text-[var(--muted-foreground)] sm:mt-8 sm:text-base sm:leading-7"
          >
            Stay informed through our WhatsApp channel for service updates,
            downtime notices, maintenance information, and new features.
          </p>

          <div className="mt-5 space-y-3 sm:mt-7">
            <a
              href={whatsappChannelUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              aria-disabled={!whatsappChannelUrl}
              className={`group flex min-h-[68px] items-center gap-3 rounded-2xl px-3.5 text-white shadow-lg transition sm:min-h-[78px] sm:gap-4 sm:px-5 ${
                whatsappChannelUrl
                  ? "bg-gradient-to-r from-emerald-600 to-green-500 hover:-translate-y-0.5 hover:shadow-xl"
                  : "cursor-not-allowed bg-slate-400 opacity-70"
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-12 sm:w-12">
                <MessageCircleMore size={22} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-black sm:text-base">
                  Join WhatsApp Channel
                </span>
                <span className="mt-0.5 block text-[11px] text-white/80 sm:text-sm">
                  Updates and announcements
                </span>
              </span>
              <ArrowRight size={18} className="shrink-0" />
            </a>

            <a
              href={supportUrl}
              onClick={dismissNotice}
              className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-3.5 text-[var(--foreground)] transition hover:border-blue-400 sm:min-h-[78px] sm:gap-4 sm:px-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] sm:h-12 sm:w-12">
                <Headphones size={22} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-black sm:text-base">
                  Contact Support
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)] sm:text-sm">
                  We&apos;re here to help
                </span>
              </span>
              <ArrowRight size={18} className="shrink-0 text-[var(--muted-foreground)]" />
            </a>
          </div>

          {!whatsappChannelUrl ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Add NEXT_PUBLIC_WHATSAPP_CHANNEL_URL to your frontend environment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

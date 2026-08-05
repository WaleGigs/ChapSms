"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import ChapsSmsLogo from "@/components/brand/ChapsSmsLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const navigationLinks = [
  {
    href: "/#services",
    label: "Services",
  },
  {
    href: "/#countries",
    label: "Countries",
  },
  {
    href: "/#features",
    label: "Features",
  },
  {
    href: "/#api",
    label: "API",
  },
  {
    href: "/#faq",
    label: "FAQ",
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const headerRef = useRef(null);

  const {
    user,
    authLoading,
  } = useAuth();

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const dashboardHref =
    user?.role === "admin"
      ? "/admin"
      : "/buy-number";

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    function handleResize() {
      if (window.innerWidth >= 1024) {
        closeMenu();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className="
        sticky
        top-0
        z-[200]
        border-b
        border-[var(--border)]
        bg-[var(--background)]
        shadow-sm
      "
    >
      <nav className="site-container flex h-16 items-center justify-between gap-3 sm:h-[72px]">
       <ChapsSmsLogo priority />

        <div className="hidden items-center gap-1 lg:flex">
          {navigationLinks.map(
            (link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {link.label}
              </a>
            )
          )}
        </div>

     <div className="flex items-center gap-2 sm:gap-3">
  <ThemeToggle />

  {!authLoading && user ? (
    <a
      href={dashboardHref}
      className="
        focus-ring
        hidden
        min-h-10
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-blue-600
        px-4
        py-2
        text-sm
        font-semibold
        text-white
        shadow-sm
        transition
        hover:bg-blue-700
        active:scale-[0.98]
        sm:inline-flex
      "
    >
      Open dashboard
      <ArrowRight size={16} />
    </a>
  ) : (
    <>
      <a
        href="/login"
        className="
          focus-ring
          hidden
          rounded-lg
          px-3
          py-2
          text-sm
          font-semibold
          text-[var(--muted-foreground)]
          transition
          hover:text-[var(--foreground)]
          sm:block
        "
      >
        Login
      </a>

      <a
        href="/signup"
        className="
          focus-ring
          hidden
          min-h-10
          items-center
          justify-center
          rounded-xl
          bg-blue-600
          px-4
          py-2
          text-sm
          font-semibold
          text-white
          shadow-sm
          transition
          hover:bg-blue-700
          active:scale-[0.98]
          sm:inline-flex
        "
      >
        Get started
      </a>
    </>
  )}

  <button
    type="button"
    onClick={() =>
      setMenuOpen(
        (current) => !current
      )
    }
    aria-label={
      menuOpen
        ? "Close navigation menu"
        : "Open navigation menu"
    }
    aria-expanded={menuOpen}
    aria-controls="mobile-navigation"
    className="
      focus-ring
      flex
      h-11
      w-11
      items-center
      justify-center
      rounded-xl
      border
      border-[var(--border)]
      bg-[var(--card)]
      text-[var(--foreground)]
      shadow-sm
      transition
      active:scale-95
      lg:hidden
    "
  >
    {menuOpen ? (
      <X size={21} />
    ) : (
      <Menu size={21} />
    )}
  </button>
</div>
      </nav>

      {menuOpen ? (
        <div
          id="mobile-navigation"
          className="
            fixed
            inset-x-0
            bottom-0
            top-16
            z-[210]
            overflow-y-auto
            overscroll-contain
            border-t
            border-[var(--border)]
            bg-[var(--background)]
            lg:hidden
            sm:top-[72px]
          "
        >
          <div className="site-container flex min-h-full flex-col py-6">
            <div className="space-y-2">
              {navigationLinks.map(
                (link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="
                      focus-ring
                      flex
                      min-h-14
                      items-center
                      rounded-2xl
                      px-5
                      py-3
                      text-lg
                      font-bold
                      text-[var(--foreground)]
                      transition
                      active:bg-[var(--muted)]
                    "
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>

            <div className="mt-auto border-t border-[var(--border)] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              {!authLoading && user ? (
                <Button
                  href={dashboardHref}
                  className="w-full"
                  onClick={closeMenu}
                >
                  Open dashboard
                  <ArrowRight size={17} />
                </Button>
              ) : (
                <div className="grid gap-3">
                  <Button
                    href="/signup"
                    className="w-full"
                    onClick={closeMenu}
                  >
                    Create free account
                  </Button>

                  <Button
                    href="/login"
                    variant="secondary"
                    className="w-full"
                    onClick={closeMenu}
                  >
                    Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

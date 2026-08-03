"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";

import ThemeToggle from "@/components/ui/ThemeToggle";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "#services", label: "Services" },
  { href: "#countries", label: "Countries" },
  { href: "#features", label: "Features" },
  { href: "#api", label: "API" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, authLoading } = useAuth();

  const headerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
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

    function handlePointerDown(event) {
      if (
        menuOpen &&
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  const dashboardHref =
    user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-[100] border-b border-[var(--border)] bg-white shadow-sm dark:bg-slate-950"
    >
      <nav className="site-container flex h-16 items-center justify-between gap-3 sm:h-[72px]">
        <Link
          href="/"
          onClick={closeMenu}
          className="focus-ring rounded-lg text-xl font-black tracking-tight text-[var(--foreground)] sm:text-2xl"
          aria-label="ChapsSmS homepage"
        >
          Chaps<span className="text-blue-600">SmS</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {!authLoading && user ? (
            <Button
              href={dashboardHref}
              size="sm"
              className="hidden sm:inline-flex"
            >
              Open dashboard
              <ArrowRight size={16} />
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="focus-ring hidden rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] sm:block"
              >
                Login
              </Link>

              <Button
                href="/signup"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Get started
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] lg:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        aria-hidden={!menuOpen}
        className={`absolute inset-x-0 top-full z-[110] max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-[var(--border)] bg-white shadow-2xl transition-all duration-200 dark:bg-slate-950 sm:max-h-[calc(100dvh-72px)] lg:hidden ${
          menuOpen
            ? "pointer-events-auto visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="site-container py-5">
          <div className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="focus-ring flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-5">
            {!authLoading && user ? (
              <Button
                href={dashboardHref}
                className="w-full"
                onClick={closeMenu}
              >
                Open dashboard
                <ArrowRight size={16} />
              </Button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
    </header>
  );
}
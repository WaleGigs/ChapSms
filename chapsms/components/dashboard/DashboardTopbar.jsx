"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  WalletCards,
} from "lucide-react";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";

export default function DashboardTopbar({
  onMenuClick,
}) {
  const router = useRouter();
  const profileMenuRef = useRef(null);

  const { user, logout } = useAuth();
  const { wallet, loading } = useWallet();

  const [profileOpen, setProfileOpen] =
    useState(false);
  const [loggingOut, setLoggingOut] =
    useState(false);

  const fullName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const initials =
    `${user?.firstName?.[0] || ""}${
      user?.lastName?.[0] || ""
    }`.toUpperCase() || "C";

  const balance = Number(
    wallet?.balance || 0
  ).toLocaleString("en-NG");

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  async function handleLogout() {
  if (loggingOut) return;

  try {
    setLoggingOut(true);
    setProfileOpen(false);

    logout();

    toast.success("Logged out successfully");

    router.replace("/login");
  } catch (error) {
    toast.error(
      error?.message || "Logout failed"
    );

    setLoggingOut(false);
  }
}
  function closeProfileMenu() {
    setProfileOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div
        className="
          mx-auto
          flex
          h-16
          w-full
          max-w-[1600px]
          items-center
          justify-between
          gap-2
          px-3
          min-[375px]:px-4
          sm:gap-4
          sm:px-6
          lg:px-8
          xl:px-10
        "
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open dashboard navigation"
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[var(--border)]
              bg-[var(--card)]
              text-[var(--foreground)]
              transition
              hover:bg-[var(--muted)]
              active:scale-95
              lg:hidden
            "
          >
            <Menu size={20} />
          </button>

          <Link
            href="/buy-number"
            className="
              truncate
              text-base
              font-black
              tracking-tight
              text-[var(--foreground)]
              min-[375px]:text-lg
              lg:hidden
            "
          >
            Chaps
            <span className="text-blue-600">
              SmS
            </span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 min-[375px]:gap-2 sm:gap-3">
          <Link
            href="/wallet"
            aria-label={`Wallet balance ₦${balance}`}
            className="
              flex
              min-h-10
              min-w-0
              items-center
              gap-2
              rounded-xl
              border
              border-[var(--border)]
              bg-[var(--card)]
              px-2.5
              py-2
              transition
              hover:border-blue-400
              hover:bg-[var(--muted)]
              min-[375px]:px-3
              sm:px-4
            "
          >
            <WalletCards
              size={17}
              className="hidden shrink-0 text-blue-600 min-[430px]:block"
            />

            <div className="min-w-0 text-right">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)] sm:block">
                Balance
              </p>

              <p className="max-w-[100px] truncate text-xs font-black text-[var(--foreground)] min-[375px]:text-sm sm:max-w-none sm:text-base">
                {loading
                  ? "Loading..."
                  : `₦${balance}`}
              </p>
            </div>
          </Link>

          <ThemeToggle />

          <div
            ref={profileMenuRef}
            className="relative shrink-0"
          >
            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (current) => !current
                )
              }
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="
                flex
                min-h-10
                items-center
                gap-2
                rounded-xl
                border
                border-[var(--border)]
                bg-[var(--card)]
                p-1
                transition
                hover:bg-[var(--muted)]
                active:scale-[0.98]
                sm:gap-3
                sm:p-1.5
                sm:pr-2
              "
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-sm">
                {initials}
              </div>

              <div className="hidden max-w-40 min-w-0 text-left md:block">
                <p className="truncate text-sm font-bold text-[var(--foreground)]">
                  {fullName ||
                    "ChapsSmS User"}
                </p>

                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {user?.email ||
                    "Account"}
                </p>
              </div>

              <ChevronDown
                size={15}
                className={`hidden shrink-0 text-[var(--muted-foreground)] transition-transform md:block ${
                  profileOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            <div
              role="menu"
              className={`
                absolute
                right-0
                top-full
                z-50
                mt-2
                w-[calc(100vw-24px)]
                max-w-64
                origin-top-right
                rounded-2xl
                border
                border-[var(--border)]
                bg-[var(--card)]
                p-2
                shadow-2xl
                transition
                duration-150
                ${
                  profileOpen
                    ? "visible translate-y-0 scale-100 opacity-100"
                    : "invisible -translate-y-1 scale-95 opacity-0"
                }
              `}
            >
              <div className="border-b border-[var(--border)] px-3 py-3 md:hidden">
                <p className="truncate text-sm font-bold text-[var(--foreground)]">
                  {fullName ||
                    "ChapsSmS User"}
                </p>

                <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                  {user?.email ||
                    "Account"}
                </p>
              </div>

              <div className="pt-1 md:pt-0">
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={closeProfileMenu}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  <User size={17} />
                  Profile
                </Link>

                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={closeProfileMenu}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  <Settings size={17} />
                  Settings
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30"
                >
                  <LogOut size={17} />

                  {loggingOut
                    ? "Logging out..."
                    : "Log out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
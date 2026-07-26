"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  WalletCards,
  CreditCard,
  Settings,
  LogOut,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

const links = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
  },
  {
    href: "/admin/wallets",
    label: "Wallets",
    icon: WalletCards,
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function AdminSidebar({
  open = false,
  onClose,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  function isActive(href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error(error.message || "Logout failed");
    }
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="text-xl font-black tracking-tight text-[var(--foreground)]"
        >
          Chaps<span className="text-blue-600">SmS</span>

          <span className="ml-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            Admin
          </span>
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="mt-8 space-y-1.5">
        {links.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen border-r border-[var(--border)] bg-[var(--card)] p-5 lg:block">
        {content}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-slate-950/55"
          />

          <aside className="relative h-full w-[280px] border-r border-[var(--border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
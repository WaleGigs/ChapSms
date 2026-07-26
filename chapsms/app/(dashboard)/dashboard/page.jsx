"use client";

import Link from "next/link";
import {
  ArrowRight,
  History,
  MessageSquareText,
  Phone,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useOrders } from "@/hooks/useOrders";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function capitalize(value) {
  if (!value) return "Unknown";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusClasses(status) {
  if (status === "received") {
    return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
  }

  if (status === "waiting") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }

  if (status === "cancelled" || status === "expired") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  return "bg-[var(--muted)] text-[var(--muted-foreground)]";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { orders, loading: ordersLoading } = useOrders();

  const activeOrder = orders.find(
    (order) => order.status === "waiting"
  );

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-7">
        <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
          Welcome back
          {user?.firstName ? `, ${user.firstName}` : ""}
        </h1>

        <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
          Manage your wallet and verification orders.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Wallet balance
              </p>

              <p className="mt-3 text-4xl font-black tracking-tight text-[var(--foreground)]">
                {walletLoading
                  ? "..."
                  : formatNaira(wallet?.balance)}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <WalletCards size={21} />
            </div>
          </div>

          <Link
            href="/wallet"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Add funds
            <ArrowRight size={16} />
          </Link>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Active order
              </p>

              {ordersLoading ? (
                <p className="mt-3 text-xl font-black text-[var(--foreground)]">
                  Loading...
                </p>
              ) : activeOrder ? (
                <>
                  <p className="mt-3 text-xl font-black text-[var(--foreground)]">
                    {capitalize(activeOrder.service)}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">
                    {activeOrder.phoneNumber}
                  </p>

                  <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    Waiting for SMS
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-3 text-xl font-black text-[var(--foreground)]">
                    No active order
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Buy a number to start receiving SMS.
                  </p>
                </>
              )}
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <Phone size={21} />
            </div>
          </div>

          <Link
            href="/buy-number"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {activeOrder ? "View order" : "Receive SMS"}
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link
          href="/buy-number"
          className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm transition hover:border-blue-300 hover:bg-[var(--muted)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MessageSquareText size={19} />
            </div>

            <div>
              <p className="font-black text-[var(--foreground)]">
                Receive SMS
              </p>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Buy a verification number.
              </p>
            </div>
          </div>

          <ArrowRight
            className="text-[var(--muted-foreground)]"
            size={18}
          />
        </Link>

        <Link
          href="/wallet"
          className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm transition hover:border-blue-300 hover:bg-[var(--muted)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <WalletCards size={19} />
            </div>

            <div>
              <p className="font-black text-[var(--foreground)]">
                Add Funds
              </p>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Fund your wallet securely.
              </p>
            </div>
          </div>

          <ArrowRight
            className="text-[var(--muted-foreground)]"
            size={18}
          />
        </Link>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-[var(--foreground)]">
              Recent orders
            </h2>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Your latest verification activity.
            </p>
          </div>

          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View history
            <History size={16} />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
            Loading orders...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Phone
              className="mx-auto text-[var(--muted-foreground)]"
              size={28}
            />

            <p className="mt-4 font-bold text-[var(--foreground)]">
              No orders yet
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Your recent orders will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentOrders.map((order) => (
              <div
                key={order._id}
                className="flex flex-col justify-between gap-3 px-6 py-4 transition hover:bg-[var(--muted)] sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-[var(--foreground)]">
                    {capitalize(order.service)}
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {order.country} · {order.phoneNumber}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                      order.status
                    )}`}
                  >
                    {capitalize(order.status)}
                  </span>

                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
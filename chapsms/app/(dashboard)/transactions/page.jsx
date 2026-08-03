"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import { useOrders } from "@/hooks/useOrders";
import { walletService } from "@/services/walletService";

function formatMoney(value) {
  const amount = Number(value || 0);
  return `₦${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClasses(status) {
  const normalized = String(status || "").toLowerCase();

  if (["received", "completed", "successful"].includes(normalized)) {
    return "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900";
  }

  if (["expired", "cancelled", "failed"].includes(normalized)) {
    return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  }

  if (["returned", "refund"].includes(normalized)) {
    return "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
}

export default function TransactionsPage() {
  const { orders, loading: ordersLoading, refreshOrders } = useOrders();

  const [activeTab, setActiveTab] = useState("orders");
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPayments() {
    try {
      setPaymentsLoading(true);
      const data = await walletService.getTransactions();
      setWalletTransactions(Array.isArray(data) ? data : []);
    } finally {
      setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    loadPayments().catch((error) => {
      console.error("Wallet transaction loading failed:", error);
    });
  }, []);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) =>
      [
        order?._id,
        order?.phoneNumber,
        order?.country,
        order?.service,
        order?.status,
        order?.otpCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [orders, orderSearch]);

  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    if (!query) return walletTransactions;

    return walletTransactions.filter((transaction) =>
      [
        transaction?._id,
        transaction?.reference,
        transaction?.transactionId,
        transaction?.type,
        transaction?.amount,
        transaction?.paymentMethod,
        transaction?.description,
        transaction?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [paymentSearch, walletTransactions]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      if (activeTab === "orders") {
        await refreshOrders();
      } else {
        await loadPayments();
      }
    } finally {
      setRefreshing(false);
    }
  }

  const activeLoading = activeTab === "orders" ? ordersLoading : paymentsLoading;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
          Usage <span className="text-blue-600">History</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
          View verification orders and real wallet transactions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm sm:inline-flex sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            activeTab === "orders"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Clock3 size={17} />
          Order History
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            activeTab === "payments"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <CreditCard size={17} />
          Payment History
        </button>
      </div>

      <section className="mt-5 min-h-[310px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)]">
              {activeTab === "orders" ? "Order history" : "Payment history"}
              <span className="ml-2 text-sm font-semibold text-[var(--muted-foreground)]">
                ({activeTab === "orders" ? filteredOrders.length : filteredPayments.length})
              </span>
            </h2>
          </div>

          <div className="flex w-full gap-2 md:w-auto">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                value={activeTab === "orders" ? orderSearch : paymentSearch}
                onChange={(event) =>
                  activeTab === "orders"
                    ? setOrderSearch(event.target.value)
                    : setPaymentSearch(event.target.value)
                }
                placeholder={`Search ${activeTab}...`}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh history"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {activeLoading ? (
          <div className="flex min-h-[230px] items-center justify-center gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
            <LoaderCircle size={18} className="animate-spin" />
            Loading history...
          </div>
        ) : activeTab === "orders" ? (
          filteredOrders.length ? (
            <HistoryList
              rows={filteredOrders.map((order) => ({
                id: order?._id || order?.id,
                title: order?.service || "Unknown service",
                subtitle: order?.country || "Unknown country",
                amount: order?.price ? formatMoney(order.price) : "—",
                detail: order?.phoneNumber || "—",
                status: order?.status || "waiting",
                date: order?.createdAt,
              }))}
            />
          ) : (
            <EmptyHistory text="No order history yet." />
          )
        ) : filteredPayments.length ? (
          <HistoryList
            rows={filteredPayments.map((transaction) => ({
              id: transaction?._id || transaction?.reference || transaction?.transactionId,
              title: transaction?.description || transaction?.type || "Wallet transaction",
              subtitle: transaction?.paymentMethod || transaction?.paymentGateway || transaction?.type,
              amount: formatMoney(transaction?.amount),
              detail: transaction?.reference || transaction?.transactionId || "—",
              status: transaction?.status || "completed",
              date: transaction?.createdAt || transaction?.date,
            }))}
          />
        ) : (
          <EmptyHistory text="No wallet transactions yet." showFundingLink />
        )}
      </section>
    </div>
  );
}

function EmptyHistory({ text, showFundingLink = false }) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-[var(--muted-foreground)]">{text}</p>
      {showFundingLink ? (
        <Link href="/wallet" className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700">
          Add funds to your wallet →
        </Link>
      ) : null}
    </div>
  );
}

function HistoryList({ rows }) {
  return (
    <>
      <div className="mt-5 space-y-3 md:hidden">
        {rows.map((row, index) => (
          <article
            key={`${row.id || "history"}-${index}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-[var(--foreground)]">{row.title}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{row.subtitle}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(row.status)}`}>
                {row.status}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-[var(--card)] p-3">
              <p className="break-all text-sm font-semibold text-[var(--foreground)]">{row.detail}</p>
              <p className="mt-2 text-lg font-black text-[var(--foreground)]">{row.amount}</p>
            </div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{formatDate(row.date)}</p>
          </article>
        ))}
      </div>

      <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <th className="pb-3">Description</th>
              <th className="pb-3">Detail</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id || "history"}-${index}`} className="border-b border-[var(--border)] last:border-0">
                <td className="py-4">
                  <p className="font-bold text-[var(--foreground)]">{row.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{row.subtitle}</p>
                </td>
                <td className="py-4 text-[var(--muted-foreground)]">{row.detail}</td>
                <td className="py-4 font-black text-[var(--foreground)]">{row.amount}</td>
                <td className="py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-4 text-right text-[var(--muted-foreground)]">{formatDate(row.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

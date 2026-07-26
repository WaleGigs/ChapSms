"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, CreditCard, RefreshCw, Search } from "lucide-react";

import { transactions } from "@/data/transactions/transactions";
import { useOrders } from "@/hooks/useOrders";

export default function TransactionsPage() {
  const { orders, loading: ordersLoading, refreshOrders } = useOrders();

  const [activeTab, setActiveTab] = useState("orders");
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

    if (!query) return transactions;

    return transactions.filter((transaction) =>
      [
        transaction?.id,
        transaction?.type,
        transaction?.amount,
        transaction?.method,
        transaction?.status,
        transaction?.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [paymentSearch]);

  async function handleRefresh() {
    try {
      setRefreshing(true);

      if (activeTab === "orders") {
        await refreshOrders();
      }
    } finally {
      setRefreshing(false);
    }
  }

  function formatMoney(value) {
    const amount = Number(String(value ?? 0).replace(/[^0-9.-]+/g, ""));

    return Number.isFinite(amount) ? `#${amount.toFixed(2)}` : "#0.00";
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusClasses(status) {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized === "received" ||
      normalized === "completed" ||
      normalized === "successful"
    ) {
      return "bg-green-50 text-green-700 ring-green-200";
    }

    if (
      normalized === "expired" ||
      normalized === "cancelled" ||
      normalized === "failed"
    ) {
      return "bg-red-50 text-red-700 ring-red-200";
    }

    if (normalized === "returned" || normalized === "refund") {
      return "bg-purple-50 text-purple-700 ring-purple-200";
    }

    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-0 sm:px-1">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Usage <span className="text-blue-600">History</span>
        </h1>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          View and manage recent verification orders and wallet transactions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            activeTab === "orders"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
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
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
          }`}
        >
          <CreditCard size={17} />
          Payment History
        </button>
      </div>

      <section className="mt-5 min-h-[310px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        {activeTab === "orders" ? (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Order history
                  <span className="ml-2 text-sm font-semibold text-slate-400">
                    ({filteredOrders.length})
                  </span>
                </h2>
              </div>

              <div className="flex w-full gap-2 md:w-auto">
                <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search orders..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh orders"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>

            {ordersLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-slate-400">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-slate-400">
                  No order history yet.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 md:hidden">
                  {filteredOrders.map((order) => (
                    <article
                      key={order._id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">
                            {order.service || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.country || "—"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                            order.status,
                          )}`}
                        >
                          {order.status || "waiting"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-xl bg-white p-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Number
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                            {order.phoneNumber || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            OTP
                          </p>
                          <p className="mt-1 break-all font-black tracking-wider text-slate-950">
                            {order.otpCode || "—"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Service</th>
                        <th className="pb-3">Country</th>
                        <th className="pb-3">Number</th>
                        <th className="pb-3">OTP</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr
                          key={order._id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-4 font-bold text-slate-950">
                            {order.service || "—"}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {order.country || "—"}
                          </td>

                          <td className="py-4 font-semibold text-slate-700">
                            {order.phoneNumber || "—"}
                          </td>

                          <td className="py-4 font-black tracking-wider text-slate-950">
                            {order.otpCode || "—"}
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(
                                order.status,
                              )}`}
                            >
                              {order.status || "waiting"}
                            </span>
                          </td>

                          <td className="py-4 text-right text-sm text-slate-500">
                            {formatDate(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Payment history
                  <span className="ml-2 text-sm font-semibold text-slate-400">
                    ({filteredPayments.length})
                  </span>
                </h2>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={paymentSearch}
                    onChange={(event) => setPaymentSearch(event.target.value)}
                    placeholder="Search payments..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <Link
                  href="/wallet"
                  className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Add Funds
                </Link>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-slate-400">
                  No payments yet.
                </p>

                <Link
                  href="/wallet"
                  className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  Add funds to your wallet →
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 md:hidden">
                  {filteredPayments.map((transaction) => (
                    <article
                      key={transaction.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">
                            {transaction.type}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {transaction.id}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                            transaction.status,
                          )}`}
                        >
                          {transaction.status || "completed"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-4 rounded-xl bg-white p-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Method
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                            {transaction.method || "—"}
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-black text-slate-950">
                          {formatMoney(transaction.amount)}
                        </p>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        {formatDate(transaction.date)}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Transaction ID</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPayments.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-4 font-semibold text-slate-700">
                            {transaction.id}
                          </td>

                          <td className="py-4 font-bold text-slate-950">
                            {transaction.type}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {transaction.method || "—"}
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(
                                transaction.status,
                              )}`}
                            >
                              {transaction.status || "completed"}
                            </span>
                          </td>

                          <td className="py-4 text-sm text-slate-500">
                            {formatDate(transaction.date)}
                          </td>

                          <td className="py-4 text-right font-black text-slate-950">
                            {formatMoney(transaction.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
"use client";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  Clock3,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  useOrders,
} from "@/hooks/useOrders";
import {
  useWallet,
} from "@/hooks/useWallet";

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeText(value) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

function getTransactionId(
  transaction,
) {
  return (
    transaction
      ?.reference ||
    transaction
      ?.transactionId ||
    transaction?._id ||
    transaction?.id ||
    "—"
  );
}

function getPaymentTitle(
  transaction,
) {
  const description =
    String(
      transaction
        ?.description ||
        "",
    ).trim();

  if (description) {
    return description;
  }

  const environment =
    normalizeText(
      transaction
        ?.environment,
    );

  return environment ===
    "test"
    ? "Flutterwave test wallet funding"
    : "Flutterwave wallet funding";
}

function getPaymentMethod(
  transaction,
) {
  const method =
    String(
      transaction
        ?.paymentMethod ||
        "",
    ).trim();

  const gateway =
    String(
      transaction
        ?.paymentGateway ||
        "",
    ).trim();

  if (
    method &&
    gateway
  ) {
    return `${gateway} · ${method}`;
  }

  return (
    method ||
    gateway ||
    "Flutterwave"
  );
}

function formatMoney(value) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0,
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function statusClasses(status) {
  const normalized =
    normalizeText(status);

  if (
    [
      "received",
      "completed",
      "successful",
    ].includes(
      normalized,
    )
  ) {
    return "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900";
  }

  if (
    [
      "expired",
      "cancelled",
      "failed",
    ].includes(
      normalized,
    )
  ) {
    return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  }

  if (
    [
      "pending",
      "waiting",
    ].includes(
      normalized,
    )
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
}

export default function TransactionsPage() {
  const {
    orders,
    loading:
      ordersLoading,
    refreshOrders,
  } = useOrders();

  const {
    wallet,
    loading:
      walletLoading,
    refreshWallet,
  } = useWallet();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "orders",
  );

  const [
    orderSearch,
    setOrderSearch,
  ] = useState("");

  const [
    paymentSearch,
    setPaymentSearch,
  ] = useState("");

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const filteredOrders =
    useMemo(() => {
      const query =
        normalizeText(
          orderSearch,
        );

      const allOrders =
        asArray(orders);

      if (!query) {
        return allOrders;
      }

      return allOrders.filter(
        (order) =>
          [
            order?._id,
            order?.phoneNumber,
            order?.country,
            order?.countryName,
            order?.service,
            order?.serviceName,
            order?.status,
            order?.otpCode,
            order?.server,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
    }, [
      orders,
      orderSearch,
    ]);

  /*
   * Payment History is wallet funding only.
   *
   * Purchases and order refunds remain represented by Order History
   * and are deliberately excluded from this tab.
   */
  const paymentTransactions =
    useMemo(() => {
      return asArray(
        wallet
          ?.transactions,
      )
        .filter(
          (
            transaction,
          ) => {
            return (
              normalizeText(
                transaction
                  ?.type,
              ) ===
                "deposit" &&
              normalizeText(
                transaction
                  ?.paymentGateway,
              ) ===
                "flutterwave"
            );
          },
        )
        .sort(
          (
            left,
            right,
          ) => {
            const leftTime =
              new Date(
                left?.createdAt ||
                  0,
              ).getTime();

            const rightTime =
              new Date(
                right?.createdAt ||
                  0,
              ).getTime();

            return (
              rightTime -
              leftTime
            );
          },
        );
    }, [
      wallet
        ?.transactions,
    ]);

  const filteredPayments =
    useMemo(() => {
      const query =
        normalizeText(
          paymentSearch,
        );

      if (!query) {
        return paymentTransactions;
      }

      return paymentTransactions.filter(
        (
          transaction,
        ) => {
          return [
            getTransactionId(
              transaction,
            ),
            getPaymentTitle(
              transaction,
            ),
            transaction
              ?.amount,
            transaction
              ?.paymentMethod,
            transaction
              ?.paymentGateway,
            transaction
              ?.status,
            transaction
              ?.environment,
            transaction
              ?.createdAt,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      paymentTransactions,
      paymentSearch,
    ]);

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      if (
        activeTab ===
        "orders"
      ) {
        await refreshOrders();
      } else {
        await refreshWallet();
      }
    } finally {
      setRefreshing(false);
    }
  }

  const activeLoading =
    activeTab === "orders"
      ? ordersLoading
      : walletLoading;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-0 sm:px-1">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
          Usage{" "}
          <span className="text-blue-600">
            History
          </span>
        </h1>

        <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
          Review verification orders and wallet-funding payments separately.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm sm:inline-flex sm:w-auto">
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "orders",
            )
          }
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            activeTab ===
            "orders"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Clock3
            size={17}
          />
          Order History
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "payments",
            )
          }
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${
            activeTab ===
            "payments"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <CreditCard
            size={17}
          />
          Payment History
        </button>
      </div>

      <section className="mt-5 min-h-[310px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
        {activeTab ===
        "orders" ? (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                Order history
                <span className="ml-2 text-sm font-semibold text-[var(--muted-foreground)]">
                  (
                  {
                    filteredOrders.length
                  }
                  )
                </span>
              </h2>

              <div className="flex w-full gap-2 md:w-auto">
                <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />

                  <input
                    value={
                      orderSearch
                    }
                    onChange={(
                      event,
                    ) =>
                      setOrderSearch(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Search orders..."
                    className="focus-ring h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                  aria-label="Refresh orders"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            {activeLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-[var(--muted-foreground)]">
                Loading orders...
              </div>
            ) : filteredOrders.length ===
              0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-center">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  No order history yet.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 md:hidden">
                  {filteredOrders.map(
                    (
                      order,
                    ) => (
                      <article
                        key={
                          order._id
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-[var(--foreground)]">
                              {order.serviceName ||
                                order.service ||
                                "—"}
                            </p>

                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {order.countryName ||
                                order.country ||
                                "—"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                              order.status,
                            )}`}
                          >
                            {order.status ||
                              "waiting"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-xl bg-[var(--background)] p-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Number
                            </p>

                            <p className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]">
                              {order.phoneNumber ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                              OTP
                            </p>

                            <p className="mt-1 break-all font-black tracking-wider text-[var(--foreground)]">
                              {order.otpCode ||
                                "—"}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                          {formatDate(
                            order.createdAt,
                          )}
                        </p>
                      </article>
                    ),
                  )}
                </div>

                <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <th className="pb-3">
                          Service
                        </th>
                        <th className="pb-3">
                          Country
                        </th>
                        <th className="pb-3">
                          Number
                        </th>
                        <th className="pb-3">
                          OTP
                        </th>
                        <th className="pb-3">
                          Status
                        </th>
                        <th className="pb-3 text-right">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map(
                        (
                          order,
                        ) => (
                          <tr
                            key={
                              order._id
                            }
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-4 font-bold text-[var(--foreground)]">
                              {order.serviceName ||
                                order.service ||
                                "—"}
                            </td>

                            <td className="py-4 text-[var(--muted-foreground)]">
                              {order.countryName ||
                                order.country ||
                                "—"}
                            </td>

                            <td className="py-4 font-semibold text-[var(--foreground)]">
                              {order.phoneNumber ||
                                "—"}
                            </td>

                            <td className="py-4 font-black tracking-wider text-[var(--foreground)]">
                              {order.otpCode ||
                                "—"}
                            </td>

                            <td className="py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(
                                  order.status,
                                )}`}
                              >
                                {order.status ||
                                  "waiting"}
                              </span>
                            </td>

                            <td className="py-4 text-right text-[var(--muted-foreground)]">
                              {formatDate(
                                order.createdAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                Payment history
                <span className="ml-2 text-sm font-semibold text-[var(--muted-foreground)]">
                  (
                  {
                    filteredPayments.length
                  }
                  )
                </span>
              </h2>

              <div className="flex w-full gap-2 md:w-auto">
                <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />

                  <input
                    value={
                      paymentSearch
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaymentSearch(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Search payments..."
                    className="focus-ring h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                  aria-label="Refresh payments"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Payment History contains verified Flutterwave wallet-funding
              deposits only. Number purchases and order refunds are not mixed
              into this tab.
            </div>

            {activeLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-[var(--muted-foreground)]">
                Loading payments...
              </div>
            ) : filteredPayments.length ===
              0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  No wallet-funding payments yet.
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
                  {filteredPayments.map(
                    (
                      transaction,
                    ) => (
                      <article
                        key={getTransactionId(
                          transaction,
                        )}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-black text-[var(--foreground)]">
                              {getPaymentTitle(
                                transaction,
                              )}
                            </p>

                            <p className="mt-1 break-all text-xs text-[var(--muted-foreground)]">
                              {getTransactionId(
                                transaction,
                              )}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                              transaction.status,
                            )}`}
                          >
                            {transaction.status ||
                              "completed"}
                          </span>
                        </div>

                        <div className="mt-4 rounded-xl bg-[var(--background)] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Method
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold capitalize text-[var(--foreground)]">
                            {getPaymentMethod(
                              transaction,
                            )}
                          </p>

                          <p className="mt-4 text-lg font-black text-[var(--foreground)]">
                            {formatMoney(
                              transaction.amount,
                            )}
                          </p>
                        </div>

                        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                          {formatDate(
                            transaction.createdAt,
                          )}
                        </p>
                      </article>
                    ),
                  )}
                </div>

                <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <th className="pb-3">
                          Reference
                        </th>
                        <th className="pb-3">
                          Payment
                        </th>
                        <th className="pb-3">
                          Method
                        </th>
                        <th className="pb-3">
                          Status
                        </th>
                        <th className="pb-3">
                          Date
                        </th>
                        <th className="pb-3 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPayments.map(
                        (
                          transaction,
                        ) => (
                          <tr
                            key={getTransactionId(
                              transaction,
                            )}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="max-w-[230px] break-all py-4 font-semibold text-[var(--foreground)]">
                              {getTransactionId(
                                transaction,
                              )}
                            </td>

                            <td className="max-w-[260px] py-4 font-bold text-[var(--foreground)]">
                              {getPaymentTitle(
                                transaction,
                              )}
                            </td>

                            <td className="py-4 capitalize text-[var(--muted-foreground)]">
                              {getPaymentMethod(
                                transaction,
                              )}
                            </td>

                            <td className="py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(
                                  transaction.status,
                                )}`}
                              >
                                {transaction.status ||
                                  "completed"}
                              </span>
                            </td>

                            <td className="py-4 text-[var(--muted-foreground)]">
                              {formatDate(
                                transaction.createdAt,
                              )}
                            </td>

                            <td className="py-4 text-right font-black text-[var(--foreground)]">
                              {formatMoney(
                                transaction.amount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
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

"use client";

import {
  useEffect,
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

import { transactions } from "@/data/transactions/transactions";
import { useOrders } from "@/hooks/useOrders";
import { catalogService } from "@/services/catalogService";

const COMMON_SERVICE_NAMES = {
  wa: "WhatsApp",
  whatsapp: "WhatsApp",
  tg: "Telegram",
  telegram: "Telegram",
  fb: "Facebook",
  facebook: "Facebook",
  ig: "Instagram",
  instagram: "Instagram",
  go: "Google",
  google: "Google",
  tt: "TikTok",
  tiktok: "TikTok",
  tw: "X / Twitter",
  twitter: "X / Twitter",
  x: "X / Twitter",
  ds: "Discord",
  discord: "Discord",
};

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function humanizeCode(value) {
  const text = String(value || "")
    .trim();

  if (!text) {
    return "—";
  }

  const common =
    COMMON_SERVICE_NAMES[
      normalizeLookupKey(text)
    ];

  if (common) {
    return common;
  }

  /*
   * Do not pretend a numeric provider ID is a service name.
   * If the catalog lookup has not resolved it, keep it readable
   * until the provider catalog becomes available.
   */
  if (/^\d+$/.test(text)) {
    return `Service ${text}`;
  }

  return text
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function createServiceMap(
  services = []
) {
  const map = {};

  for (const service of services) {
    const name = String(
      service?.name ||
        service?.serviceName ||
        service?.title ||
        service?.label ||
        ""
    ).trim();

    if (!name) {
      continue;
    }

    const identifiers = [
      service?.id,
      service?.code,
      service?.service,
      service?.slug,
    ];

    for (const identifier of identifiers) {
      const key =
        normalizeLookupKey(
          identifier
        );

      if (key) {
        map[key] = name;
      }
    }
  }

  return map;
}

function getOrderServiceName(
  order,
  serviceMaps
) {
  const storedName = String(
    order?.serviceName || ""
  ).trim();

  if (storedName) {
    return storedName;
  }

  const serviceCode =
    normalizeLookupKey(
      order?.service
    );

  if (!serviceCode) {
    return "—";
  }

  const server =
    normalizeLookupKey(
      order?.server
    );

  if (
    server &&
    serviceMaps?.[server]?.[
      serviceCode
    ]
  ) {
    return serviceMaps[server][
      serviceCode
    ];
  }

  /*
   * Legacy orders might not contain a server.
   * Try both catalogs before falling back to a readable code.
   */
  for (const map of Object.values(
    serviceMaps || {}
  )) {
    if (map?.[serviceCode]) {
      return map[serviceCode];
    }
  }

  return humanizeCode(
    order?.service
  );
}

function getOrderCountryName(order) {
  const name = String(
    order?.countryName || ""
  ).trim();

  if (name) {
    return name;
  }

  const rawCountry = String(
    order?.country || ""
  ).trim();

  /*
   * Some older provider orders stored an internal numeric country ID
   * such as "12" or "1" instead of a customer-facing country name.
   * Never display those internal IDs to ChapsSms customers.
   */
  if (!rawCountry || /^\d+$/.test(rawCountry)) {
    return "";
  }

  return humanizeCode(rawCountry);
}

export default function TransactionsPage() {
  const {
    orders,
    loading: ordersLoading,
    refreshOrders,
  } = useOrders();

  const [
    serviceMaps,
    setServiceMaps,
  ] = useState({});

  const [
    activeTab,
    setActiveTab,
  ] = useState("orders");

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

  /*
   * Existing orders were saved with raw provider service IDs such as
   * "wa" or "1012". Load the current ChapsSms catalogs and translate
   * those IDs into the same friendly names customers see on Buy Number.
   *
   * New orders will also carry serviceName directly after the backend
   * changes in this package, so this lookup mainly repairs legacy history.
   */
  useEffect(() => {
    let cancelled = false;

    const legacyOrders =
      Array.isArray(orders)
        ? orders.filter(
            (order) =>
              order?.service &&
              !String(
                order?.serviceName ||
                  ""
              ).trim()
          )
        : [];

    if (!legacyOrders.length) {
      return undefined;
    }

    const servers = [
      ...new Set(
        legacyOrders
          .map((order) =>
            normalizeLookupKey(
              order?.server
            )
          )
          .filter((server) =>
            [
              "server1",
              "server2",
            ].includes(server)
          )
      ),
    ];

    /*
     * Very old records might not have stored a server.
     * In that case query both catalogs.
     */
    const targets =
      servers.length > 0
        ? servers
        : [
            "server1",
            "server2",
          ];

    async function loadNames() {
      const results =
        await Promise.allSettled(
          targets.map(
            async (server) => {
              const catalog =
                await catalogService
                  .getCatalog({
                    server,
                  });

              return {
                server,
                map: createServiceMap(
                  catalog?.services ||
                    []
                ),
              };
            }
          )
        );

      if (cancelled) {
        return;
      }

      const nextMaps = {};

      for (const result of results) {
        if (
          result.status ===
          "fulfilled"
        ) {
          nextMaps[
            result.value.server
          ] = result.value.map;
        }
      }

      if (
        Object.keys(
          nextMaps
        ).length
      ) {
        setServiceMaps(
          (current) => ({
            ...current,
            ...nextMaps,
          })
        );
      }
    }

    loadNames().catch(
      (error) => {
        console.error(
          "Could not resolve legacy service names:",
          error
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const displayOrders =
    useMemo(() => {
      return (
        Array.isArray(orders)
          ? orders
          : []
      ).map((order) => ({
        ...order,
        displayServiceName:
          getOrderServiceName(
            order,
            serviceMaps
          ),
        displayCountryName:
          getOrderCountryName(
            order
          ),
      }));
    }, [
      orders,
      serviceMaps,
    ]);

  const filteredOrders =
    useMemo(() => {
      const query =
        orderSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return displayOrders;
      }

      return displayOrders.filter(
        (order) =>
          [
            order?._id,
            order?.phoneNumber,
            order?.country,
            order?.countryName,
            order?.displayCountryName,
            order?.service,
            order?.serviceName,
            order
              ?.displayServiceName,
            order?.status,
            order?.otpCode,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      displayOrders,
      orderSearch,
    ]);

  const filteredPayments =
    useMemo(() => {
      const query =
        paymentSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return transactions;
      }

      return transactions.filter(
        (transaction) =>
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
            .includes(query)
      );
    }, [paymentSearch]);

  async function handleRefresh() {
    try {
      setRefreshing(true);

      if (
        activeTab === "orders"
      ) {
        await refreshOrders();
      }
    } finally {
      setRefreshing(false);
    }
  }

  function formatMoney(value) {
    const amount = Number(
      String(value ?? 0).replace(
        /[^0-9.-]+/g,
        ""
      )
    );

    return Number.isFinite(amount)
      ? `₦${amount.toLocaleString(
          "en-NG",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`
      : "₦0.00";
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  }

  function statusClasses(status) {
    const normalized =
      String(
        status || ""
      ).toLowerCase();

    if (
      normalized ===
        "received" ||
      normalized ===
        "completed" ||
      normalized ===
        "successful"
    ) {
      return "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900";
    }

    if (
      normalized ===
        "expired" ||
      normalized ===
        "cancelled" ||
      normalized ===
        "failed"
    ) {
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
    }

    if (
      normalized ===
        "returned" ||
      normalized === "refund"
    ) {
      return "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900";
    }

    return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }

  const inputClasses =
    "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

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
          View and manage recent verification orders and wallet transactions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm sm:inline-flex sm:w-auto">
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "orders"
            )
          }
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
          onClick={() =>
            setActiveTab(
              "payments"
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
                      event
                    ) =>
                      setOrderSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search orders..."
                    className={
                      inputClasses
                    }
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

            {ordersLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-[var(--muted-foreground)]">
                Loading orders...
              </div>
            ) : filteredOrders.length ===
              0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  No order history
                  yet.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 md:hidden">
                  {filteredOrders.map(
                    (order) => (
                      <article
                        key={
                          order._id ||
                          order.id
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-[var(--foreground)]">
                              {
                                order.displayServiceName
                              }
                            </p>

                            {order.displayCountryName ? (
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {
                                  order.displayCountryName
                                }
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                              order.status
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
                            order.createdAt
                          )}
                        </p>
                      </article>
                    )
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
                        (order) => (
                          <tr
                            key={
                              order._id ||
                              order.id
                            }
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-4 font-bold text-[var(--foreground)]">
                              {
                                order.displayServiceName
                              }
                            </td>

                            <td className="py-4 text-sm text-[var(--muted-foreground)]">
                              {
                                order.displayCountryName ||
                                "—"
                              }
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
                                  order.status
                                )}`}
                              >
                                {order.status ||
                                  "waiting"}
                              </span>
                            </td>

                            <td className="py-4 text-right text-sm text-[var(--muted-foreground)]">
                              {formatDate(
                                order.createdAt
                              )}
                            </td>
                          </tr>
                        )
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

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                  <input
                    value={
                      paymentSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search payments..."
                    className={
                      inputClasses
                    }
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

            {filteredPayments.length ===
            0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  No payments yet.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3 md:hidden">
                  {filteredPayments.map(
                    (
                      transaction
                    ) => (
                      <article
                        key={
                          transaction.id
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-[var(--foreground)]">
                              {
                                transaction.type
                              }
                            </p>
                            <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                              {
                                transaction.id
                              }
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${statusClasses(
                              transaction.status
                            )}`}
                          >
                            {transaction.status ||
                              "completed"}
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-4 rounded-xl bg-[var(--background)] p-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Method
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
                              {transaction.method ||
                                "—"}
                            </p>
                          </div>

                          <p className="shrink-0 text-lg font-black text-[var(--foreground)]">
                            {formatMoney(
                              transaction.amount
                            )}
                          </p>
                        </div>

                        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                          {formatDate(
                            transaction.date
                          )}
                        </p>
                      </article>
                    )
                  )}
                </div>

                <div className="-mx-4 mt-5 hidden overflow-x-auto px-4 md:block sm:-mx-6 sm:px-6">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <th className="pb-3">
                          Transaction ID
                        </th>
                        <th className="pb-3">
                          Type
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
                          transaction
                        ) => (
                          <tr
                            key={
                              transaction.id
                            }
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-4 font-semibold text-[var(--foreground)]">
                              {
                                transaction.id
                              }
                            </td>
                            <td className="py-4 font-bold text-[var(--foreground)]">
                              {
                                transaction.type
                              }
                            </td>
                            <td className="py-4 text-sm text-[var(--muted-foreground)]">
                              {transaction.method ||
                                "—"}
                            </td>
                            <td className="py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusClasses(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status ||
                                  "completed"}
                              </span>
                            </td>
                            <td className="py-4 text-sm text-[var(--muted-foreground)]">
                              {formatDate(
                                transaction.date
                              )}
                            </td>
                            <td className="py-4 text-right font-black text-[var(--foreground)]">
                              {formatMoney(
                                transaction.amount
                              )}
                            </td>
                          </tr>
                        )
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
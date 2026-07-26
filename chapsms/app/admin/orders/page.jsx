"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  LoaderCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function capitalize(value) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "received":
      return "bg-green-50 text-green-700";

    case "waiting":
      return "bg-blue-50 text-blue-700";

    case "expired":
      return "bg-amber-50 text-amber-700";

    case "cancelled":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusIcon(status) {
  switch (String(status || "").toLowerCase()) {
    case "received":
      return CheckCircle2;

    case "waiting":
      return Clock3;

    case "expired":
    case "cancelled":
      return XCircle;

    default:
      return Clock3;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api("/admin/orders");

      setOrders(response.orders || []);
    } catch (error) {
      console.error("Admin orders loading failed:", error);
      toast.error(error.message || "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const userName = [
        order.user?.firstName,
        order.user?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const searchableValues = [
        order._id,
        order.providerOrderId,
        order.phoneNumber,
        order.country,
        order.service,
        order.status,
        userName,
        order.user?.email,
        order.otpCode,
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [orders, search, statusFilter]);

  async function copyText(value, successMessage) {
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(successMessage);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Orders
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor verification orders across ChapsSmS.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, user, phone, country or service..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="received">Received</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <LoaderCircle
                className="mx-auto animate-spin text-blue-600"
                size={28}
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading orders...
              </p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingCart
              className="mx-auto text-slate-300"
              size={30}
            />

            <p className="mt-4 font-bold text-slate-700">
              No orders found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      User
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Service
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Number
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      OTP
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Price
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Provider ID
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);

                    const userName =
                      [
                        order.user?.firstName,
                        order.user?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Unknown user";

                    return (
                      <tr
                        key={order._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">
                            {userName}
                          </p>

                          <p className="mt-1 max-w-52 truncate text-sm text-slate-500">
                            {order.user?.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">
                            {capitalize(order.service)}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {capitalize(order.country)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                order.phoneNumber,
                                "Phone number copied"
                              )
                            }
                            className="inline-flex items-center gap-2 font-semibold text-slate-700 transition hover:text-blue-600"
                          >
                            {order.phoneNumber || "—"}
                            {order.phoneNumber && <Copy size={14} />}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          {order.otpCode ? (
                            <button
                              type="button"
                              onClick={() =>
                                copyText(
                                  order.otpCode,
                                  "OTP copied"
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-mono text-sm font-black tracking-wider text-blue-700"
                            >
                              {order.otpCode}
                              <Copy size={14} />
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-950">
                          {formatNaira(order.price)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                              order.status
                            )}`}
                          >
                            <StatusIcon size={13} />
                            {capitalize(order.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                order.providerOrderId,
                                "Provider order ID copied"
                              )
                            }
                            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-slate-500 transition hover:text-blue-600"
                          >
                            {order.providerOrderId || "—"}
                            {order.providerOrderId && (
                              <Copy size={13} />
                            )}
                          </button>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);

                const userName =
                  [
                    order.user?.firstName,
                    order.user?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Unknown user";

                return (
                  <article key={order._id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {capitalize(order.service)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {capitalize(order.country)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        <StatusIcon size={13} />
                        {capitalize(order.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">User</span>
                        <span className="text-right font-semibold text-slate-800">
                          {userName}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Number</span>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              order.phoneNumber,
                              "Phone number copied"
                            )
                          }
                          className="inline-flex items-center gap-2 text-right font-semibold text-slate-800"
                        >
                          {order.phoneNumber || "—"}
                          {order.phoneNumber && <Copy size={13} />}
                        </button>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">OTP</span>
                        <span className="font-mono font-bold text-slate-800">
                          {order.otpCode || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Price</span>
                        <span className="font-bold text-slate-800">
                          {formatNaira(order.price)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Date</span>
                        <span className="text-right font-semibold text-slate-800">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
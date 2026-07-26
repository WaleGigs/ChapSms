"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
    case "successful":
      return "bg-green-50 text-green-700";

    case "pending":
      return "bg-amber-50 text-amber-700";

    case "failed":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusIcon(status) {
  switch (String(status || "").toLowerCase()) {
    case "successful":
      return CheckCircle2;

    case "pending":
      return Clock3;

    case "failed":
      return XCircle;

    default:
      return Clock3;
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api("/admin/payments");

      setPayments(response.payments || []);
    } catch (error) {
      console.error("Payment loading failed:", error);
      toast.error(error.message || "Unable to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = String(payment.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const userName = [
        payment.user?.firstName,
        payment.user?.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      return [
        payment._id,
        payment.txRef,
        payment.flutterwaveId,
        payment.status,
        payment.currency,
        payment.amount,
        userName,
        payment.user?.email,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [payments, search, statusFilter]);

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
            Payments
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Review Flutterwave wallet funding transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayments}
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
              placeholder="Search user, transaction or reference..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">All statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <LoaderCircle
                className="mx-auto animate-spin text-blue-600"
                size={28}
              />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading payments...
              </p>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CreditCard
              className="mx-auto text-slate-300"
              size={30}
            />

            <p className="mt-4 font-bold text-slate-700">
              No payments found
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try another search or status filter.
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
                      Amount
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Reference
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Flutterwave ID
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Credited
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => {
                    const StatusIcon = getStatusIcon(payment.status);

                    const userName =
                      [
                        payment.user?.firstName,
                        payment.user?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Unknown user";

                    return (
                      <tr
                        key={payment._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">
                            {userName}
                          </p>

                          <p className="mt-1 max-w-56 truncate text-sm text-slate-500 dark:text-slate-400">
                            {payment.user?.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            {formatNaira(payment.amount)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {payment.currency || "NGN"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                payment.txRef,
                                "Payment reference copied"
                              )
                            }
                            className="inline-flex max-w-56 items-center gap-2 font-mono text-xs font-semibold text-slate-600 transition hover:text-blue-600"
                          >
                            <span className="truncate">
                              {payment.txRef || "—"}
                            </span>

                            {payment.txRef && <Copy size={13} />}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                payment.flutterwaveId,
                                "Flutterwave ID copied"
                              )
                            }
                            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:text-blue-600"
                          >
                            {payment.flutterwaveId || "—"}

                            {payment.flutterwaveId && (
                              <Copy size={13} />
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                              payment.status
                            )}`}
                          >
                            <StatusIcon size={13} />
                            {capitalize(payment.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                              payment.credited
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {payment.credited ? "Yes" : "No"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {formatDate(payment.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredPayments.map((payment) => {
                const StatusIcon = getStatusIcon(payment.status);

                const userName =
                  [
                    payment.user?.firstName,
                    payment.user?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Unknown user";

                return (
                  <article key={payment._id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {userName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {payment.user?.email || "No email"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                          payment.status
                        )}`}
                      >
                        <StatusIcon size={13} />
                        {capitalize(payment.status)}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Amount
                      </p>

                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {formatNaira(payment.amount)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400">
                          Reference
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              payment.txRef,
                              "Payment reference copied"
                            )
                          }
                          className="max-w-52 truncate text-right font-mono font-semibold text-slate-800"
                        >
                          {payment.txRef || "—"}
                        </button>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400">
                          Flutterwave ID
                        </span>

                        <span className="font-mono font-semibold text-slate-800">
                          {payment.flutterwaveId || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400">
                          Wallet credited
                        </span>

                        <span className="font-bold text-slate-800">
                          {payment.credited ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400">Date</span>

                        <span className="text-right font-semibold text-slate-800">
                          {formatDate(payment.createdAt)}
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
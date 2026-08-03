"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  Clock3,
  Coins,
  LoaderCircle,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Server,
  TrendingUp,
} from "lucide-react";

import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import AdminOrderCard from "@/components/admin/AdminOrderCard";
import StatusBadge from "@/components/table/StatusBadge";
import { adminPricingService } from "@/services/adminPricingService";

function toPrimitiveString(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return "";
  }

  const valueType = typeof value;

  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "bigint" ||
    valueType === "boolean"
  ) {
    const text = String(value).trim();

    return text === "[object Object]"
      ? ""
      : text;
  }

  if (valueType === "object") {
    if (seen.has(value)) {
      return "";
    }

    seen.add(value);

    for (const key of [
      "$oid",
      "_id",
      "id",
      "value",
      "code",
    ]) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        continue;
      }

      const text = toPrimitiveString(value[key], seen);

      if (text) {
        return text;
      }
    }
  }

  return "";
}

function getSaleKey(sale, index) {
  const id = toPrimitiveString(
    sale?.id ?? sale?._id
  );

  return id
    ? `sale-${id}-${index}`
    : [
        "sale",
        toPrimitiveString(sale?.server),
        toPrimitiveString(sale?.phoneNumber),
        toPrimitiveString(sale?.createdAt),
        index,
      ].join("-");
}

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

export default function AdminOverviewPage() {
  const [server, setServer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryResponse, salesResponse] = await Promise.all([
        adminPricingService.getSummary({
          server,
          dateFrom,
          dateTo,
        }),
        adminPricingService.getSales({
          server,
          dateFrom,
          dateTo,
          page: 1,
          limit: 8,
        }),
      ]);

      setSummary(summaryResponse?.summary || null);
      setSales(
        Array.isArray(salesResponse?.sales)
          ? salesResponse.sales
          : []
      );
    } catch (requestError) {
      setSummary(null);
      setSales([]);
      setError(
        requestError?.message ||
          "Unable to load admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [server, dateFrom, dateTo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Business overview
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
            Monitor ChapsSmS revenue, provider costs, profit and order activity across both SMS servers.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/pricing"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <BadgeDollarSign size={17} />
            Manage pricing
          </Link>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Server
            </label>
            <select
              value={server}
              onChange={(event) => setServer(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
            >
              <option value="">All servers</option>
              <option value="server1">Server 1 — SMSBower</option>
              <option value="server2">Server 2 — BenOTP</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setServer("");
                setDateFrom("");
                setDateTo("");
              }}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:opacity-80"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard
          label="Total revenue"
          value={formatNaira(summary?.totalRevenue)}
          description="Customer selling price collected"
          icon={CircleDollarSign}
          loading={loading}
        />
        <AdminSummaryCard
          label="Provider cost"
          value={formatNaira(summary?.totalProviderCost)}
          description="Actual cost paid to both providers"
          icon={Coins}
          loading={loading}
        />
        <AdminSummaryCard
          label="Total profit"
          value={formatNaira(summary?.totalProfit)}
          description="Revenue minus provider cost"
          icon={TrendingUp}
          loading={loading}
        />
        <AdminSummaryCard
          label="Total orders"
          value={Number(summary?.totalOrders || 0).toLocaleString()}
          description="Non-refunded purchases in this view"
          icon={ReceiptText}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminSummaryCard
          label="Received"
          value={Number(summary?.receivedOrders || 0).toLocaleString()}
          icon={PackageCheck}
          loading={loading}
        />
        <AdminSummaryCard
          label="Waiting"
          value={Number(summary?.waitingOrders || 0).toLocaleString()}
          icon={Clock3}
          loading={loading}
        />
        <AdminSummaryCard
          label="Cancelled / expired"
          value={Number(
            (summary?.cancelledOrders || 0) +
              (summary?.expiredOrders || 0)
          ).toLocaleString()}
          icon={ReceiptText}
          loading={loading}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {["server1", "server2"].map((serverKey) => {
          const serverData = summary?.[serverKey] || {};

          return (
            <section
              key={serverKey}
              className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {serverKey === "server1" ? "SMSBower" : "BenOTP"}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--foreground)]">
                    {serverKey === "server1" ? "Server 1" : "Server 2"}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Server size={21} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[var(--muted)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Orders</p>
                  <p className="mt-1 font-black text-[var(--foreground)]">
                    {loading ? "..." : Number(serverData.orders || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--muted)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Revenue</p>
                  <p className="mt-1 font-black text-[var(--foreground)]">
                    {loading ? "..." : formatNaira(serverData.revenue)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--muted)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Cost</p>
                  <p className="mt-1 font-black text-[var(--foreground)]">
                    {loading ? "..." : formatNaira(serverData.providerCost)}
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 dark:bg-green-950/30">
                  <p className="text-xs text-green-600">Profit</p>
                  <p className="mt-1 font-black text-green-600">
                    {loading ? "..." : formatNaira(serverData.profit)}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)]">
              Recent sales
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Latest orders with provider cost, selling price and profit.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm font-semibold text-[var(--muted-foreground)]">
            <LoaderCircle className="animate-spin" size={20} />
            Loading sales...
          </div>
        ) : sales.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ReceiptText className="mx-auto text-[var(--muted-foreground)]" size={30} />
            <p className="mt-4 font-black text-[var(--foreground)]">
              No sales found
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Sales will appear after customers purchase numbers.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {sales.map((sale, index) => (
                <AdminOrderCard
                  key={getSaleKey(sale, index)}
                  sale={sale}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Server</th>
                    <th className="px-4 py-4">Cost</th>
                    <th className="px-4 py-4">Sale</th>
                    <th className="px-4 py-4">Profit</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-6 py-4">Date & time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sales.map((sale, index) => (
                    <tr
                      key={getSaleKey(sale, index)}
                      className="transition hover:bg-[var(--muted)]/60"
                    >
                      <td className="px-6 py-4">
                        <p className="font-black text-[var(--foreground)]">
                          {capitalize(sale.service)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {sale.country}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--foreground)]">
                          {sale?.customer?.email || "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {sale.phoneNumber || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-bold text-[var(--foreground)]">
                        {sale.server === "server1" ? "Server 1" : "Server 2"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                        {formatNaira(sale.providerCostNgn)}
                      </td>
                      <td className="px-4 py-4 font-black text-blue-600">
                        {formatNaira(sale.sellingPrice)}
                      </td>
                      <td className="px-4 py-4 font-black text-green-600">
                        {formatNaira(sale.profit)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[var(--muted-foreground)]">
                        {formatDateTime(sale.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
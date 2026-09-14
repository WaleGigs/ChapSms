"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleDollarSign,
  CreditCard,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Server,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import { adminPricingService } from "@/services/adminPricingService";
import { socialService } from "@/services/socialService";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function formatBalance(item) {
  if (!item || item.balance === null || item.balance === undefined) return "—";
  const value = Number(item.balance);
  if (!Number.isFinite(value)) return "—";
  const currency = String(item.currency || "NGN").toUpperCase();
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function findNumberBalance(summary, server) {
  return (summary?.providerBalances || []).find((item) => item.server === server) || null;
}

function findSocialBalance(summary, provider) {
  return (summary?.providerBalances || []).find((item) => item.provider === provider) || null;
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export default function AdminOverviewPage() {
  const [numbers, setNumbers] = useState(null);
  const [socials, setSocials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [numberResult, socialResult] = await Promise.allSettled([
        adminPricingService.getSummary(),
        socialService.getAdminSummary(),
      ]);

      if (numberResult.status === "fulfilled") {
        setNumbers(numberResult.value?.summary || null);
      } else {
        throw numberResult.reason;
      }

      if (socialResult.status === "fulfilled") {
        setSocials(socialResult.value || null);
      } else {
        setSocials(null);
      }
    } catch (requestError) {
      setError(requestError?.message || "Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const numberRevenue = Number(numbers?.totalRevenue || 0);
  const numberCost = Number(numbers?.totalCost ?? numbers?.totalProviderCost ?? 0);
  const numberProfit = Number(numbers?.totalProfit || 0);
  const socialRevenue = Number(socials?.totalRevenue || 0);
  const socialCost = Number(socials?.totalCost || 0);
  const socialProfit = Number(socials?.totalProfit || 0);

  const smsBower = findNumberBalance(numbers, "server1");
  const benOtp = findNumberBalance(numbers, "server2");
  const loggsplug = findSocialBalance(socials, "loggsplug");
  const sameeha = findSocialBalance(socials, "sameeha");

  return (
    <div className="space-y-7">
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-500">
          {error}
        </div>
      ) : null}

      <Section title="Overview · Numbers + Socials">
        <AdminSummaryCard
          label="Total revenue"
          value={formatNaira(numberRevenue + socialRevenue)}
          icon={CircleDollarSign}
          loading={loading}
        />
        <AdminSummaryCard
          label="Total profit"
          value={formatNaira(numberProfit + socialProfit)}
          icon={TrendingUp}
          loading={loading}
        />
        <AdminSummaryCard
          label="Total cost"
          value={formatNaira(numberCost + socialCost)}
          icon={CreditCard}
          loading={loading}
        />
        <AdminSummaryCard
          label="Total orders"
          value={formatCount(Number(numbers?.totalOrders || 0) + Number(socials?.totalOrders || 0))}
          icon={ReceiptText}
          loading={loading}
        />
      </Section>

      <Section title="Numbers">
        <AdminSummaryCard label="Numbers revenue" value={formatNaira(numberRevenue)} icon={CircleDollarSign} loading={loading} />
        <AdminSummaryCard label="Numbers profit" value={formatNaira(numberProfit)} icon={TrendingUp} loading={loading} />
        <AdminSummaryCard label="Numbers cost" value={formatNaira(numberCost)} icon={CreditCard} loading={loading} />
        <AdminSummaryCard label="Number orders" value={formatCount(numbers?.totalOrders)} icon={ReceiptText} loading={loading} />
        <AdminSummaryCard label="Received OTP" value={formatCount(numbers?.receivedOtps ?? numbers?.receivedOrders)} icon={MessageSquareText} loading={loading} />
      </Section>

      <Section title="Socials">
        <AdminSummaryCard label="Socials revenue" value={formatNaira(socialRevenue)} icon={CircleDollarSign} loading={loading} />
        <AdminSummaryCard label="Socials profit" value={formatNaira(socialProfit)} icon={TrendingUp} loading={loading} />
        <AdminSummaryCard label="Socials cost" value={formatNaira(socialCost)} icon={CreditCard} loading={loading} />
        <AdminSummaryCard label="Social orders" value={formatCount(socials?.totalOrders)} icon={PackageCheck} loading={loading} />
      </Section>

      <Section title="Platform">
        <AdminSummaryCard label="Users" value={formatCount(numbers?.totalUsers)} icon={Users} loading={loading} />
        <AdminSummaryCard label="Users' balance" value={formatNaira(numbers?.usersBalance)} icon={WalletCards} loading={loading} />
        <AdminSummaryCard label="SMSBower Balance" value={formatBalance(smsBower)} icon={Server} loading={loading} />
        <AdminSummaryCard label="BenOTP Balance" value={formatBalance(benOtp)} icon={Server} loading={loading} />
        <AdminSummaryCard label="LoggsPlug Balance" value={formatBalance(loggsplug)} icon={Server} loading={loading} />
        <AdminSummaryCard label="SameehaSocialHub Balance" value={formatBalance(sameeha)} icon={Server} loading={loading} />
      </Section>
    </div>
  );
}

"use client";

import {
  CircleDollarSign,
  CreditCard,
  MessageSquareText,
  ReceiptText,
  Server,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import { useAdminSummary } from "@/hooks/useAdminPricing";

function formatNaira(value) {
  return `₦${Number(
    value || 0
  ).toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatCount(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-NG"
  );
}

function getProviderBalance(
  summary,
  server
) {
  const balances =
    Array.isArray(
      summary?.providerBalances
    )
      ? summary.providerBalances
      : [];

  return (
    balances.find(
      (item) =>
        item?.server === server
    ) || null
  );
}

function formatProviderBalance(
  provider
) {
  if (
    !provider ||
    provider.balance === null ||
    provider.balance === undefined
  ) {
    return "—";
  }

  const value =
    Number(
      provider.balance
    );

  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const currency =
    String(
      provider.currency || ""
    )
      .trim()
      .toUpperCase();

  if (currency === "USD") {
    return `$${value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  if (currency === "NGN") {
    return `₦${value.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return `${currency || ""} ${value.toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 2,
    }
  )}`.trim();
}

export default function AdminOverviewPage() {
  const {
    summary,
    loading,
    error,
  } = useAdminSummary();

  const smsBower =
    getProviderBalance(
      summary,
      "server1"
    );

  const benOtp =
    getProviderBalance(
      summary,
      "server2"
    );

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AdminSummaryCard
          label="Total revenue"
          value={formatNaira(
            summary?.totalRevenue
          )}
          description="Customer selling price collected"
          icon={
            CircleDollarSign
          }
          loading={loading}
        />

        <AdminSummaryCard
          label="Total cost"
          value={formatNaira(
            summary?.totalCost ??
              summary?.totalProviderCost
          )}
          description="Actual provider cost"
          icon={CreditCard}
          loading={loading}
        />

        <AdminSummaryCard
          label="Total profit"
          value={formatNaira(
            summary?.totalProfit
          )}
          description="Revenue minus provider cost"
          icon={TrendingUp}
          loading={loading}
        />

        <AdminSummaryCard
          label="Total orders"
          value={formatCount(
            summary?.totalOrders
          )}
          description="All number order attempts"
          icon={ReceiptText}
          loading={loading}
        />

        <AdminSummaryCard
          label="Received OTP"
          value={formatCount(
            summary?.receivedOtps ??
              summary?.receivedOrders
          )}
          description={
            summary?.totalOrders
              ? `${Number(
                  summary?.otpSuccessRate ||
                    0
                ).toFixed(
                  2
                )}% success rate`
              : "Successful OTP orders"
          }
          icon={
            MessageSquareText
          }
          loading={loading}
        />

        <AdminSummaryCard
          label="Users"
          value={formatCount(
            summary?.totalUsers
          )}
          icon={Users}
          loading={loading}
        />

        <AdminSummaryCard
          label="Users' balance"
          value={formatNaira(
            summary?.usersBalance
          )}
          icon={WalletCards}
          loading={loading}
        />

        <AdminSummaryCard
          label="SMSBower balance"
          value={
            formatProviderBalance(
              smsBower
            )
          }
          description={
            smsBower?.healthy
              ? "Live provider balance"
              : smsBower?.message ||
                "Balance unavailable"
          }
          icon={Server}
          loading={loading}
        />

        <AdminSummaryCard
          label="BenOTP balance"
          value={
            formatProviderBalance(
              benOtp
            )
          }
          description={
            benOtp?.healthy
              ? "Live provider balance"
              : benOtp?.message ||
                "Balance unavailable"
          }
          icon={Server}
          loading={loading}
        />
      </div>
    </div>
  );
}
"use client";

import {
  CircleDollarSign,
  CreditCard,
  MessageSquareText,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import { useAdminSummary } from "@/hooks/useAdminPricing";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

export default function AdminOverviewPage() {
  const {
    summary,
    loading,
    error,
  } = useAdminSummary();

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
          icon={CircleDollarSign}
          loading={loading}
        />

        <AdminSummaryCard
          label="Total profit"
          value={formatNaira(
            summary?.totalProfit
          )}
          icon={TrendingUp}
          loading={loading}
        />

        <AdminSummaryCard
          label="Total cost"
          value={formatNaira(
            summary?.totalCost ??
              summary?.totalProviderCost
          )}
          icon={CreditCard}
          loading={loading}
        />

        <AdminSummaryCard
          label="Total orders"
          value={formatCount(
            summary?.totalOrders
          )}
          icon={ReceiptText}
          loading={loading}
        />

        <AdminSummaryCard
          label="Received OTPs"
          value={formatCount(
            summary?.receivedOtps ??
              summary?.receivedOrders
          )}
          icon={MessageSquareText}
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
      </div>
    </div>
  );
}
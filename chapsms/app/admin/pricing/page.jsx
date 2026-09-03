"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, LoaderCircle, Save } from "lucide-react";
import toast from "react-hot-toast";

import PricingRuleForm from "@/components/admin/PricingRuleForm";
import PricingRulesTable from "@/components/admin/PricingRulesTable";
import { useAdminPricingRules } from "@/hooks/useAdminPricing";
import { adminPricingService } from "@/services/adminPricingService";

export default function AdminPricingPage() {
  const [serverFilter, setServerFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingRule, setEditingRule] = useState(null);
  const [exchangeRate, setExchangeRate] = useState("1600");
  const [exchangeRateLoading, setExchangeRateLoading] = useState(true);
  const [exchangeRateSaving, setExchangeRateSaving] = useState(false);

  const {
    rules,
    pagination,
    loading,
    error,
    reload,
  } = useAdminPricingRules({
    server: serverFilter,
    isActive: activeFilter,
    page,
    limit: 25,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadExchangeRate() {
      try {
        setExchangeRateLoading(true);
        const response = await adminPricingService.getExchangeRate();
        const rate = Number(response?.exchangeRate?.rate);

        if (!cancelled && Number.isFinite(rate) && rate > 0) {
          setExchangeRate(String(rate));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || "Unable to load USD to NGN rate");
        }
      } finally {
        if (!cancelled) {
          setExchangeRateLoading(false);
        }
      }
    }

    loadExchangeRate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [serverFilter, activeFilter]);

  async function handleSaveExchangeRate(event) {
    event.preventDefault();

    const rate = Number(exchangeRate);

    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Enter a valid USD to NGN rate");
      return;
    }

    try {
      setExchangeRateSaving(true);
      const response = await adminPricingService.updateExchangeRate(rate);
      const savedRate = Number(response?.exchangeRate?.rate);

      if (Number.isFinite(savedRate) && savedRate > 0) {
        setExchangeRate(String(savedRate));
      }

      toast.success(response?.message || "Exchange rate saved");
    } catch (error) {
      toast.error(error?.message || "Unable to save exchange rate");
    } finally {
      setExchangeRateSaving(false);
    }
  }

  function handleSaved() {
    setEditingRule(null);
    reload();
  }

  function handleEdit(rule) {
    setEditingRule(rule);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          Server pricing
        </p>
        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <BadgeDollarSign size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
              Pricing Management
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              Set the price customers pay on ChapsSmS. Every preview shows the provider’s current cost, your selling price and expected profit.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Currency rate
            </p>
            <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">
              USD → NGN
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              This rate converts USD provider costs to naira for new quotes and new orders. Existing orders keep the cost and profit that were saved when they were created.
            </p>
          </div>

          <form onSubmit={handleSaveExchangeRate}>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Rate (₦ per $1)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={exchangeRate}
                onChange={(event) => setExchangeRate(event.target.value)}
                disabled={exchangeRateLoading || exchangeRateSaving}
                className="h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-base font-bold text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                aria-label="USD to NGN exchange rate"
              />
              <button
                type="submit"
                disabled={exchangeRateLoading || exchangeRateSaving}
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exchangeRateLoading || exchangeRateSaving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {exchangeRateSaving ? "Saving..." : "Save rate"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <PricingRuleForm
        editingRule={editingRule}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingRule(null)}
      />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Filter by server
            </label>
            <select
              value={serverFilter}
              onChange={(event) => setServerFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
            >
              <option value="">All servers</option>
              <option value="server1">Server 1 — SMSBower</option>
              <option value="server2">Server 2 — BenOTP</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Rule status
            </label>
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
            >
              <option value="">All rules</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </section>

      <PricingRulesTable
        rules={rules}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onReload={reload}
      />

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--foreground)] disabled:opacity-40"
          >
            Previous
          </button>

          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Page {pagination.page} of {pagination.pages}
          </p>

          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(pagination.pages, current + 1)
              )
            }
            disabled={page >= pagination.pages || loading}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--foreground)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
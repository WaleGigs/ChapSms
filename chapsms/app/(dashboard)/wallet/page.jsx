"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CreditCard,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { api } from "@/lib/api";

const presetAmounts = [1000, 2500, 5000, 10000, 25000, 50000];

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WalletPage() {
  const { wallet } = useWallet();

  const [amount, setAmount] = useState(5000);
  const [funding, setFunding] = useState(false);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);

  async function handleFundWallet(event) {
    event.preventDefault();

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      toast.error("Minimum funding amount is ₦100");
      return;
    }

    try {
      setFunding(true);

      const response = await api("/payment/initialize", {
        method: "POST",
        body: JSON.stringify({
          amount: numericAmount,
        }),
      });

      if (!response.paymentLink) {
        throw new Error("Payment link was not returned");
      }

      window.location.href = response.paymentLink;
    } catch (error) {
      console.error("Flutterwave initialization failed:", error);
      toast.error(error.message || "Unable to start payment");
      setFunding(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-7">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          Add <span className="text-blue-600">Funds</span>
        </h1>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Top up your ChapsSmS wallet securely with Flutterwave.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Wallet size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Choose an amount
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a preset amount or enter a custom value.
              </p>
            </div>
          </div>

          <form onSubmit={handleFundWallet} className="mt-7">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {presetAmounts.map((value) => {
                const selected = numericAmount === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`h-12 rounded-xl border text-sm font-bold transition ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {formatNaira(value)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Or enter a custom amount
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                  ₦
                </span>

                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="100"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xl font-black text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={funding}
              className="mt-6 h-12 w-full"
            >
              <CreditCard size={18} />

              {funding
                ? "Opening checkout..."
                : `Pay ${formatNaira(numericAmount)}`}
            </Button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              You will be redirected to Flutterwave to complete your payment.
            </p>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Current balance
            </p>

            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              {formatNaira(wallet?.balance)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Zap size={18} />
                </div>

                <div>
                  <p className="font-bold text-slate-950">
                    Instant credit
                  </p>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Your wallet is credited after successful verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CreditCard size={18} />
                </div>

                <div>
                  <p className="font-bold text-slate-950">
                    Multiple payment methods
                  </p>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Complete payment using the options available at checkout.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <p className="font-bold text-slate-950">
                    Secure verification
                  </p>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Payments are verified by the backend before wallet credit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
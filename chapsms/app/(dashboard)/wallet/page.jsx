"use client";

import { useMemo, useState } from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import {
  Building2,
  CreditCard,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { paymentService } from "@/services/paymentService";

const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WalletPage() {
  const {
    wallet,
    refreshWallet,
    updateWalletBalance,
  } = useWallet();

  const [amount, setAmount] = useState(5000);
  const [gateway, setGateway] = useState("flutterwave");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [scriptReady, setScriptReady] = useState(false);
  const [funding, setFunding] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);

  async function handleFundWallet(event) {
    event.preventDefault();

    if (gateway !== "flutterwave") {
      toast("NeuraPay needs its official production API configuration before it can be enabled.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      toast.error("Minimum funding amount is ₦100");
      return;
    }

    if (!scriptReady || typeof window.FlutterwaveCheckout !== "function") {
      toast.error("Payment checkout is still loading. Try again in a moment.");
      return;
    }

    try {
      setFunding(true);

      const checkout = await paymentService.initializePayment({
        amount: numericAmount,
        paymentMethod,
      });

      if (!checkout?.txRef || !checkout?.publicKey) {
        throw new Error("The server did not return valid checkout details");
      }

      let verificationStarted = false;
      let modal;

      modal = window.FlutterwaveCheckout({
        public_key: checkout.publicKey,
        tx_ref: checkout.txRef,
        amount: checkout.amount,
        currency: checkout.currency || "NGN",
        payment_options: checkout.paymentOptions,
        customer: checkout.customer,
        meta: checkout.meta,
        customizations: {
          title: "ChapsSmS Wallet Funding",
          description: `Fund your wallet with ${formatNaira(checkout.amount)}`,
        },
        configurations: {
          session_duration: 10,
          max_retry_attempt: 5,
        },
        bank_transfer_options: {
          expires: 3600,
        },
        callback: async (payment) => {
          verificationStarted = true;
          setVerifying(true);

          try {
            const result = await paymentService.verifyPayment({
              transactionId:
                payment?.transaction_id || payment?.id,
              txRef: checkout.txRef,
            });

            if (result?.walletBalance !== undefined) {
              updateWalletBalance(Number(result.walletBalance));
            }

            await refreshWallet();
            toast.success(result?.message || "Wallet funded successfully");
            modal?.close();
          } catch (error) {
            console.error("Payment verification failed:", error);
            toast.error(error?.message || "Payment could not be verified");
          } finally {
            setVerifying(false);
            setFunding(false);
          }
        },
        onclose: () => {
          if (!verificationStarted) {
            setFunding(false);
            toast("Payment checkout closed");
          }
        },
      });
    } catch (error) {
      console.error("Flutterwave initialization failed:", error);
      toast.error(error?.message || "Unable to start payment");
      setFunding(false);
    }
  }

  const busy = funding || verifying;

  return (
    <>
      <Script
        src="https://checkout.flutterwave.com/v3.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setScriptReady(false);
          toast.error("Unable to load Flutterwave checkout");
        }}
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7">
          <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
            Add <span className="text-blue-600">Funds</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
            Select an amount, gateway and payment method without leaving this page.
          </p>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Amount to add
            </p>
            <p className="mt-5 text-5xl font-black tracking-tight text-[var(--foreground)]">
              {numericAmount > 0 ? formatNaira(numericAmount) : "₦"}
            </p>
          </div>

          <form onSubmit={handleFundWallet} className="mt-8">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {presetAmounts.map((value) => {
                const selected = numericAmount === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`min-h-12 rounded-2xl border px-2 text-xs font-black transition sm:text-sm ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-blue-400"
                    }`}
                  >
                    ₦{value.toLocaleString("en-NG")}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                Custom amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-[var(--muted-foreground)]">
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
                  className="h-16 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-2xl font-black text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--muted-foreground)] sm:text-xs">
              Pay with any option below
            </p>

            <div className="mt-4 grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1.5">
              <button
                type="button"
                onClick={() => setGateway("flutterwave")}
                className={`min-h-12 rounded-xl text-sm font-black transition ${
                  gateway === "flutterwave"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                Flutterwave
              </button>
              <button
                type="button"
                onClick={() => {
                  setGateway("neurapay");
                  toast("NeuraPay setup is waiting for the official merchant API details.");
                }}
                className={`relative min-h-12 rounded-xl text-sm font-black transition ${
                  gateway === "neurapay"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                NeuraPay
                <span className="absolute right-2 top-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  Setup
                </span>
              </button>
            </div>

            {gateway === "neurapay" && (
              <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200">
                NeuraPay is shown here instead of Paystack, but payments are intentionally disabled until the exact official NeuraPay merchant API, verification endpoint and webhook-signature rules are confirmed. This prevents unverified payment code from crediting production wallets.
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("bank")}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                  paymentMethod === "bank"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Landmark size={18} />
                Bank
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                  paymentMethod === "card"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <CreditCard size={18} />
                Card
              </button>
            </div>

            <Button
              type="submit"
              disabled={busy || gateway !== "flutterwave" || !scriptReady}
              className="mt-7 h-14 w-full"
            >
              {busy ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <Wallet size={19} />
              )}
              {verifying
                ? "Verifying payment..."
                : funding
                  ? "Opening secure checkout..."
                  : `Proceed to pay ${formatNaira(numericAmount)}`}
            </Button>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
              <ShieldCheck size={15} />
              Secured and verified by the backend
            </p>
          </form>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Instant credit",
              text: "Your wallet updates after verified payment.",
            },
            {
              icon: Building2,
              title: "Bank or card",
              text: "Choose a method before opening checkout.",
            },
            {
              icon: ShieldCheck,
              title: "Server verified",
              text: "The secret key never enters the browser.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                  <Icon size={18} />
                </div>
                <p className="mt-4 font-black text-[var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Current wallet balance
          </p>
          <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
            {formatNaira(wallet?.balance)}
          </p>
        </div>
      </div>
    </>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import {
  Building2,
  Copy,
  CreditCard,
  Landmark,
  LoaderCircle,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { paymentService } from "@/services/paymentService";
import { neurapayService } from "@/services/neurapayService";

const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function copyText(value) {
  const text = String(value || "");
  if (!text) throw new Error("Nothing to copy");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function AccountValue({ label, value, copyable = false, onCopy }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-3">
        <p className="min-w-0 flex-1 break-words text-base font-black text-[var(--foreground)] sm:text-lg">
          {value || "—"}
        </p>

        {copyable && value ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:border-blue-500"
            aria-label={`Copy ${label}`}
          >
            <Copy size={17} />
          </button>
        ) : null}
      </div>
    </div>
  );
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

  // Flutterwave state
  const [scriptReady, setScriptReady] = useState(false);
  const [funding, setFunding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const flutterwaveModalRef = useRef(null);

  // NeuraPay state
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [neurapayReference, setNeurapayReference] = useState("");
  const [manualVerifying, setManualVerifying] = useState(false);
  const [neurapayLoaded, setNeurapayLoaded] = useState(false);
  const [neurapayFundingActive, setNeurapayFundingActive] = useState(true);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);
  const flutterwaveBusy = funding || verifying;

  const loadNeuraPayAccount = useCallback(async () => {
    try {
      setAccountLoading(true);
      const existing = await neurapayService.getAccount({
        providerChannel: "Paga",
      });
      setAccount(existing);
      return existing;
    } catch (error) {
      console.error("NeuraPay account loading failed:", error);
      return null;
    } finally {
      setAccountLoading(false);
      setNeurapayLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (gateway === "neurapay" && !neurapayLoaded) {
      loadNeuraPayAccount();
    }
  }, [gateway, neurapayLoaded, loadNeuraPayAccount]);

  useEffect(() => {
    if (gateway !== "neurapay" || !account || !neurapayFundingActive) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshWallet().catch(() => {});
      }
    }, 12000);

    return () => window.clearInterval(interval);
  }, [gateway, account, neurapayFundingActive, refreshWallet]);

  async function handleFlutterwavePayment(event) {
    event.preventDefault();

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      toast.error("Minimum funding amount is ₦100");
      return;
    }

    if (!scriptReady || typeof window.FlutterwaveCheckout !== "function") {
      toast.error("Flutterwave checkout is still loading. Try again in a moment.");
      return;
    }

    try {
      setFunding(true);

      const checkout = await paymentService.initializePayment({
        amount: numericAmount,
        paymentMethod,
      });

      if (!checkout?.txRef || !checkout?.publicKey) {
        throw new Error("The server did not return valid Flutterwave checkout details");
      }

      let verificationStarted = false;

      const modal = window.FlutterwaveCheckout({
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
              transactionId: payment?.transaction_id || payment?.id,
              txRef: checkout.txRef,
            });

            if (result?.walletBalance !== undefined) {
              updateWalletBalance(Number(result.walletBalance));
            }

            await refreshWallet();
            toast.success(result?.message || "Wallet funded successfully");
            modal?.close?.();
          } catch (error) {
            console.error("Flutterwave payment verification failed:", error);
            toast.error(error?.message || "Payment could not be verified");
          } finally {
            flutterwaveModalRef.current = null;
            setVerifying(false);
            setFunding(false);
          }
        },
        onclose: () => {
          flutterwaveModalRef.current = null;
          if (!verificationStarted) {
            setFunding(false);
            toast("Flutterwave payment cancelled");
          }
        },
      });

      flutterwaveModalRef.current = modal;
    } catch (error) {
      console.error("Flutterwave initialization failed:", error);
      toast.error(error?.message || "Unable to start Flutterwave payment");
      setFunding(false);
    }
  }

  async function handleCreateNeuraPayAccount() {
    if (creatingAccount) return;

    try {
      setCreatingAccount(true);
      const response = await neurapayService.createAccount({
        providerChannel: "Paga",
      });

      const nextAccount = response?.account || null;
      if (!nextAccount) {
        throw new Error("ChapsSms did not receive the NeuraPay account details");
      }

      setAccount(nextAccount);
      setNeurapayFundingActive(true);
      toast.success(response?.message || "NeuraPay funding account ready");
    } catch (error) {
      console.error("NeuraPay account creation failed:", error);
      toast.error(error?.message || "Unable to create your NeuraPay funding account");
    } finally {
      setCreatingAccount(false);
    }
  }

  async function handleCopy(value) {
    try {
      await copyText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function handleCheckNeuraPayPayment() {
    if (checkingBalance) return;

    try {
      setCheckingBalance(true);
      await refreshWallet();
      toast(
        "Wallet refreshed. If a successful NeuraPay transfer is still missing, use the payment reference verification below."
      );
    } catch (error) {
      toast.error(error?.message || "Unable to refresh wallet");
    } finally {
      setCheckingBalance(false);
    }
  }

  async function handleManualNeuraPayVerification(event) {
    event.preventDefault();

    const reference = String(neurapayReference || "").trim();

    if (!reference) {
      toast.error("Enter the NeuraPay transaction reference, for example TXN-...");
      return;
    }

    if (manualVerifying) return;

    try {
      setManualVerifying(true);

      const result = await neurapayService.verifyTransaction(reference);

      if (result?.walletBalance !== undefined) {
        updateWalletBalance(Number(result.walletBalance));
      }

      await refreshWallet();

      toast.success(
        result?.alreadyCredited
          ? "This payment was already credited"
          : `Payment verified. ${formatNaira(result?.creditedAmount || 0)} added to your wallet.`
      );

      setNeurapayReference("");
    } catch (error) {
      console.error("Manual NeuraPay verification failed:", error);
      toast.error(error?.message || "Unable to verify this NeuraPay payment");
    } finally {
      setManualVerifying(false);
    }
  }

  function handleCancelNeuraPayFunding() {
    /*
     * There is no NeuraPay transaction to cancel at this point.
     * The displayed account is a reusable reserved account.
     * This button cancels only the current ChapsSms funding session/UI.
     * If the customer already sent a bank transfer, it cannot reverse it.
     */
    setNeurapayFundingActive(false);
    toast("Funding session cancelled. No money was moved by ChapsSms.");
  }

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
            Choose Flutterwave or NeuraPay to fund your ChapsSms wallet securely.
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

          <div className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-3">
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
            <label htmlFor="amount" className="mb-2 block text-sm font-bold text-[var(--foreground)]">
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
            Choose payment gateway
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
                setNeurapayFundingActive(true);
              }}
              className={`min-h-12 rounded-xl text-sm font-black transition ${
                gateway === "neurapay"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              NeuraPay
            </button>
          </div>

          {gateway === "flutterwave" ? (
            <form onSubmit={handleFlutterwavePayment} className="mt-6">
              <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4">
                <p className="font-black text-[var(--foreground)]">Flutterwave secure checkout</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Pay {formatNaira(numericAmount)} by bank transfer or card inside Flutterwave checkout.
                </p>
              </div>

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
                disabled={flutterwaveBusy || !scriptReady}
                className="mt-7 h-14 w-full"
              >
                {flutterwaveBusy ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : (
                  <Wallet size={19} />
                )}

                {verifying
                  ? "Verifying payment..."
                  : funding
                    ? "Opening Flutterwave..."
                    : `Pay ${formatNaira(numericAmount)} with Flutterwave`}
              </Button>

              <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
                Use Flutterwave&apos;s close (×) control to cancel before completing payment.
              </p>
            </form>
          ) : (
            <div className="mt-6">
              {!neurapayFundingActive ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5 text-center">
                  <XCircle size={30} className="mx-auto text-[var(--muted-foreground)]" />
                  <p className="mt-3 font-black text-[var(--foreground)]">NeuraPay funding cancelled</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Your reserved account is still available. No ChapsSms wallet transaction was created.
                  </p>
                  <Button
                    type="button"
                    className="mt-5 h-12 w-full"
                    onClick={() => setNeurapayFundingActive(true)}
                  >
                    <Landmark size={18} />
                    Start NeuraPay funding again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Landmark size={19} />
                      </div>
                      <div>
                        <p className="font-black text-[var(--foreground)]">NeuraPay bank transfer</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                          Transfer <strong className="text-[var(--foreground)]">{formatNaira(numericAmount)}</strong> to the reserved account below. Your verified transfer amount is what gets credited.
                        </p>
                      </div>
                    </div>
                  </div>

                  {accountLoading ? (
                    <div className="mt-6 flex min-h-44 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]">
                      <div className="text-center">
                        <LoaderCircle size={28} className="mx-auto animate-spin text-blue-600" />
                        <p className="mt-3 text-sm font-semibold text-[var(--muted-foreground)]">
                          Loading your NeuraPay account...
                        </p>
                      </div>
                    </div>
                  ) : account ? (
                    <div className="mt-6">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-[var(--foreground)]">Your funding account</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Powered by NeuraPay • {account.bankName || "Paga"}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-300">
                          {String(account.status || "active").toUpperCase()}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <AccountValue label="Bank" value={account.bankName} />
                        <AccountValue
                          label="Account number"
                          value={account.accountNumber}
                          copyable
                          onCopy={() => handleCopy(account.accountNumber)}
                        />
                        <div className="sm:col-span-2">
                          <AccountValue
                            label="Account name"
                            value={account.accountName}
                            copyable
                            onCopy={() => handleCopy(account.accountName)}
                          />
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-300">
                        Cancel funding only closes this ChapsSms funding session. It cannot reverse a bank transfer you have already sent. If you already transferred money, allow NeuraPay to verify it so your wallet can be credited.
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Button
                          type="button"
                          className="h-14 w-full"
                          onClick={handleCheckNeuraPayPayment}
                          disabled={checkingBalance}
                        >
                          {checkingBalance ? (
                            <LoaderCircle size={19} className="animate-spin" />
                          ) : (
                            <RefreshCw size={19} />
                          )}
                          {checkingBalance ? "Refreshing wallet..." : "Refresh wallet"}
                        </Button>

                        <button
                          type="button"
                          onClick={handleCancelNeuraPayFunding}
                          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-4 text-sm font-black text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                        >
                          <XCircle size={19} />
                          Cancel funding
                        </button>
                      </div>

                      <form
                        onSubmit={handleManualNeuraPayVerification}
                        className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"
                      >
                        <p className="font-black text-[var(--foreground)]">
                          Payment successful but wallet still not credited?
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)] sm:text-sm">
                          Paste the NeuraPay transaction reference from the successful transaction (usually starts with TXN-). ChapsSms will verify it directly with NeuraPay before crediting your wallet.
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <input
                            type="text"
                            value={neurapayReference}
                            onChange={(event) => setNeurapayReference(event.target.value)}
                            placeholder="TXN-..."
                            autoCapitalize="characters"
                            className="h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-bold text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                          />

                          <Button
                            type="submit"
                            className="h-12 sm:min-w-44"
                            disabled={manualVerifying || !String(neurapayReference || "").trim()}
                          >
                            {manualVerifying ? (
                              <LoaderCircle size={18} className="animate-spin" />
                            ) : (
                              <SearchCheck size={18} />
                            )}
                            {manualVerifying ? "Verifying..." : "Verify payment"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5 text-center">
                      <Building2 size={30} className="mx-auto text-blue-600" />
                      <p className="mt-3 font-black text-[var(--foreground)]">Create your personal funding account</p>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                        ChapsSms uses NeuraPay&apos;s Paga channel by default, so this normal funding flow does not ask you to submit BVN or NIN to ChapsSms.
                      </p>

                      <Button
                        type="button"
                        className="mt-5 h-14 w-full"
                        onClick={handleCreateNeuraPayAccount}
                        disabled={creatingAccount}
                      >
                        {creatingAccount ? (
                          <LoaderCircle size={19} className="animate-spin" />
                        ) : (
                          <Landmark size={19} />
                        )}
                        {creatingAccount ? "Creating secure account..." : "Generate NeuraPay account"}
                      </Button>

                      <button
                        type="button"
                        onClick={handleCancelNeuraPayFunding}
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-transparent px-4 text-sm font-black text-red-600 transition hover:bg-red-500/5 dark:text-red-300"
                      >
                        <XCircle size={18} />
                        Cancel funding
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
            <ShieldCheck size={15} />
            Both gateways are verified by the ChapsSms backend before wallet credit.
          </p>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Automatic credit",
              text: "Verified Flutterwave or NeuraPay payments update your wallet.",
            },
            {
              icon: Building2,
              title: "Two gateways",
              text: "Use Flutterwave card/bank checkout or your NeuraPay reserved account.",
            },
            {
              icon: ShieldCheck,
              title: "Server verified",
              text: "The browser never decides whether a payment should credit your wallet.",
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
                <p className="mt-4 font-black text-[var(--foreground)]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{item.text}</p>
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

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  CreditCard,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  TimerReset,
  Wallet,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { paymentService } from "@/services/paymentService";

const presetAmounts = [
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
];

function formatNaira(value) {
  return `₦${Number(
    value || 0,
  ).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getRemainingSeconds(expiresAt) {
  if (!expiresAt) {
    return 0;
  }

  const expiry =
    new Date(
      expiresAt,
    ).getTime();

  if (
    Number.isNaN(
      expiry,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      (expiry - Date.now()) /
        1000,
    ),
  );
}

function formatTimer(seconds) {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0,
    );

  const minutes =
    Math.floor(
      safe / 60,
    );

  const remainder =
    safe % 60;

  return `${String(
    minutes,
  ).padStart(
    2,
    "0",
  )}:${String(
    remainder,
  ).padStart(
    2,
    "0",
  )}`;
}

export default function WalletPage() {
  const {
    wallet,
    refreshWallet,
    updateWalletBalance,
  } = useWallet();

  const [
    amount,
    setAmount,
  ] = useState(
    5000,
  );

  const [
    gateway,
    setGateway,
  ] = useState(
    "flutterwave",
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    "bank",
  );

  const [
    scriptReady,
    setScriptReady,
  ] = useState(
    false,
  );

  const [
    funding,
    setFunding,
  ] = useState(
    false,
  );

  const [
    verifying,
    setVerifying,
  ] = useState(
    false,
  );

  const [
    bankTransfer,
    setBankTransfer,
  ] = useState(
    null,
  );

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState(
    "idle",
  );

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(
    0,
  );

  const numericAmount =
    useMemo(
      () =>
        Number(
          amount,
        ) || 0,
      [
        amount,
      ],
    );

  useEffect(
    () => {
      if (
        !bankTransfer
          ?.expiresAt ||
        paymentStatus !==
          "pending"
      ) {
        return undefined;
      }

      const updateTimer =
        () => {
          const remaining =
            getRemainingSeconds(
              bankTransfer
                .expiresAt,
            );

          setRemainingSeconds(
            remaining,
          );

          if (
            remaining <= 0
          ) {
            setPaymentStatus(
              "expired",
            );
          }
        };

      updateTimer();

      const timer =
        window.setInterval(
          updateTimer,
          1000,
        );

      return () =>
        window.clearInterval(
          timer,
        );
    },
    [
      bankTransfer
        ?.expiresAt,
      paymentStatus,
    ],
  );

  useEffect(
    () => {
      if (
        !bankTransfer
          ?.txRef ||
        paymentStatus !==
          "pending"
      ) {
        return undefined;
      }

      let cancelled =
        false;

      const checkStatus =
        async () => {
          try {
            const result =
              await paymentService.getBankTransferStatus(
                {
                  txRef:
                    bankTransfer
                      .txRef,
                },
              );

            if (cancelled) {
              return;
            }

            const nextStatus =
              result
                ?.paymentStatus ||
              "pending";

            setPaymentStatus(
              nextStatus,
            );

            if (
              result
                ?.bankTransfer
            ) {
              setBankTransfer(
                (current) => ({
                  ...current,
                  ...result.bankTransfer,
                }),
              );
            }

            if (
              nextStatus ===
              "successful"
            ) {
              if (
                result
                  ?.walletBalance !==
                undefined
              ) {
                updateWalletBalance(
                  Number(
                    result.walletBalance,
                  ),
                );
              }

              await refreshWallet();

              toast.success(
                result?.message ||
                  "Wallet funded successfully",
              );
            }

            if (
              nextStatus ===
              "expired"
            ) {
              toast.error(
                "This transfer account has expired",
              );
            }
          } catch (error) {
            console.error(
              "Bank transfer status check failed:",
              error,
            );
          }
        };

      checkStatus();

      const interval =
        window.setInterval(
          checkStatus,
          8000,
        );

      return () => {
        cancelled = true;

        window.clearInterval(
          interval,
        );
      };
    },
    [
      bankTransfer
        ?.txRef,
      paymentStatus,
      refreshWallet,
      updateWalletBalance,
    ],
  );

  async function copyValue(
    value,
    label,
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          String(
            value || "",
          ),
        );

      toast.success(
        `${label} copied`,
      );
    } catch {
      toast.error(
        `Unable to copy ${label.toLowerCase()}`,
      );
    }
  }

  async function startBankTransfer() {
    try {
      setFunding(
        true,
      );

      const result =
        await paymentService.createBankTransfer(
          {
            amount:
              numericAmount,
          },
        );

      if (
        !result
          ?.bankTransfer
          ?.accountNumber ||
        !result
          ?.bankTransfer
          ?.bankName
      ) {
        throw new Error(
          "The server did not return bank transfer details",
        );
      }

      setBankTransfer(
        result.bankTransfer,
      );

      setRemainingSeconds(
        getRemainingSeconds(
          result.bankTransfer
            .expiresAt,
        ),
      );

      setPaymentStatus(
        "pending",
      );
    } catch (error) {
      console.error(
        "Bank transfer initialization failed:",
        error,
      );

      toast.error(
        error?.message ||
          "Unable to generate bank account",
      );
    } finally {
      setFunding(
        false,
      );
    }
  }

  async function startCardPayment() {
    if (
      !scriptReady ||
      typeof window
        .FlutterwaveCheckout !==
        "function"
    ) {
      toast.error(
        "Secure card checkout is still loading. Try again in a moment.",
      );
      return;
    }

    try {
      setFunding(
        true,
      );

      const checkout =
        await paymentService.initializePayment(
          {
            amount:
              numericAmount,
            paymentMethod:
              "card",
          },
        );

      if (
        !checkout?.txRef ||
        !checkout
          ?.publicKey
      ) {
        throw new Error(
          "The server did not return valid card checkout details",
        );
      }

      let verificationStarted =
        false;

      let modal;

      modal =
        window.FlutterwaveCheckout(
          {
            public_key:
              checkout.publicKey,
            tx_ref:
              checkout.txRef,
            amount:
              checkout.amount,
            currency:
              checkout.currency ||
              "NGN",

            /*
             * Card only. No bank-transfer option is exposed in this overlay.
             * Bank transfer is handled natively by ChapsSmS.
             */
            payment_options:
              "card",

            customer:
              checkout.customer,
            meta:
              checkout.meta,

            customizations: {
              title:
                "ChapsSmS Wallet Funding",
              description:
                `Fund your wallet with ${formatNaira(
                  checkout.amount,
                )}`,
            },

            callback:
              async (
                payment,
              ) => {
                verificationStarted =
                  true;

                setVerifying(
                  true,
                );

                try {
                  const result =
                    await paymentService.verifyPayment(
                      {
                        transactionId:
                          payment
                            ?.transaction_id ||
                          payment?.id,
                        txRef:
                          checkout.txRef,
                      },
                    );

                  if (
                    result
                      ?.walletBalance !==
                    undefined
                  ) {
                    updateWalletBalance(
                      Number(
                        result.walletBalance,
                      ),
                    );
                  }

                  await refreshWallet();

                  toast.success(
                    result?.message ||
                      "Wallet funded successfully",
                  );

                  modal?.close();
                } catch (
                  error
                ) {
                  console.error(
                    "Payment verification failed:",
                    error,
                  );

                  toast.error(
                    error?.message ||
                      "Payment could not be verified",
                  );
                } finally {
                  setVerifying(
                    false,
                  );

                  setFunding(
                    false,
                  );
                }
              },

            onclose:
              () => {
                if (
                  !verificationStarted
                ) {
                  setFunding(
                    false,
                  );

                  toast(
                    "Card checkout closed",
                  );
                }
              },
          },
        );
    } catch (error) {
      console.error(
        "Flutterwave card initialization failed:",
        error,
      );

      toast.error(
        error?.message ||
          "Unable to start card payment",
      );

      setFunding(
        false,
      );
    }
  }

  async function handleFundWallet(
    event,
  ) {
    event.preventDefault();

    if (
      gateway !==
      "flutterwave"
    ) {
      toast(
        "Paystack will be connected after its backend integration.",
      );
      return;
    }

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <
        100
    ) {
      toast.error(
        "Minimum funding amount is ₦100",
      );
      return;
    }

    if (
      paymentMethod ===
      "bank"
    ) {
      await startBankTransfer();
      return;
    }

    await startCardPayment();
  }

  function resetBankTransfer() {
    setBankTransfer(
      null,
    );

    setPaymentStatus(
      "idle",
    );

    setRemainingSeconds(
      0,
    );
  }

  const busy =
    funding ||
    verifying;

  if (bankTransfer) {
    const successful =
      paymentStatus ===
      "successful";

    const expired =
      paymentStatus ===
      "expired";

    return (
      <div className="mx-auto w-full min-w-0 max-w-xl">
        <button
          type="button"
          onClick={resetBankTransfer}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft
            size={17}
          />
          Back to Add Funds
        </button>

        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="px-4 pb-5 pt-6 text-center min-[390px]:px-5 sm:px-8 sm:pb-6 sm:pt-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              {successful ? (
                <Check
                  size={30}
                />
              ) : (
                <Building2
                  size={28}
                />
              )}
            </div>

            <h1 className="mt-5 text-xl font-black tracking-tight text-[var(--foreground)] min-[390px]:text-2xl">
              {successful
                ? "Payment received"
                : expired
                  ? "Transfer account expired"
                  : "Transfer to complete"}
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
              {successful
                ? "Your verified payment has been credited to your ChapsSmS wallet."
                : expired
                  ? "Generate a new temporary account before making another transfer."
                  : "Send the exact amount to the temporary account below. Your wallet will update automatically after verification."}
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-4 py-5 min-[390px]:px-5 sm:px-8 sm:py-6">
            <div className="divide-y divide-[var(--border)] rounded-2xl bg-[var(--muted)] px-4">
              <TransferRow
                label="Bank"
                value={
                  bankTransfer.bankName
                }
              />

              <TransferRow
                label="Account number"
                value={
                  bankTransfer.accountNumber
                }
                onCopy={() =>
                  copyValue(
                    bankTransfer.accountNumber,
                    "Account number",
                  )
                }
              />

              <TransferRow
                label="Account name"
                value={
                  bankTransfer.accountName ||
                  "ChapsSmS Wallet Funding"
                }
              />

              <TransferRow
                label="Amount"
                value={formatNaira(
                  bankTransfer.transferAmount ||
                    bankTransfer.amount,
                )}
                onCopy={() =>
                  copyValue(
                    bankTransfer.transferAmount ||
                      bankTransfer.amount,
                    "Amount",
                  )
                }
              />
            </div>

            {bankTransfer.transferNote ? (
              <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs leading-5 text-[var(--muted-foreground)]">
                {bankTransfer.transferNote}
              </p>
            ) : null}

            {!successful &&
            !expired ? (
              <>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs font-bold text-amber-700 dark:text-amber-300">
                  <TimerReset
                    size={15}
                  />
                  This account is for this transaction only and expires in{" "}
                  <span className="tabular-nums">
                    {formatTimer(
                      remainingSeconds,
                    )}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-[var(--muted-foreground)]">
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                  Waiting for transfer...
                </div>
              </>
            ) : null}

            {successful ? (
              <Button
                type="button"
                onClick={resetBankTransfer}
                className="mt-6 h-12 w-full"
              >
                Done
              </Button>
            ) : expired ? (
              <Button
                type="button"
                onClick={resetBankTransfer}
                className="mt-6 h-12 w-full"
              >
                Generate another account
              </Button>
            ) : (
              <button
                type="button"
                onClick={resetBankTransfer}
                className="mt-6 w-full text-center text-sm font-bold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                Close
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.flutterwave.com/v3.js"
        strategy="afterInteractive"
        onLoad={() =>
          setScriptReady(
            true,
          )
        }
        onError={() => {
          setScriptReady(
            false,
          );

          /*
           * Bank transfer still works because it does not depend on this script.
           */
          if (
            paymentMethod ===
            "card"
          ) {
            toast.error(
              "Unable to load secure card checkout",
            );
          }
        }}
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7">
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
            Add{" "}
            <span className="text-blue-600">
              Funds
            </span>
          </h1>

          <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
            Bank transfer is completed directly inside ChapsSmS. Card checkout remains secured by Flutterwave.
          </p>
        </div>

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm min-[390px]:rounded-3xl min-[390px]:p-5 sm:p-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Amount to add
            </p>

            <p className="mt-4 text-3xl font-black tracking-tight text-[var(--foreground)] min-[390px]:text-4xl sm:mt-5 sm:text-5xl">
              {numericAmount >
              0
                ? formatNaira(
                    numericAmount,
                  )
                : "₦"}
            </p>
          </div>

          <form
            onSubmit={
              handleFundWallet
            }
            className="mt-6 sm:mt-8"
          >
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {presetAmounts.map(
                (value) => {
                  const selected =
                    numericAmount ===
                    value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setAmount(
                          value,
                        )
                      }
                      className={`min-h-12 rounded-2xl border px-2 text-xs font-black transition sm:text-sm ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-blue-400"
                      }`}
                    >
                      ₦
                      {value.toLocaleString(
                        "en-NG",
                      )}
                    </button>
                  );
                },
              )}
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
                  value={
                    amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setAmount(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Enter amount"
                  className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-base font-black text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 sm:h-16 sm:text-2xl"
                />
              </div>
            </div>

            <p className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)] min-[390px]:text-[10px] sm:mt-8 sm:text-xs sm:tracking-[0.28em]">
              Pay with any option below
            </p>

            <div className="mt-4 grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1.5">
              <button
                type="button"
                onClick={() =>
                  setGateway(
                    "flutterwave",
                  )
                }
                className={`min-h-12 rounded-xl text-sm font-black transition ${
                  gateway ===
                  "flutterwave"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                Flutterwave
              </button>

              <button
                type="button"
                onClick={() => {
                  setGateway(
                    "paystack",
                  );

                  toast(
                    "Paystack is coming after backend integration.",
                  );
                }}
                className={`relative min-h-12 rounded-xl text-sm font-black transition ${
                  gateway ===
                  "paystack"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                Paystack

                <span className="absolute right-2 top-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  Soon
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1 sm:mt-5 sm:p-1.5">
              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "bank",
                  )
                }
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                  paymentMethod ===
                  "bank"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Landmark
                  size={18}
                />
                Bank
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "card",
                  )
                }
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                  paymentMethod ===
                  "card"
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-blue-500/40"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <CreditCard
                  size={18}
                />
                Card
              </button>
            </div>

            <Button
              type="submit"
              disabled={
                busy ||
                gateway !==
                  "flutterwave" ||
                (
                  paymentMethod ===
                    "card" &&
                  !scriptReady
                )
              }
              className="mt-6 h-12 w-full sm:mt-7 sm:h-14"
            >
              {busy ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : paymentMethod ===
                "bank" ? (
                <Building2
                  size={19}
                />
              ) : (
                <CreditCard
                  size={19}
                />
              )}

              {verifying
                ? "Verifying payment..."
                : funding
                  ? paymentMethod ===
                    "bank"
                    ? "Generating bank account..."
                    : "Opening secure card checkout..."
                  : paymentMethod ===
                      "bank"
                    ? `Generate account for ${formatNaira(
                        numericAmount,
                      )}`
                    : `Pay ${formatNaira(
                        numericAmount,
                      )} by card`}
            </Button>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
              <ShieldCheck
                size={15}
              />

              {paymentMethod ===
              "bank"
                ? "Temporary account generated securely by the backend"
                : "Card details are handled by Flutterwave, not stored by ChapsSmS"}
            </p>
          </form>
        </section>

        <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
          {[
            {
              icon: Zap,
              title:
                "Automatic credit",
              text:
                "ChapsSmS checks the transfer and updates your wallet after verification.",
            },
            {
              icon:
                Building2,
              title:
                "Native bank transfer",
              text:
                "Bank account details appear directly inside ChapsSmS.",
            },
            {
              icon:
                ShieldCheck,
              title:
                "Server verified",
              text:
                "Your Flutterwave secret key never enters the browser.",
            },
          ].map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <div
                  key={
                    item.title
                  }
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <Icon
                      size={18}
                    />
                  </div>

                  <p className="mt-4 font-black text-[var(--foreground)]">
                    {
                      item.title
                    }
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    {
                      item.text
                    }
                  </p>
                </div>
              );
            },
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center shadow-sm sm:mt-5 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Current wallet balance
          </p>

          <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
            {formatNaira(
              wallet?.balance,
            )}
          </p>
        </div>
      </div>
    </>
  );
}

function TransferRow({
  label,
  value,
  onCopy,
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 py-3">
      <span className="w-28 shrink-0 text-xs font-bold text-[var(--muted-foreground)]">
        {label}
      </span>

      <span data-mobile-wrap="true" className="min-w-0 flex-1 break-all text-right text-[13px] font-black leading-5 text-[var(--foreground)] min-[390px]:break-words min-[390px]:text-sm sm:text-base">
        {value || "—"}
      </span>

      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          aria-label={`Copy ${label}`}
        >
          <Copy
            size={16}
          />
        </button>
      ) : null}
    </div>
  );
}

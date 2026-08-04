import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  Globe2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const benefits = [
  {
    icon: Zap,
    text: "Fast OTP delivery",
  },
  {
    icon: Globe2,
    text: "Worldwide virtual numbers",
  },
  {
    icon: ShieldCheck,
    text: "Protected wallet and orders",
  },
  {
    icon: Code2,
    text: "Developer-ready API",
  },
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-[var(--background)] py-16 sm:py-20 lg:py-28">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-20 opacity-65" />

      <div className="animate-pulse-soft pointer-events-none absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl sm:h-96 sm:w-96" />

      <div className="animate-pulse-soft animation-delay-300 pointer-events-none absolute -right-32 bottom-0 -z-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl sm:h-96 sm:w-96" />

      <div className="site-container grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-16">
        <div className="animate-fade-up text-center lg:text-left">
          <Badge className="gap-2">
            <Sparkles size={14} />
            Modern SMS verification platform
          </Badge>

          <h1 className="text-balance mt-6 text-[clamp(2.7rem,8vw,5.35rem)] font-black leading-[0.98] tracking-[-0.045em] text-[var(--foreground)]">
            Receive verification codes with less friction.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg sm:leading-8 lg:mx-0 lg:max-w-xl">
            Buy virtual numbers, receive OTP messages, manage wallet activity,
            and automate workflows through one clean ChapsSmS dashboard.
          </p>

         <div className="relative z-[300] mt-8 flex flex-col justify-center gap-3 pointer-events-auto sm:flex-row sm:flex-wrap lg:justify-start">
  <a
    href="/signup"
    className="relative z-[301] inline-flex min-h-13 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.98] pointer-events-auto sm:w-auto"
  >
    Create free account
    <ArrowRight size={18} />
  </a>

  <a
    href="#how-it-works"
    className="relative z-[301] inline-flex min-h-13 w-full touch-manipulation items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-3.5 text-base font-bold text-[var(--foreground)] pointer-events-auto sm:w-auto"
  >
    See how it works
  </a>
</div>

          <div className="mt-9 grid gap-3 text-left sm:grid-cols-2">
            {benefits.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.text}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-1 py-1 text-sm font-semibold text-[var(--foreground)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                    <Icon size={17} />
                  </span>

                  <span>
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="animate-fade-up animation-delay-150 relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="animate-float-soft pointer-events-none absolute -left-3 top-12 z-20 hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl sm:block lg:-left-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-300">
                <CheckCircle2 size={20} />
              </span>

              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Order status
                </p>

                <p className="text-sm font-black text-[var(--foreground)]">
                  OTP received
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-blue-200/70 bg-[var(--card)] p-3 shadow-[0_35px_90px_-35px_rgba(37,99,235,0.38)] dark:border-blue-900/60 sm:p-5">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--background)] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                    <MessageSquareText size={21} />
                  </span>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      Live order
                    </p>

                    <p className="mt-1 font-black text-[var(--foreground)]">
                      WhatsApp · United States
                    </p>
                  </div>
                </div>

                <Badge
                  variant="success"
                  className="gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Connected
                </Badge>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Virtual number
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-base font-black text-[var(--foreground)] sm:text-lg">
                      +1 202 555 0184
                    </p>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--muted-foreground)]">
                      <Copy size={16} />
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    Time remaining
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-lg font-black text-[var(--foreground)]">
                    <Clock3
                      size={18}
                      className="text-blue-600"
                    />
                    16:42
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white shadow-lg shadow-blue-600/20 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                      Verification code
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[0.22em] sm:text-4xl">
                      482913
                    </p>
                  </div>

                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <CheckCircle2 size={25} />
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                      <WalletCards size={17} />
                    </span>

                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Wallet balance
                      </p>

                      <p className="font-black text-[var(--foreground)]">
                        ₦9,419.00
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-300">
                      <Zap size={17} />
                    </span>

                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Delivery
                      </p>

                      <p className="font-black text-[var(--foreground)]">
                        Real-time updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="animate-float-soft animation-delay-300 pointer-events-none absolute -bottom-6 right-3 z-20 hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl sm:block lg:-right-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                <Code2 size={20} />
              </span>

              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Built for developers
                </p>

                <p className="text-sm font-black text-[var(--foreground)]">
                  REST API ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  ArrowRight,
  Code2,
  Globe2,
  ShieldCheck,
  Sparkles,
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

      <div className="site-container">
        <div className="animate-fade-up mx-auto max-w-4xl text-center">
          <Badge className="gap-2">
            <Sparkles size={14} />

            Modern SMS verification platform
          </Badge>

          <h1 className="text-balance mt-6 text-[clamp(2.7rem,8vw,5.35rem)] font-black leading-[0.98] tracking-[-0.045em] text-[var(--foreground)]">
            Receive verification codes with less friction.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg sm:leading-8">
            Buy virtual numbers,
            receive OTP messages,
            manage wallet activity,
            and automate workflows
            through one clean ChapsSmS
            dashboard.
          </p>

          <div className="relative z-10 mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button
              href="/signup"
              size="lg"
              className="w-full sm:w-auto"
            >
              Create free account

              <ArrowRight
                size={18}
              />
            </Button>

            <Button
              href="#how-it-works"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              See how it works
            </Button>
          </div>

          <div className="mx-auto mt-9 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {benefits.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <div
                    key={
                      item.text
                    }
                    className="flex items-center gap-3 rounded-xl px-1 py-1 text-sm font-semibold text-[var(--foreground)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                      <Icon
                        size={17}
                      />
                    </span>

                    <span>
                      {item.text}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
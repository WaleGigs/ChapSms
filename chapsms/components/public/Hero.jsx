// components/public/Hero.jsx
import { ShieldCheck, Zap, Globe2, Code2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const benefits = [
  {
    icon: Zap,
    text: "Instant OTP delivery",
  },
  {
    icon: Globe2,
    text: "Global virtual numbers",
  },
  {
    icon: ShieldCheck,
    text: "Secure wallet system",
  },
  {
    icon: Code2,
    text: "Developer API access",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] px-6 py-24">
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <Badge>Premium SMS Verification Platform</Badge>

          <h1 className="mt-6 text-4xl font-black leading-tight text-[var(--foreground)] md:text-6xl">
            Receive OTP codes worldwide with reliable virtual numbers.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
            ChapsSmS helps individuals, developers, and businesses receive SMS
            verification codes quickly using a secure wallet, live order
            tracking, and API-ready infrastructure.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/signup" size="lg">
              Create Free Account
            </Button>

            <Button href="/api-docs" variant="secondary" size="lg">
              View API Docs
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {benefits.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.text}
                  className="flex items-center gap-3 text-sm font-semibold text-[var(--foreground)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Icon size={18} />
                  </span>
                  {item.text}
                </div>
              );
            })}
          </div>
        </div>

        <Card className="relative rounded-3xl p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Wallet Balance</p>
              <h3 className="text-3xl font-black text-[var(--foreground)]">
                $248.50
              </h3>
            </div>

            <Badge variant="success">Live</Badge>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Telegram OTP
                </p>
                <span className="text-xs font-bold text-green-600">
                  Received
                </span>
              </div>

              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                +44 7584 293010
              </p>

              <div className="mt-4 rounded-xl bg-blue-600 p-4 text-white">
                <p className="text-xs opacity-80">Verification Code</p>
                <p className="mt-1 text-3xl font-black tracking-widest">
                  482913
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Active Orders</p>
                <h4 className="mt-2 text-2xl font-black text-[var(--foreground)]">
                  12
                </h4>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Success Rate</p>
                <h4 className="mt-2 text-2xl font-black text-[var(--foreground)]">
                  98.7%
                </h4>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
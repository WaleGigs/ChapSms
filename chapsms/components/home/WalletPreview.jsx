// components/home/WalletPreview.jsx
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from "lucide-react";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const transactions = [
  { type: "Deposit", amount: "+$50.00", status: "Successful", icon: ArrowDownLeft },
  { type: "Telegram OTP", amount: "-$0.20", status: "Completed", icon: ArrowUpRight },
  { type: "Refund", amount: "+$0.18", status: "Returned", icon: ArrowDownLeft },
];

export default function WalletPreview() {
  return (
    <Section className="bg-slate-50 dark:bg-slate-950" id="wallet-preview">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <SectionHeader
          badge="Smart Wallet"
          title="Control spending with a clear wallet and transaction history"
          text="Users can fund their account, purchase numbers, receive refunds, and monitor all wallet activities from a simple financial-style interface."
        />

        <Card className="rounded-3xl p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Wallet size={26} />
              </div>

              <p className="text-sm text-[var(--muted-foreground)]">Available Balance</p>
              <h3 className="mt-2 text-5xl font-black text-[var(--foreground)]">
                $248.50
              </h3>
            </div>

            <Badge variant="success">Active</Badge>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Button className="w-full">
              <Plus size={18} />
              Fund Wallet
            </Button>

            <Button variant="secondary" className="w-full">
              View History
            </Button>
          </div>

          <div className="mt-8">
            <h4 className="mb-4 font-bold text-[var(--foreground)]">
              Recent Transactions
            </h4>

            <div className="space-y-4">
              {transactions.map((transaction) => {
                const Icon = transaction.icon;

                return (
                  <div
                    key={transaction.type}
                    className="flex items-center justify-between rounded-2xl bg-[var(--background)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--card)] text-blue-600">
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="font-semibold text-[var(--foreground)]">
                          {transaction.type}
                        </p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {transaction.status}
                        </p>
                      </div>
                    </div>

                    <p className="font-black text-[var(--foreground)]">
                      {transaction.amount}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}
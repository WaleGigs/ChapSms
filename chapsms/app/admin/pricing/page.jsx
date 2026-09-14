"use client";

import { useState } from "react";
import { BadgeDollarSign, Boxes } from "lucide-react";

import NumberPricingPanel from "@/components/admin/NumberPricingPanel";
import SocialPricingPanel from "@/components/admin/SocialPricingPanel";

export default function AdminPricingPage() {
  const [section, setSection] = useState("numbers");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 sm:max-w-md">
        <button
          type="button"
          onClick={() => setSection("numbers")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
            section === "numbers"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <BadgeDollarSign size={17} />
          Numbers
        </button>

        <button
          type="button"
          onClick={() => setSection("socials")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
            section === "socials"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Boxes size={17} />
          Socials
        </button>
      </div>

      {section === "numbers" ? <NumberPricingPanel /> : <SocialPricingPanel />}
    </div>
  );
}

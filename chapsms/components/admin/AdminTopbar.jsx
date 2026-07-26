"use client";

import { Menu, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AdminTopbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open admin navigation"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--muted)] lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <ShieldCheck size={17} />
            Administrator
          </div>
        </div>
      </div>
    </header>
  );
}
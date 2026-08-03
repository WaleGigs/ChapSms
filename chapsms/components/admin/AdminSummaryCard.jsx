export default function AdminSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  loading = false,
}) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {label}
          </p>

          <p className="mt-3 truncate text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
            {loading ? "..." : value}
          </p>

          {description && (
            <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
        </div>

        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <Icon size={21} />
          </div>
        )}
      </div>
    </section>
  );
}
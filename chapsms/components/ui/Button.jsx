import { cn } from "@/lib/utils";

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  ...props
}) {
  const base =
    "relative z-10 inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

  const variants = {
    primary:
      "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20",
    secondary:
      "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm hover:border-blue-300 hover:bg-[var(--muted)] dark:hover:border-blue-800",
    ghost:
      "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
    danger:
      "bg-red-600 text-white shadow-sm hover:bg-red-700",
    white:
      "bg-white text-blue-700 shadow-lg hover:bg-blue-50",
  };

  const sizes = {
    sm: "min-h-10 px-4 py-2 text-sm",
    md: "px-5 py-3 text-sm",
    lg: "min-h-13 px-6 py-3.5 text-base sm:px-7",
  };

  const classes = cn(
    base,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    disabled
      ? "pointer-events-none cursor-not-allowed opacity-55"
      : "pointer-events-auto",
    className
  );

  /*
   * Use a plain HTML anchor for navigation.
   * Do not preventDefault and do not use window.location.assign.
   * The browser will navigate even if React hydration has a problem.
   */
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
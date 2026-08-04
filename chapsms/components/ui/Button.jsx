"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  onClick,
  type = "button",
  ...props
}) {
  const baseClasses =
    "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 active:scale-[0.98]";

  const variants = {
    primary:
      "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700",
    secondary:
      "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
    ghost:
      "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
    danger:
      "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "min-h-10 px-4 py-2 text-sm",
    md: "px-5 py-3 text-sm",
    lg: "min-h-13 px-6 py-3.5 text-base sm:px-7",
  };

  const classes = cn(
    baseClasses,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    disabled
      ? "pointer-events-none cursor-not-allowed opacity-50"
      : "",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick}
        aria-disabled={disabled || undefined}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
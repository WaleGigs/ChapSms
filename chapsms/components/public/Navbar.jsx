import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Button from "@/components/ui/Button";

const links = [
  { href: "#services", label: "Services" },
  { href: "#countries", label: "Countries" },
  { href: "#api", label: "API" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-black text-[var(--foreground)]"
        >
          Chaps<span className="text-blue-600">SmS</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/login"
            className="hidden text-sm font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] md:block"
          >
            Login
          </Link>

          <Button href="/signup" size="sm">
            Get Started
          </Button>
        </div>
      </nav>
    </header>
  );
}
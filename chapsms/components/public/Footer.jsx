import Link from "next/link";

const footerLinks = {
  Product: [
    {
      href: "#services",
      label: "Services",
    },
    {
      href: "#countries",
      label: "Countries",
    },
    {
      href: "#api",
      label: "Developer API",
    },
    {
      href: "/signup",
      label: "Create Account",
    },
  ],

  Company: [
    {
      href: "/#about",
      label: "About",
    },
    {
      href: "/support",
      label: "Contact",
    },
    {
      href: "#faq",
      label: "FAQ",
    },
  ],

  Legal: [
    {
      href: "/terms",
      label: "Terms of Service",
    },
    {
      href: "/privacy",
      label: "Privacy Policy",
    },
    {
      href: "/refund-policy",
      label: "Refund Policy",
    },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-14">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="text-2xl font-black text-[var(--foreground)]"
          >
            Chaps
            <span className="text-blue-600">
              SmS
            </span>
          </Link>

          <p className="mt-4 max-w-sm leading-7 text-[var(--muted-foreground)]">
            A modern SMS verification platform for virtual numbers, OTP
            delivery, wallet management, and developer API access.
          </p>

          <p className="mt-6 text-sm text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} ChapsSmS. All rights reserved.
          </p>
        </div>

        {Object.entries(
          footerLinks,
        ).map(
          ([
            title,
            links,
          ]) => (
            <div key={title}>
              <h3 className="font-black text-[var(--foreground)]">
                {title}
              </h3>

              <div className="mt-4 space-y-3">
                {links.map(
                  (link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block text-sm font-medium text-[var(--muted-foreground)] transition hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </footer>
  );
}

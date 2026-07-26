import Link from "next/link";

// import GuestRoute from "@/components/auth/GuestRoute";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }) {
  return (
   
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="grid min-h-screen lg:grid-cols-2">
          <section className="hidden bg-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <Link href="/" className="text-3xl font-black">
              Chaps
              <span className="text-blue-100">
                SmS
              </span>
            </Link>

            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-100">
                SMS Verification Platform
              </p>

              <h1 className="max-w-xl text-5xl font-black leading-tight">
                Receive OTPs from hundreds of
                services in seconds.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">
                Secure virtual numbers, wallet
                management, instant delivery, and
                API access for users and
                developers.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-xl">
              <p className="text-sm text-blue-100">
                Live OTP Preview
              </p>

              <div className="mt-4 rounded-2xl bg-white p-5 text-slate-950">
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    Telegram OTP
                  </p>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    Received
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  +44 7584 293010
                </p>

                <p className="mt-4 text-4xl font-black tracking-widest text-blue-600">
                  482913
                </p>
              </div>
            </div>
          </section>

          <section className="flex min-h-screen flex-col">
            <div className="flex items-center justify-between px-6 py-5">
              <Link
                href="/"
                className="text-2xl font-black lg:hidden"
              >
                Chaps
                <span className="text-blue-600">
                  SmS
                </span>
              </Link>

              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center px-6 py-10">
              <div className="w-full max-w-md">
                {children}
              </div>
            </div>
          </section>
        </div>
      </main>
   
  );
}
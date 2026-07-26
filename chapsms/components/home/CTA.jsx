// components/home/CTA.jsx
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";

export default function CTA() {
  return (
    <Section className="bg-[var(--background)]">
      <div className="overflow-hidden rounded-3xl bg-blue-600 px-6 py-16 text-center text-white shadow-2xl">
        <h2 className="mx-auto max-w-3xl text-3xl font-black md:text-5xl">
          Ready to start receiving OTP codes with ChapsSmS?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-blue-100">
          Create your account, fund your wallet, choose a service, and receive
          your SMS verification code from one clean dashboard.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button href="/signup" variant="secondary">
            Create Free Account
          </Button>

          <Button href="/api-docs" className="bg-white/10 hover:bg-white/20">
            View API Docs
          </Button>
        </div>
      </div>
    </Section>
  );
}
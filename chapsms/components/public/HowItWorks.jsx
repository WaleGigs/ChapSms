// components/public/HowItWorks.jsx
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";

const steps = [
  "Create your ChapsSmS account",
  "Fund your wallet securely",
  "Choose country and service",
  "Receive your OTP code",
];

export default function HowItWorks() {
  return (
    <Section className="bg-slate-50 dark:bg-gray-900" id="how-it-works">
      <h2 className="text-center text-3xl font-bold text-gray-950 dark:text-white md:text-4xl">
        How ChapsSmS Works
      </h2>

      <div className="mt-12 grid gap-6 md:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step}>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 font-bold text-white">
              {index + 1}
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {step}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
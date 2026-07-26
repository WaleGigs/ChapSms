// components/home/PopularServices.jsx
import {
  MessageCircle,
  Send,
  Music2,
  Gamepad2,
  Mail,
  ShoppingBag,
  Video,
  Users,
} from "lucide-react";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";

const services = [
  { name: "WhatsApp", icon: MessageCircle, price: "$0.25" },
  { name: "Telegram", icon: Send, price: "$0.20" },
  { name: "TikTok", icon: Music2, price: "$0.30" },
  { name: "Discord", icon: Gamepad2, price: "$0.22" },
  { name: "Google", icon: Mail, price: "$0.35" },
  { name: "Amazon", icon: ShoppingBag, price: "$0.28" },
  { name: "Netflix", icon: Video, price: "$0.32" },
  { name: "Facebook", icon: Users, price: "$0.24" },
];

export default function PopularServices() {
  return (
    <Section className="bg-[var(--background)]" id="services">
      <SectionHeader
        badge="Popular Services"
        title="Get OTP codes for platforms people use every day"
        text="Choose a service, select a country, purchase a number, and receive your verification code in one place."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => {
          const Icon = service.icon;

          return (
            <Card
              key={service.name}
              className="group transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Icon size={22} />
              </div>

              <h3 className="text-lg font-bold text-[var(--foreground)]">
                {service.name}
              </h3>

              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Starting from{" "}
                <span className="font-bold text-blue-600">{service.price}</span>
              </p>
            </Card>
          );
        })}
      </div>

      <div className="mt-10">
        <Button href="/signup">View All Services</Button>
      </div>
    </Section>
  );
}
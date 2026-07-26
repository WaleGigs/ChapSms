"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Code2, Copy, KeyRound, Server, ShieldCheck } from "lucide-react";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";

const apiCode = `GET /api/v1/orders/request

Headers:
Authorization: Bearer YOUR_API_KEY

Response:
{
  "success": true,
  "order_id": "CHP-902144",
  "service": "Telegram",
  "country": "United Kingdom",
  "number": "+447584293010",
  "status": "waiting_for_sms"
}

GET /api/v1/orders/CHP-902144/sms

Response:
{
  "success": true,
  "otp": "482913",
  "message": "Your verification code is 482913"
}`;

const apiFeatures = [
  { icon: KeyRound, title: "Secure API Keys" },
  { icon: Server, title: "REST Endpoints" },
  { icon: ShieldCheck, title: "Protected Requests" },
];

export default function ApiPreview() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiCode);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <Section className="bg-[var(--background)]" id="api">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            badge="Developer API"
            title="Build SMS verification directly into your own app"
            text="Use ChapsSmS API endpoints to check balance, buy numbers, track orders, receive OTP messages, and cancel pending requests."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {apiFeatures.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                >
                  <Card>
                    <Icon className="text-blue-600" size={22} />
                    <p className="mt-3 text-sm font-bold text-[var(--foreground)]">
                      {item.title}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/api-docs">View API Docs</Button>
            <Button href="/signup" variant="secondary">
              Get API Key
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <Card className="overflow-hidden rounded-3xl bg-slate-950 p-0 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
                <p className="ml-3 text-sm text-slate-400">
                  api.chapssms.dev
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <motion.pre
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="overflow-x-auto p-6 text-sm leading-7 text-slate-200"
            >
              <code>{apiCode}</code>
            </motion.pre>
          </Card>
        </motion.div>
      </div>
    </Section>
  );
}
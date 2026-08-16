import StatusBadge from "@/components/table/StatusBadge";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

const SERVICE_NAME_ALIASES = {
  wa: "WhatsApp",
  ig: "Instagram",
  tg: "Telegram",
  fb: "Facebook",
  go: "Google",
  am: "Amazon",
  ds: "Discord",
  tt: "TikTok",
  tw: "X / Twitter",
  nf: "Netflix",
};

function getServiceDisplayName(value, explicitName = "") {
  const name = String(explicitName || "").trim();

  if (name) {
    return name;
  }

  const code = String(value || "").trim();
  const normalized = code.toLowerCase();

  if (SERVICE_NAME_ALIASES[normalized]) {
    return SERVICE_NAME_ALIASES[normalized];
  }

  if (!code) {
    return "—";
  }

  return code
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getCountryDisplayName(value, explicitName = "") {
  const name = String(explicitName || "").trim();

  if (name) {
    return name;
  }

  const raw = String(value || "").trim();
  return raw || "—";
}

export default function AdminOrderCard({ sale }) {
  const customerName = [
    sale?.customer?.firstName,
    sale?.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-[var(--foreground)]">
            {getServiceDisplayName(
              sale.service,
              sale.serviceName
            )}
          </p>
        </div>
        <StatusBadge status={sale.status} />
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--muted-foreground)]">Customer</span>
          <span className="max-w-[65%] text-right font-bold text-[var(--foreground)]">
            {customerName || sale?.customer?.email || "Unknown"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--muted-foreground)]">Email</span>
          <span className="max-w-[65%] break-all text-right font-semibold text-[var(--foreground)]">
            {sale?.customer?.email || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--muted-foreground)]">Phone</span>
          <span className="font-bold text-[var(--foreground)]">
            {sale.phoneNumber || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--muted-foreground)]">OTP</span>
          <span className="font-black tracking-wider text-blue-600">
            {sale.otpCode || "Waiting"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--muted)] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Cost
          </p>
          <p className="mt-1 text-sm font-black text-[var(--foreground)]">
            {formatNaira(sale.providerCostNgn)}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-center dark:bg-blue-950/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
            Sale
          </p>
          <p className="mt-1 text-sm font-black text-blue-600">
            {formatNaira(sale.sellingPrice)}
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center dark:bg-green-950/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-600">
            Profit
          </p>
          <p className="mt-1 text-sm font-black text-green-600">
            {formatNaira(sale.profit)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
        <div className="flex justify-between gap-3">
          <span>Created</span>
          <span className="text-right font-semibold">
            {formatDateTime(sale.createdAt)}
          </span>
        </div>
        {sale.otpReceivedAt && (
          <div className="mt-2 flex justify-between gap-3">
            <span>OTP received</span>
            <span className="text-right font-semibold">
              {formatDateTime(sale.otpReceivedAt)}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

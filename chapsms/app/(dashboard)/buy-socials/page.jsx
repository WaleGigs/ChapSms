"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ChevronDown, LoaderCircle, RefreshCw, Search, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";

import { socialService } from "@/services/socialService";
import { useWallet } from "@/hooks/useWallet";

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function getErrorMessage(error) {
  const code = String(
    error?.code || error?.response?.data?.code || ""
  ).trim().toUpperCase();

  const messages = {
    INSUFFICIENT_WALLET_BALANCE:
      "Your ChapsSms wallet balance is too low for this purchase.",
    SOCIAL_OUT_OF_STOCK:
      "This product is currently out of stock.",
    SOCIAL_PRODUCT_NOT_FOUND:
      "This product is no longer available.",
    SOCIAL_PURCHASE_REQUIRES_LIVE_MODE:
      "Buy Socials is temporarily unavailable while payment testing is enabled.",
    SOCIAL_PURCHASE_REVIEW_REQUIRED:
      "Your order is being verified. Please do not purchase the same product again.",
  };

  return (
    messages[code] ||
    error?.message ||
    error?.response?.data?.message ||
    "ChapsSms could not complete this purchase."
  );
}

function networkType(product) {
  const text = `${product?.name || ""} ${product?.category || ""}`.toLowerCase();

  if (text.includes("facebook")) return "facebook";
  if (text.includes("twitter") || /(^|\s)x(\s|$)/.test(text)) return "x";
  if (text.includes("instagram")) return "instagram";
  if (text.includes("tiktok")) return "tiktok";
  if (text.includes("telegram")) return "telegram";
  if (text.includes("discord")) return "discord";
  if (text.includes("reddit")) return "reddit";
  if (text.includes("google") || text.includes("gmail")) return "google";
  if (text.includes("proxy")) return "proxy";
  return "generic";
}

function ProductLogo({ product }) {
  const [customFailed, setCustomFailed] = useState(false);
  const [brandFailed, setBrandFailed] = useState(false);
  const type = networkType(product);

  const brandAssets = {
    facebook: {
      src: "https://cdn.simpleicons.org/facebook/ffffff",
      className: "bg-[#1877F2]",
      alt: "Facebook",
    },
    x: {
      src: "https://cdn.simpleicons.org/x/ffffff",
      className: "bg-black",
      alt: "X",
    },
    instagram: {
      src: "https://cdn.simpleicons.org/instagram/ffffff",
      className: "bg-fuchsia-600",
      alt: "Instagram",
    },
    tiktok: {
      src: "https://cdn.simpleicons.org/tiktok/ffffff",
      className: "bg-black",
      alt: "TikTok",
    },
    telegram: {
      src: "https://cdn.simpleicons.org/telegram/ffffff",
      className: "bg-sky-500",
      alt: "Telegram",
    },
    discord: {
      src: "https://cdn.simpleicons.org/discord/ffffff",
      className: "bg-indigo-600",
      alt: "Discord",
    },
    reddit: {
      src: "https://cdn.simpleicons.org/reddit/ffffff",
      className: "bg-orange-600",
      alt: "Reddit",
    },
    google: {
      src: "https://cdn.simpleicons.org/google/4285F4",
      className: "bg-white ring-1 ring-slate-200",
      alt: "Google",
    },
  };

  if (product?.logoUrl && !customFailed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-white/10 min-[390px]:h-14 min-[390px]:w-14 min-[390px]:rounded-2xl sm:h-16 sm:w-16">
        <img
          src={product.logoUrl}
          alt={`${product.name || "Product"} logo`}
          className="h-full w-full object-contain p-1 sm:p-1.5"
          onError={() => setCustomFailed(true)}
        />
      </div>
    );
  }

  const brand = brandAssets[type];

  if (brand && !brandFailed) {
    return (
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl min-[390px]:h-14 min-[390px]:w-14 min-[390px]:rounded-2xl sm:h-16 sm:w-16 ${brand.className}`}>
        <img
          src={brand.src}
          alt={brand.alt}
          className="h-7 w-7 object-contain min-[390px]:h-8 min-[390px]:w-8 sm:h-9 sm:w-9"
          onError={() => setBrandFailed(true)}
        />
      </div>
    );
  }

  const base = "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm min-[390px]:h-14 min-[390px]:w-14 min-[390px]:rounded-2xl sm:h-16 sm:w-16";

  if (type === "facebook") return <div className={`${base} bg-[#1877F2] text-2xl font-black min-[390px]:text-3xl sm:text-4xl`}>f</div>;
  if (type === "x") return <div className={`${base} bg-black text-xl font-medium min-[390px]:text-2xl sm:text-3xl`}>𝕏</div>;
  if (type === "instagram") return <div className={`${base} bg-fuchsia-600 text-xl font-black min-[390px]:text-2xl sm:text-3xl`}>◎</div>;
  if (type === "tiktok") return <div className={`${base} bg-black text-xl font-black min-[390px]:text-2xl sm:text-3xl`}>♪</div>;
  if (type === "telegram") return <div className={`${base} bg-sky-500 text-lg font-black min-[390px]:text-xl sm:text-2xl`}>➤</div>;
  if (type === "discord") return <div className={`${base} bg-indigo-600 text-base font-black min-[390px]:text-lg sm:text-xl`}>DC</div>;
  if (type === "reddit") return <div className={`${base} bg-orange-600 text-lg font-black min-[390px]:text-xl sm:text-2xl`}>r/</div>;
  if (type === "google") return <div className={`${base} bg-white text-xl font-black text-blue-600 min-[390px]:text-2xl sm:text-3xl ring-1 ring-slate-200`}>G</div>;
  if (type === "proxy") return <div className={`${base} bg-violet-600 text-base font-black min-[390px]:text-lg sm:text-xl`}>IP</div>;

  const initial = String(product?.name || "P").trim().slice(0, 1).toUpperCase();
  return <div className={`${base} bg-blue-600 text-lg font-black min-[390px]:text-xl sm:text-2xl`}>{initial}</div>;
}

function ProductCard({ product, onBuy }) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  return (
    <article className="min-w-0 rounded-[18px] border border-[#22314f] bg-[#111f39] p-4 shadow-sm min-[390px]:rounded-[20px] min-[390px]:p-[18px] sm:rounded-[22px] sm:p-6">
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <ProductLogo product={product} />

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[14px] font-black uppercase leading-[1.25] text-white min-[390px]:text-[15px] sm:text-xl">
            {product.name}
          </h3>
          <p className="mt-1.5 break-words text-[10px] font-semibold uppercase leading-4 tracking-[0.04em] text-[#8997b3] min-[390px]:text-[11px] sm:mt-2 sm:text-xs">
            {product.category}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDescriptionOpen((value) => !value)}
        className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-[#a7b3ca] min-[390px]:text-[13px] sm:mt-5 sm:gap-2 sm:text-sm"
      >
        <ChevronDown
          size={15}
          className={`transition ${descriptionOpen ? "rotate-180" : ""}`}
        />
        View description
      </button>

      {descriptionOpen ? (
        <div className="mt-3 rounded-xl border border-[#253653] bg-[#0c172b] p-3 text-[12px] leading-5 text-[#aab6cc] min-[390px]:text-[13px] sm:text-sm sm:leading-6">
          {product.description || "No extra usage note has been added for this product yet."}
        </div>
      ) : null}

      <p className={`mt-4 text-[13px] font-medium min-[390px]:text-[14px] sm:mt-5 sm:text-base ${product.inStock ? "text-emerald-400" : "text-rose-400"}`}>
        {product.inStock
          ? `${Number(product.stock || 0).toLocaleString("en-NG")} in stock`
          : "Out of Stock"}
      </p>

      <p className="mt-3 text-[24px] font-black leading-none text-[#2f78ff] min-[390px]:text-[26px] sm:mt-4 sm:text-3xl">
        {formatNaira(product.price)}
      </p>

      <button
        type="button"
        onClick={() => onBuy(product)}
        disabled={!product.inStock}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#30425f] bg-[#12213b] text-[13px] font-black text-white transition hover:border-[#4c6590] hover:bg-[#172944] disabled:cursor-not-allowed disabled:opacity-50 min-[390px]:text-sm sm:mt-5 sm:h-14 sm:rounded-2xl sm:text-base"
      >
        <ShoppingCart size={17} className="sm:h-[19px] sm:w-[19px]" />
        {product.inStock ? "Buy Now" : "Out of Stock"}
      </button>
    </article>
  );
}

function PurchaseModal({ product, quantity, setQuantity, purchasing, onClose, onPay }) {
  if (!product) return null;

  const maxQuantity = Math.max(1, Math.min(50, Number(product.stock || 1)));
  const safeQuantity = Math.min(maxQuantity, Math.max(1, Number.parseInt(quantity, 10) || 1));
  const total = Number(product.price || 0) * safeQuantity;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-2.5 backdrop-blur-sm min-[390px]:p-3 sm:items-center sm:p-6">
      <button
        type="button"
        onClick={purchasing ? undefined : onClose}
        aria-label="Close purchase"
        className="absolute inset-0"
      />

      <section className="relative z-10 max-h-[calc(100dvh-20px)] w-full max-w-[540px] overflow-y-auto rounded-t-[22px] border border-[#273a5a] bg-[#10203a] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl min-[390px]:p-5 sm:max-h-[90vh] sm:rounded-[24px] sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={purchasing}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#96a5bf] hover:bg-white/5 min-[390px]:right-4 min-[390px]:top-4 min-[390px]:h-9 min-[390px]:w-9 min-[390px]:rounded-xl"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="pr-9 text-[18px] font-black uppercase leading-[1.2] text-white min-[390px]:text-xl sm:pr-10 sm:text-2xl">
          {product.name}
        </h2>
        <p className="mt-1.5 text-[12px] font-medium uppercase leading-5 text-[#8f9db7] min-[390px]:text-[13px] sm:mt-2 sm:text-base sm:leading-6">
          {product.category} · {formatNaira(product.price)} each
        </p>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8f9db7] min-[390px]:mt-6 min-[390px]:text-[11px] sm:mt-8 sm:text-sm">
          Quantity (1-{maxQuantity})
        </p>

        <div className="mt-2.5 grid grid-cols-[48px_minmax(0,1fr)_48px] gap-2.5 min-[390px]:grid-cols-[52px_minmax(0,1fr)_52px] min-[390px]:gap-3 sm:mt-3 sm:grid-cols-[58px_1fr_58px]">
          <button
            type="button"
            disabled={purchasing || safeQuantity <= 1}
            onClick={() => setQuantity(Math.max(1, safeQuantity - 1))}
            className="h-12 rounded-xl border border-[#31435f] bg-[#142642] text-xl font-bold text-white disabled:opacity-35 sm:h-14 sm:rounded-2xl sm:text-2xl"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={maxQuantity}
            value={quantity}
            disabled={purchasing}
            onChange={(event) => {
              const next = Math.max(1, Math.min(maxQuantity, Number.parseInt(event.target.value, 10) || 1));
              setQuantity(next);
            }}
            className="h-12 min-w-0 rounded-xl border border-[#31435f] bg-[#142642] text-center text-base font-bold text-white outline-none focus:border-blue-500 sm:h-14 sm:rounded-2xl sm:text-lg"
          />
          <button
            type="button"
            disabled={purchasing || safeQuantity >= maxQuantity}
            onClick={() => setQuantity(Math.min(maxQuantity, safeQuantity + 1))}
            className="h-12 rounded-xl border border-[#31435f] bg-[#142642] text-xl font-bold text-white disabled:opacity-35 sm:h-14 sm:rounded-2xl sm:text-2xl"
          >
            +
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 min-[390px]:mt-6 sm:mt-8 sm:gap-4">
          <span className="text-[13px] font-medium text-[#8f9db7] min-[390px]:text-sm sm:text-base">Total</span>
          <span className="text-[24px] font-black leading-none text-white min-[390px]:text-[26px] sm:text-3xl">{formatNaira(total)}</span>
        </div>

        <p className="mt-4 text-[12px] leading-5 text-[#8796b0] min-[390px]:text-[13px] sm:mt-5 sm:text-sm sm:leading-6">
          Deducted from your wallet. Credentials are delivered instantly.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 min-[390px]:mt-6 min-[390px]:gap-3 sm:mt-7">
          <button
            type="button"
            onClick={onClose}
            disabled={purchasing}
            className="h-12 rounded-xl border border-[#31435f] bg-transparent text-[13px] font-bold text-[#c0cade] disabled:opacity-50 min-[390px]:text-sm sm:h-14 sm:rounded-2xl sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onPay(safeQuantity)}
            disabled={purchasing}
            className="flex h-12 items-center justify-center rounded-xl border border-[#42597f] bg-[#1a2c4a] px-2 text-[12px] font-black text-white disabled:opacity-50 min-[390px]:text-[13px] sm:h-14 sm:rounded-2xl sm:text-base"
          >
            {purchasing ? (
              <LoaderCircle className="animate-spin" size={20} />
            ) : (
              `Pay ${formatNaira(total)}`
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function BuySocialsPage() {
  const { refreshWallet } = useWallet();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const loadCatalog = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setCatalogLoading(true);
      const response = await socialService.getCatalog();
      setProducts(response.products);
      setCategories(response.categories);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (!silent) setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }

      if (!query) return true;

      return `${product.name || ""} ${product.category || ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [products, selectedCategory, search]);

  const groupedProducts = useMemo(() => {
    const map = new Map();
    for (const product of filteredProducts) {
      const category = product.category || "Other";
      if (!map.has(category)) map.set(category, []);
      map.get(category).push(product);
    }
    return [...map.entries()];
  }, [filteredProducts]);

  async function refreshCatalog() {
    if (refreshing) return;
    try {
      setRefreshing(true);
      await loadCatalog({ silent: true });
      toast.success("Products refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function openPurchase(product) {
    setSelectedProduct(product);
    setQuantity(1);
  }

  async function handlePurchase(safeQuantity) {
    if (!selectedProduct || purchasing) return;

    try {
      setPurchasing(true);
      const response = await socialService.buyProduct({
        productId: selectedProduct.id,
        quantity: safeQuantity,
      });

      await refreshWallet?.();
      await loadCatalog({ silent: true });

      if (response?.reviewRequired) {
        toast("Purchase is being verified. Do not order the same item again.");
      } else {
        toast.success("Purchase completed. Check Logs History for your credentials.");
      }

      setSelectedProduct(null);
      setQuantity(1);
    } catch (error) {
      try {
        await refreshWallet?.();
      } catch {}
      toast.error(getErrorMessage(error));
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 w-full max-w-[1080px] overflow-x-hidden text-[var(--foreground)]">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[26px] font-black leading-tight tracking-tight min-[390px]:text-[28px] sm:text-4xl">
          Buy Socials
        </h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-[22px] text-[var(--muted-foreground)] min-[390px]:text-sm min-[390px]:leading-6 sm:mt-3 sm:text-base sm:leading-7">
          Instant delivery. Credentials appear right after payment from your NGN wallet.
        </p>

        <button
          type="button"
          onClick={refreshCatalog}
          disabled={refreshing}
          className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-[13px] font-black transition hover:bg-[var(--muted)] disabled:opacity-50 min-[390px]:text-sm sm:mt-5 sm:h-12 sm:rounded-2xl sm:px-5"
        >
          <RefreshCw size={16} className={`${refreshing ? "animate-spin" : ""} sm:h-[18px] sm:w-[18px]`} />
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] sm:left-4 sm:h-5 sm:w-5" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search accounts..."
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-3.5 text-[14px] font-medium outline-none focus:border-blue-500 min-[390px]:rounded-2xl sm:h-14 sm:pl-12 sm:pr-4 sm:text-base"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-[14px] font-semibold outline-none focus:border-blue-500 min-[390px]:rounded-2xl sm:h-14 sm:px-4 sm:text-base"
        >
          <option value="all">All</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-5 text-[13px] text-[var(--muted-foreground)] min-[390px]:text-sm sm:mt-6 sm:text-base">
        Showing {filteredProducts.length.toLocaleString("en-NG")} products
      </p>

      {catalogLoading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <LoaderCircle className="animate-spin text-blue-500" size={30} />
        </div>
      ) : groupedProducts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted-foreground)]">
          No products found.
        </div>
      ) : (
        <div className="mt-6 space-y-8 sm:mt-8 sm:space-y-10">
          {groupedProducts.map(([category, categoryProducts]) => (
            <section key={category}>
              <h2 className="break-words border-b border-[var(--border)] pb-3 text-[16px] font-black uppercase leading-[1.25] tracking-[0.025em] min-[390px]:text-[17px] sm:pb-4 sm:text-2xl sm:tracking-[0.04em]">
                {category}
              </h2>

              <div className="mt-4 grid min-w-0 gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-2">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onBuy={openPurchase} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PurchaseModal
        product={selectedProduct}
        quantity={quantity}
        setQuantity={setQuantity}
        purchasing={purchasing}
        onClose={() => {
          if (!purchasing) {
            setSelectedProduct(null);
            setQuantity(1);
          }
        }}
        onPay={handlePurchase}
      />
    </div>
  );
}

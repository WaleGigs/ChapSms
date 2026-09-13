"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  CheckCircle2,
  Copy,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";

import {
  socialService,
} from "@/services/socialService";

import {
  useWallet,
} from "@/hooks/useWallet";

function formatNaira(
  value
) {
  return `₦${Number(
    value || 0
  ).toLocaleString(
    "en-NG",
    {
      maximumFractionDigits:
        0,
    }
  )}`;
}

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getErrorMessage(
  error
) {
  const code =
    String(
      error?.code ||
        error?.response
          ?.data?.code ||
        ""
    )
      .trim()
      .toUpperCase();

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

    SOCIAL_CATALOG_LOAD_FAILED:
      "ChapsSms could not load social products right now.",
  };

  if (messages[code]) {
    return messages[code];
  }

  return (
    error?.message ||
    error?.response?.data
      ?.message ||
    "ChapsSms could not complete this request."
  );
}

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  if (
    normalized ===
    "completed"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900">
        <CheckCircle2
          size={13}
        />
        Delivered
      </span>
    );
  }

  if (
    normalized ===
    "review_required"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
        <LoaderCircle
          size={13}
        />
        Verifying
      </span>
    );
  }

  if (
    normalized ===
      "refunded" ||
    normalized ===
      "failed"
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
        {normalized ===
        "refunded"
          ? "Refunded"
          : "Failed"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
      <LoaderCircle
        className="animate-spin"
        size={13}
      />
      Processing
    </span>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(product)
      }
      disabled={
        !product.inStock
      }
      className={`w-full overflow-hidden rounded-2xl border p-4 text-left transition sm:p-5 ${
        selected
          ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10 dark:bg-blue-950/20"
          : "border-[var(--border)] bg-[var(--card)] hover:border-blue-300"
      } ${
        !product.inStock
          ? "cursor-not-allowed opacity-55"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600">
            {product.category}
          </p>

          <h3 className="mt-1 line-clamp-2 text-sm font-black text-[var(--foreground)] sm:text-base">
            {product.name}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-black text-[var(--foreground)]">
            {formatNaira(
              product.price
            )}
          </p>

          <p
            className={`mt-1 text-[10px] font-bold ${
              product.inStock
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {product.inStock
              ? `${Number(
                  product.stock ||
                    0
                ).toLocaleString()} in stock`
              : "Out of stock"}
          </p>
        </div>
      </div>
    </button>
  );
}

function OrderCard({
  order,
  onCopy,
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StatusBadge
              status={
                order.status
              }
            />

            <h3 className="mt-3 text-sm font-black text-[var(--foreground)] sm:text-base">
              {order.productName}
            </h3>

            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {order.category} • Qty{" "}
              {order.quantity}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-[var(--foreground)]">
              {formatNaira(
                order.total
              )}
            </p>

            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              {formatDate(
                order.createdAt
              )}
            </p>
          </div>
        </div>

        {order.message && (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {order.message}
          </div>
        )}

        {Array.isArray(
          order.deliveredItems
        ) &&
          order
            .deliveredItems
            .length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Delivered details
              </p>

              <div className="space-y-2">
                {order.deliveredItems.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${order.id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--muted)] px-3 py-3"
                    >
                      <p className="min-w-0 break-all font-mono text-xs font-bold text-[var(--foreground)]">
                        {item}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          onCopy(
                            item
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--foreground)]"
                      >
                        <Copy
                          size={
                            14
                          }
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
      </div>
    </article>
  );
}

export default function BuySocialsPage() {
  const {
    refreshWallet,
  } = useWallet();

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(true);

  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(true);

  const [
    purchasing,
    setPurchasing,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadCatalog =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setCatalogLoading(
              true
            );
          }

          const response =
            await socialService
              .getCatalog();

          setProducts(
            response.products
          );

          setCategories(
            response.categories
          );

          setSelectedProduct(
            (current) => {
              if (!current) {
                return null;
              }

              return (
                response.products.find(
                  (product) =>
                    product.id ===
                    current.id
                ) || null
              );
            }
          );
        } catch (error) {
          if (!silent) {
            toast.error(
              getErrorMessage(
                error
              )
            );
          }
        } finally {
          if (!silent) {
            setCatalogLoading(
              false
            );
          }
        }
      },
      []
    );

  const loadOrders =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setOrdersLoading(
              true
            );
          }

          const result =
            await socialService
              .getOrders();

          setOrders(result);
        } catch (error) {
          if (!silent) {
            toast.error(
              getErrorMessage(
                error
              )
            );
          }
        } finally {
          if (!silent) {
            setOrdersLoading(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    loadCatalog();
    loadOrders();
  }, [
    loadCatalog,
    loadOrders,
  ]);

  /*
   * Refresh orders periodically only while
   * something requires verification.
   */
  const hasPendingOrder =
    useMemo(
      () =>
        orders.some(
          (order) =>
            [
              "processing",
              "review_required",
            ].includes(
              String(
                order?.status ||
                  ""
              ).toLowerCase()
            )
        ),
      [orders]
    );

  useEffect(() => {
    if (
      !hasPendingOrder
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          loadOrders({
            silent: true,
          });
        },
        10000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    hasPendingOrder,
    loadOrders,
  ]);

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return products.filter(
        (product) => {
          if (
            selectedCategory !==
              "all" &&
            product.category !==
              selectedCategory
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            String(
              product.name ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            String(
              product.category ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              )
          );
        }
      );
    }, [
      products,
      selectedCategory,
      search,
    ]);

  const safeQuantity =
    Math.max(
      1,
      Number.parseInt(
        quantity,
        10
      ) || 1
    );

  const selectedTotal =
    selectedProduct
      ? Number(
          selectedProduct
            .price ||
            0
        ) * safeQuantity
      : 0;

  function selectProduct(
    product
  ) {
    setSelectedProduct(
      product
    );

    setQuantity(1);

    window.requestAnimationFrame(
      () => {
        document
          .getElementById(
            "social-purchase-panel"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "nearest",
          });
      }
    );
  }

  async function refreshEverything() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      await Promise.all([
        loadCatalog({
          silent: true,
        }),

        loadOrders({
          silent: true,
        }),

        refreshWallet?.(),
      ]);

      toast.success(
        "Refreshed"
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePurchase() {
    if (
      purchasing
    ) {
      return;
    }

    if (
      !selectedProduct
    ) {
      toast.error(
        "Select a product"
      );

      return;
    }

    if (
      !selectedProduct
        .inStock
    ) {
      toast.error(
        "This product is out of stock"
      );

      return;
    }

    if (
      safeQuantity >
      Number(
        selectedProduct
          .stock ||
          0
      )
    ) {
      toast.error(
        `Only ${selectedProduct.stock} currently available`
      );

      return;
    }

    try {
      setPurchasing(
        true
      );

      const response =
        await socialService
          .buyProduct({
            productId:
              selectedProduct.id,

            quantity:
              safeQuantity,
          });

      await refreshWallet?.();

      if (
        response
          ?.reviewRequired
      ) {
        toast(
          "Purchase is being verified. Do not order the same item again."
        );
      } else {
        toast.success(
          "Purchase completed"
        );
      }

      setSelectedProduct(
        null
      );

      setQuantity(1);

      await Promise.all([
        loadOrders({
          silent: true,
        }),

        loadCatalog({
          silent: true,
        }),
      ]);
    } catch (error) {
      /*
       * Refresh wallet on either success
       * or error so an automatic refund
       * appears immediately.
       */
      try {
        await refreshWallet?.();
      } catch {}

      await loadOrders({
        silent: true,
      });

      toast.error(
        getErrorMessage(
          error
        )
      );
    } finally {
      setPurchasing(
        false
      );
    }
  }

  async function copyText(
    value
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          String(
            value ||
              ""
          )
        );

      toast.success(
        "Copied"
      );
    } catch {
      toast.error(
        "Could not copy"
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] overflow-x-hidden">
      {/* HEADER */}

      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-7">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
            Buy{" "}
            <span className="text-blue-600">
              Socials
            </span>
          </h1>

          <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)] sm:text-base">
            Purchase social
            accounts and digital
            products directly
            from your ChapsSms
            wallet.
          </p>
        </div>

        <button
          type="button"
          onClick={
            refreshEverything
          }
          disabled={
            refreshing
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />
        </button>
      </div>

      {/* SEARCH */}

      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Search products..."
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-blue-500"
          />
        </div>
      </div>

      {/* CATEGORIES */}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 sm:mb-6">
        <button
          type="button"
          onClick={() =>
            setSelectedCategory(
              "all"
            )
          }
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
            selectedCategory ===
            "all"
              ? "bg-blue-600 text-white"
              : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
          }`}
        >
          All
        </button>

        {categories.map(
          (category) => (
            <button
              key={
                category
              }
              type="button"
              onClick={() =>
                setSelectedCategory(
                  category
                )
              }
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                selectedCategory ===
                category
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              }`}
            >
              {category}
            </button>
          )
        )}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* PRODUCTS */}

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--foreground)] sm:text-xl">
                Available
                products
              </h2>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {
                  filteredProducts.length
                }{" "}
                products
              </p>
            </div>
          </div>

          {catalogLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <LoaderCircle
                className="animate-spin text-blue-600"
                size={26}
              />
            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
              <Package
                size={30}
                className="mx-auto text-[var(--muted-foreground)]"
              />

              <p className="mt-3 text-sm font-black text-[var(--foreground)]">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProducts.map(
                (
                  product
                ) => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    selected={
                      selectedProduct
                        ?.id ===
                      product.id
                    }
                    onSelect={
                      selectProduct
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* PURCHASE BOX */}

        <aside
          id="social-purchase-panel"
          className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5 lg:sticky lg:top-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShoppingCart
                size={18}
              />
            </div>

            <div>
              <h2 className="text-base font-black text-[var(--foreground)]">
                Your order
              </h2>

              <p className="text-[11px] text-[var(--muted-foreground)]">
                Pay from your
                ChapsSms wallet
              </p>
            </div>
          </div>

          {!selectedProduct ? (
            <div className="mt-5 rounded-xl bg-[var(--muted)] px-4 py-8 text-center">
              <Users
                size={26}
                className="mx-auto text-[var(--muted-foreground)]"
              />

              <p className="mt-3 text-xs font-bold text-[var(--muted-foreground)]">
                Select a product
                to continue
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                {
                  selectedProduct.category
                }
              </p>

              <p className="mt-1 text-sm font-black text-[var(--foreground)]">
                {
                  selectedProduct.name
                }
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-black text-[var(--foreground)]">
                  Quantity
                </label>

                <div className="flex items-center overflow-hidden rounded-xl border border-[var(--border)]">
                  <button
                    type="button"
                    disabled={
                      purchasing ||
                      safeQuantity <=
                        1
                    }
                    onClick={() =>
                      setQuantity(
                        Math.max(
                          1,
                          safeQuantity -
                            1
                        )
                      )
                    }
                    className="h-11 w-12 text-lg font-black text-[var(--foreground)] disabled:opacity-40"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={
                      selectedProduct.stock
                    }
                    value={
                      quantity
                    }
                    disabled={
                      purchasing
                    }
                    onChange={(
                      event
                    ) =>
                      setQuantity(
                        event
                          .target
                          .value
                      )
                    }
                    className="h-11 min-w-0 flex-1 border-x border-[var(--border)] bg-transparent text-center text-sm font-black text-[var(--foreground)] outline-none"
                  />

                  <button
                    type="button"
                    disabled={
                      purchasing ||
                      safeQuantity >=
                        Number(
                          selectedProduct.stock
                        )
                    }
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          Number(
                            selectedProduct.stock
                          ),
                          safeQuantity +
                            1
                        )
                      )
                    }
                    className="h-11 w-12 text-lg font-black text-[var(--foreground)] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-[var(--muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Unit price
                  </span>

                  <span className="text-xs font-black text-[var(--foreground)]">
                    {formatNaira(
                      selectedProduct.price
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Quantity
                  </span>

                  <span className="text-xs font-black text-[var(--foreground)]">
                    {
                      safeQuantity
                    }
                  </span>
                </div>

                <div className="border-t border-[var(--border)] pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[var(--foreground)]">
                      Total
                    </span>

                    <span className="text-xl font-black text-blue-600">
                      {formatNaira(
                        selectedTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  handlePurchase
                }
                disabled={
                  purchasing ||
                  !selectedProduct
                    .inStock ||
                  safeQuantity >
                    Number(
                      selectedProduct.stock
                    )
                }
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <LoaderCircle
                      className="animate-spin"
                      size={
                        18
                      }
                    />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <ShoppingCart
                      size={
                        18
                      }
                    />
                    Buy now
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ORDER HISTORY */}

      <section className="mt-8 border-t border-[var(--border)] pt-7">
        <div className="mb-4">
          <h2 className="text-lg font-black text-[var(--foreground)] sm:text-xl">
            My social orders
          </h2>

          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Your delivered
            account details and
            purchase history.
          </p>
        </div>

        {ordersLoading ? (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <LoaderCircle
              className="animate-spin text-blue-600"
              size={24}
            />
          </div>
        ) : orders.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <Package
              size={28}
              className="mx-auto text-[var(--muted-foreground)]"
            />

            <p className="mt-3 text-sm font-bold text-[var(--muted-foreground)]">
              No social
              purchases yet
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map(
              (order) => (
                <OrderCard
                  key={
                    order.id
                  }
                  order={
                    order
                  }
                  onCopy={
                    copyText
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Boxes,
  Eye,
  EyeOff,
  LoaderCircle,
  PackagePlus,
  RefreshCw,
  Search,
  Store,
  Warehouse,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  socialService,
} from "@/services/socialService";

function formatNaira(value) {
  return `₦${Number(
    value || 0
  ).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

function providerLabel(value) {
  return String(value) ===
    "sameeha"
    ? "Sameeha"
    : "LoggsPlug";
}

function splitStockCount(
  value
) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) =>
      line.trim()
    )
    .filter(Boolean)
    .length;
}

function VisibilityButton({
  visible,
  disabled = false,
  loading = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={
        disabled || loading
      }
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        visible
          ? "bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-900"
          : "bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900"
      }`}
    >
      {loading ? (
        <LoaderCircle
          size={14}
          className="animate-spin"
        />
      ) : visible ? (
        <Eye size={14} />
      ) : (
        <EyeOff size={14} />
      )}

      {visible
        ? "Visible"
        : "Hidden"}
    </button>
  );
}

export default function AdminSocialsPage() {
  const [
    activeTab,
    setActiveTab,
  ] = useState("catalog");

  const [
    catalog,
    setCatalog,
  ] = useState({
    categories: [],
    products: [],
  });

  const [
    houseProducts,
    setHouseProducts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    visibilityBusy,
    setVisibilityBusy,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    providerFilter,
    setProviderFilter,
  ] = useState("all");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    createForm,
    setCreateForm,
  ] = useState({
    name: "",
    category: "",
    costPrice: "",
    sellingPrice: "",
    stockText: "",
  });

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    editingHouse,
    setEditingHouse,
  ] = useState({});

  const [
    restockText,
    setRestockText,
  ] = useState({});

  const [
    houseBusy,
    setHouseBusy,
  ] = useState("");

  const loadEverything =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          const [
            nextCatalog,
            nextHouseProducts,
          ] =
            await Promise.all([
              socialService
                .getAdminCatalog(),

              socialService
                .getHouseProducts(),
            ]);

          setCatalog(
            nextCatalog
          );

          setHouseProducts(
            nextHouseProducts
          );

          setEditingHouse(
            (current) => {
              const next = {
                ...current,
              };

              for (
                const product of
                nextHouseProducts
              ) {
                if (
                  !next[
                    product.id
                  ]
                ) {
                  next[
                    product.id
                  ] = {
                    name:
                      product.name,
                    category:
                      product.category,
                    costPrice:
                      String(
                        product.costPrice ??
                          0
                      ),
                    sellingPrice:
                      String(
                        product.sellingPrice ??
                          0
                      ),
                  };
                }
              }

              return next;
            }
          );
        } catch (error) {
          if (!silent) {
            toast.error(
              error?.message ||
                "Unable to load Buy Socials admin controls"
            );
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      []
    );

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  const visibleCategoryNames =
    useMemo(() => {
      const set =
        new Set(
          catalog.products.map(
            (product) =>
              product.category
          )
        );

      return [
        ...set,
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [catalog.products]);

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return catalog.products.filter(
        (product) => {
          if (
            providerFilter !==
              "all" &&
            product.provider !==
              providerFilter
          ) {
            return false;
          }

          if (
            categoryFilter !==
              "all" &&
            product.category !==
              categoryFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            product.name,
            product.category,
            product.provider,
            product
              .providerProductId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      catalog.products,
      search,
      providerFilter,
      categoryFilter,
    ]);

  const catalogStats =
    useMemo(
      () => ({
        total:
          catalog.products.length,

        visible:
          catalog.products.filter(
            (item) =>
              item.visible
          ).length,

        hidden:
          catalog.products.filter(
            (item) =>
              !item.visible
          ).length,
      }),
      [catalog.products]
    );

  const houseStats =
    useMemo(
      () => ({
        products:
          houseProducts.length,

        available:
          houseProducts.reduce(
            (sum, item) =>
              sum +
              Number(
                item.stock || 0
              ),
            0
          ),

        sold:
          houseProducts.reduce(
            (sum, item) =>
              sum +
              Number(
                item.sold || 0
              ),
            0
          ),
      }),
      [houseProducts]
    );

  async function refreshProviders() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      await socialService
        .refreshCatalog();

      await loadEverything({
        silent: true,
      });

      toast.success(
        "Provider catalog refreshed"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not refresh provider catalog"
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleCategory(
    category
  ) {
    const key =
      `category:${category.provider}:${category.category}`;

    if (visibilityBusy) {
      return;
    }

    try {
      setVisibilityBusy(
        key
      );

      await socialService
        .setVisibility({
          scope:
            "category",
          provider:
            category.provider,
          category:
            category.category,
          visible:
            !category.visible,
        });

      await loadEverything({
        silent: true,
      });

      toast.success(
        `${providerLabel(
          category.provider
        )} ${category.category} ${
          category.visible
            ? "hidden"
            : "shown"
        }`
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not update category visibility"
      );
    } finally {
      setVisibilityBusy(
        ""
      );
    }
  }

  async function toggleProduct(
    product
  ) {
    const key =
      `product:${product.provider}:${product.providerProductId}`;

    if (
      visibilityBusy ||
      product
        .hiddenByCategory
    ) {
      return;
    }

    try {
      setVisibilityBusy(
        key
      );

      await socialService
        .setVisibility({
          scope:
            "product",
          provider:
            product.provider,
          providerProductId:
            product
              .providerProductId,
          visible:
            !product.visible,
        });

      await loadEverything({
        silent: true,
      });

      toast.success(
        `${product.name} ${
          product.visible
            ? "hidden"
            : "shown"
        } on ${providerLabel(
          product.provider
        )}`
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not update product visibility"
      );
    } finally {
      setVisibilityBusy(
        ""
      );
    }
  }

  function updateCreateField(
    name,
    value
  ) {
    setCreateForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function createHouseProduct(
    event
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    if (
      !createForm.name.trim() ||
      !createForm
        .category
        .trim()
    ) {
      toast.error(
        "Enter a product name and category"
      );
      return;
    }

    const sellingPrice =
      Number(
        createForm.sellingPrice
      );

    if (
      !Number.isFinite(
        sellingPrice
      ) ||
      sellingPrice <= 0
    ) {
      toast.error(
        "Enter a valid selling price"
      );
      return;
    }

    try {
      setCreating(true);

      const response =
        await socialService
          .createHouseProduct({
            name:
              createForm
                .name
                .trim(),

            category:
              createForm
                .category
                .trim(),

            costPrice:
              Number(
                createForm
                  .costPrice ||
                  0
              ),

            sellingPrice,

            stockText:
              createForm
                .stockText,
          });

      setCreateForm({
        name: "",
        category: "",
        costPrice: "",
        sellingPrice: "",
        stockText: "",
      });

      await loadEverything({
        silent: true,
      });

      toast.success(
        response?.message ||
          "House stock product created"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not create house stock product"
      );
    } finally {
      setCreating(false);
    }
  }

  function updateHouseEdit(
    productId,
    field,
    value
  ) {
    setEditingHouse(
      (current) => ({
        ...current,

        [productId]: {
          ...(current[
            productId
          ] || {}),

          [field]: value,
        },
      })
    );
  }

  async function saveHouseProduct(
    product
  ) {
    if (houseBusy) {
      return;
    }

    const form =
      editingHouse[
        product.id
      ] || {};

    try {
      setHouseBusy(
        `save:${product.id}`
      );

      await socialService
        .updateHouseProduct(
          product.id,
          {
            name:
              String(
                form.name ||
                  product.name
              ).trim(),

            category:
              String(
                form.category ||
                  product.category
              ).trim(),

            costPrice:
              Number(
                form.costPrice ??
                  product.costPrice ??
                  0
              ),

            sellingPrice:
              Number(
                form.sellingPrice ??
                  product.sellingPrice
              ),
          }
        );

      await loadEverything({
        silent: true,
      });

      toast.success(
        "House product updated"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not update house product"
      );
    } finally {
      setHouseBusy("");
    }
  }

  async function toggleHouseProduct(
    product
  ) {
    if (houseBusy) {
      return;
    }

    try {
      setHouseBusy(
        `toggle:${product.id}`
      );

      await socialService
        .updateHouseProduct(
          product.id,
          {
            isActive:
              !product.isActive,
          }
        );

      await loadEverything({
        silent: true,
      });

      toast.success(
        product.isActive
          ? "House product hidden"
          : "House product shown"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not update house product visibility"
      );
    } finally {
      setHouseBusy("");
    }
  }

  async function addStock(
    product
  ) {
    if (houseBusy) {
      return;
    }

    const text =
      String(
        restockText[
          product.id
        ] || ""
      );

    if (!text.trim()) {
      toast.error(
        "Paste at least one stock item"
      );
      return;
    }

    try {
      setHouseBusy(
        `stock:${product.id}`
      );

      const response =
        await socialService
          .addHouseStock(
            product.id,
            text
          );

      setRestockText(
        (current) => ({
          ...current,
          [product.id]: "",
        })
      );

      await loadEverything({
        silent: true,
      });

      toast.success(
        response?.message ||
          "Stock added"
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not add stock"
      );
    } finally {
      setHouseBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Buy Socials
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
            Social catalog control
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
            Control Sameeha and LoggsPlug independently, or sell your own uploaded inventory as House Stock.
          </p>
        </div>

        <button
          type="button"
          onClick={
            refreshProviders
          }
          disabled={
            refreshing
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh providers
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "catalog"
            )
          }
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
            activeTab ===
            "catalog"
              ? "bg-blue-600 text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Store size={17} />
          Catalog visibility
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "house"
            )
          }
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
            activeTab ===
            "house"
              ? "bg-blue-600 text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Warehouse
            size={17}
          />
          House Stock
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]">
          <LoaderCircle
            className="animate-spin text-blue-600"
            size={30}
          />
        </div>
      ) : activeTab ===
        "catalog" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                "Provider products",
                catalogStats.total,
              ],
              [
                "Visible",
                catalogStats.visible,
              ],
              [
                "Hidden",
                catalogStats.hidden,
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
                    {Number(
                      value || 0
                    ).toLocaleString()}
                  </p>
                </div>
              )
            )}
          </div>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                Category visibility
              </h2>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                A category switch affects only that provider. Hiding a LoggsPlug category does not hide the Sameeha category.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.categories.map(
                (category) => {
                  const key =
                    `category:${category.provider}:${category.category}`;

                  return (
                    <div
                      key={
                        category.id
                      }
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--foreground)]">
                          {category.category}
                        </p>

                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {providerLabel(
                            category.provider
                          )}{" "}
                          •{" "}
                          {category.productCount}{" "}
                          products
                        </p>
                      </div>

                      <VisibilityButton
                        visible={
                          category.visible
                        }
                        loading={
                          visibilityBusy ===
                          key
                        }
                        disabled={
                          Boolean(
                            visibilityBusy &&
                              visibilityBusy !==
                                key
                          )
                        }
                        onClick={() =>
                          toggleCategory(
                            category
                          )
                        }
                      />
                    </div>
                  );
                }
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="border-b border-[var(--border)] p-5 sm:p-6">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                Product visibility
              </h2>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Each provider product has its own switch. This is where you can hide LoggsPlug TextNow and keep Sameeha TextNow available.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="relative md:col-span-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />

                  <input
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search product..."
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={
                    providerFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setProviderFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                >
                  <option value="all">
                    All providers
                  </option>
                  <option value="sameeha">
                    Sameeha
                  </option>
                  <option value="loggsplug">
                    LoggsPlug
                  </option>
                </select>

                <select
                  value={
                    categoryFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setCategoryFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                >
                  <option value="all">
                    All categories
                  </option>

                  {visibleCategoryNames.map(
                    (category) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {filteredProducts.length ===
            0 ? (
              <div className="p-10 text-center text-sm font-semibold text-[var(--muted-foreground)]">
                No products match your filters.
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-4 md:hidden">
                  {filteredProducts.map(
                    (product) => {
                      const key =
                        `product:${product.provider}:${product.providerProductId}`;

                      return (
                        <article
                          key={
                            product.id
                          }
                          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                                {providerLabel(
                                  product.provider
                                )}{" "}
                                •{" "}
                                {product.category}
                              </p>

                              <h3 className="mt-1 text-sm font-black text-[var(--foreground)]">
                                {product.name}
                              </h3>

                              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                                Cost{" "}
                                {formatNaira(
                                  product.providerCostNgn
                                )}{" "}
                                • Stock{" "}
                                {Number(
                                  product.stock ||
                                    0
                                ).toLocaleString()}
                              </p>
                            </div>

                            <VisibilityButton
                              visible={
                                product.visible
                              }
                              loading={
                                visibilityBusy ===
                                key
                              }
                              disabled={
                                product.hiddenByCategory ||
                                Boolean(
                                  visibilityBusy &&
                                    visibilityBusy !==
                                      key
                                )
                              }
                              onClick={() =>
                                toggleProduct(
                                  product
                                )
                              }
                            />
                          </div>

                          {product.hiddenByCategory && (
                            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              Hidden by its category switch.
                            </p>
                          )}
                        </article>
                      );
                    }
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-[var(--muted)]">
                      <tr className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                        <th className="px-5 py-4">
                          Product
                        </th>
                        <th className="px-5 py-4">
                          Provider
                        </th>
                        <th className="px-5 py-4">
                          Cost
                        </th>
                        <th className="px-5 py-4">
                          Stock
                        </th>
                        <th className="px-5 py-4 text-right">
                          Visibility
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredProducts.map(
                        (product) => {
                          const key =
                            `product:${product.provider}:${product.providerProductId}`;

                          return (
                            <tr
                              key={
                                product.id
                              }
                            >
                              <td className="px-5 py-4">
                                <p className="font-black text-[var(--foreground)]">
                                  {product.name}
                                </p>

                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                  {product.category}{" "}
                                  • ID{" "}
                                  {product.providerProductId}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-sm font-bold text-[var(--foreground)]">
                                {providerLabel(
                                  product.provider
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm font-black text-[var(--foreground)]">
                                {formatNaira(
                                  product.providerCostNgn
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <p className={`text-sm font-black ${
                                  product.inStock
                                    ? "text-green-600"
                                    : "text-red-500"
                                }`}>
                                  {Number(
                                    product.stock ||
                                      0
                                  ).toLocaleString()}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <VisibilityButton
                                  visible={
                                    product.visible
                                  }
                                  loading={
                                    visibilityBusy ===
                                    key
                                  }
                                  disabled={
                                    product.hiddenByCategory ||
                                    Boolean(
                                      visibilityBusy &&
                                        visibilityBusy !==
                                          key
                                    )
                                  }
                                  onClick={() =>
                                    toggleProduct(
                                      product
                                    )
                                  }
                                />

                                {product.hiddenByCategory && (
                                  <p className="mt-2 text-[10px] font-bold text-amber-600">
                                    Category hidden
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                "House products",
                houseStats.products,
              ],
              [
                "Available stock",
                houseStats.available,
              ],
              [
                "Sold",
                houseStats.sold,
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
                    {Number(
                      value || 0
                    ).toLocaleString()}
                  </p>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={
              createHouseProduct
            }
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                <PackagePlus
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-xl font-black text-[var(--foreground)]">
                  Create House Stock product
                </h2>

                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Use this when you buy accounts/logs elsewhere in bulk and want ChapSms to deliver them automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Product name
                </label>

                <input
                  value={
                    createForm.name
                  }
                  onChange={(
                    event
                  ) =>
                    updateCreateField(
                      "name",
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. TextNow aged account"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Category
                </label>

                <input
                  value={
                    createForm.category
                  }
                  onChange={(
                    event
                  ) =>
                    updateCreateField(
                      "category",
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. TextNow"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Your cost per item
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    createForm.costPrice
                  }
                  onChange={(
                    event
                  ) =>
                    updateCreateField(
                      "costPrice",
                      event.target
                        .value
                    )
                  }
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Customer selling price
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={
                    createForm.sellingPrice
                  }
                  onChange={(
                    event
                  ) =>
                    updateCreateField(
                      "sellingPrice",
                      event.target
                        .value
                    )
                  }
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    Initial stock
                  </label>

                  <span className="text-xs font-bold text-[var(--muted-foreground)]">
                    {splitStockCount(
                      createForm.stockText
                    )}{" "}
                    lines
                  </span>
                </div>

                <textarea
                  value={
                    createForm.stockText
                  }
                  onChange={(
                    event
                  ) =>
                    updateCreateField(
                      "stockText",
                      event.target
                        .value
                    )
                  }
                  rows={8}
                  placeholder={"Paste one deliverable account/log per line.\nExample:\nemail@example.com|password|extra details\nanother@example.com|password|extra details"}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                creating
              }
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? (
                <LoaderCircle
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <PackagePlus
                  size={17}
                />
              )}

              Create product
            </button>
          </form>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                House Stock inventory
              </h2>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Stock lines are private. Customers only receive the exact items allocated to their completed order.
              </p>
            </div>

            {houseProducts.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
                <Boxes
                  size={32}
                  className="mx-auto text-[var(--muted-foreground)]"
                />

                <p className="mt-3 font-black text-[var(--foreground)]">
                  No House Stock products yet
                </p>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {houseProducts.map(
                  (product) => {
                    const form =
                      editingHouse[
                        product.id
                      ] || {
                        name:
                          product.name,
                        category:
                          product.category,
                        costPrice:
                          String(
                            product.costPrice ??
                              0
                          ),
                        sellingPrice:
                          String(
                            product.sellingPrice ??
                              0
                          ),
                      };

                    const saving =
                      houseBusy ===
                      `save:${product.id}`;

                    const toggling =
                      houseBusy ===
                      `toggle:${product.id}`;

                    const stocking =
                      houseBusy ===
                      `stock:${product.id}`;

                    return (
                      <article
                        key={
                          product.id
                        }
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600">
                              House Stock
                            </p>

                            <h3 className="mt-1 text-lg font-black text-[var(--foreground)]">
                              {product.name}
                            </h3>

                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {product.category}
                            </p>
                          </div>

                          <VisibilityButton
                            visible={
                              product.isActive
                            }
                            loading={
                              toggling
                            }
                            disabled={
                              Boolean(
                                houseBusy &&
                                  !toggling
                              )
                            }
                            onClick={() =>
                              toggleHouseProduct(
                                product
                              )
                            }
                          />
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-[var(--muted)] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                              Available
                            </p>

                            <p className="mt-1 text-xl font-black text-green-600">
                              {Number(
                                product.stock ||
                                  0
                              ).toLocaleString()}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[var(--muted)] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                              Sold
                            </p>

                            <p className="mt-1 text-xl font-black text-[var(--foreground)]">
                              {Number(
                                product.sold ||
                                  0
                              ).toLocaleString()}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[var(--muted)] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                              Reserved
                            </p>

                            <p className="mt-1 text-xl font-black text-amber-600">
                              {Number(
                                product.reserved ||
                                  0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <input
                            value={
                              form.name
                            }
                            onChange={(
                              event
                            ) =>
                              updateHouseEdit(
                                product.id,
                                "name",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Product name"
                            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                          />

                          <input
                            value={
                              form.category
                            }
                            onChange={(
                              event
                            ) =>
                              updateHouseEdit(
                                product.id,
                                "category",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Category"
                            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                          />

                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                              Cost
                            </p>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                form.costPrice
                              }
                              onChange={(
                                event
                              ) =>
                                updateHouseEdit(
                                  product.id,
                                  "costPrice",
                                  event.target
                                    .value
                                )
                              }
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                              Selling price
                            </p>

                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={
                                form.sellingPrice
                              }
                              onChange={(
                                event
                              ) =>
                                updateHouseEdit(
                                  product.id,
                                  "sellingPrice",
                                  event.target
                                    .value
                                )
                              }
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--muted)] px-3 py-2 text-xs">
                          <span className="font-semibold text-[var(--muted-foreground)]">
                            Current margin
                          </span>

                          <span className="font-black text-[var(--foreground)]">
                            {formatNaira(
                              Number(
                                form.sellingPrice ||
                                  0
                              ) -
                                Number(
                                  form.costPrice ||
                                    0
                                )
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            saveHouseProduct(
                              product
                            )
                          }
                          disabled={
                            Boolean(
                              houseBusy
                            )
                          }
                          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving && (
                            <LoaderCircle
                              className="animate-spin"
                              size={14}
                            />
                          )}
                          Save details
                        </button>

                        <div className="mt-5 border-t border-[var(--border)] pt-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-[var(--foreground)]">
                              Add more stock
                            </p>

                            <p className="text-xs font-bold text-[var(--muted-foreground)]">
                              {splitStockCount(
                                restockText[
                                  product.id
                                ]
                              )}{" "}
                              lines
                            </p>
                          </div>

                          <textarea
                            value={
                              restockText[
                                product.id
                              ] || ""
                            }
                            onChange={(
                              event
                            ) =>
                              setRestockText(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [product.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            rows={5}
                            placeholder="Paste one new account/log per line..."
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              addStock(
                                product
                              )
                            }
                            disabled={
                              Boolean(
                                houseBusy
                              )
                            }
                            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-xs font-black text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
                          >
                            {stocking ? (
                              <LoaderCircle
                                className="animate-spin"
                                size={14}
                              />
                            ) : (
                              <PackagePlus
                                size={14}
                              />
                            )}

                            Add stock
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Calculator,
  Check,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Button from "@/components/ui/Button";
import { useCatalog } from "@/hooks/useCatalog";
import { adminPricingService } from "@/services/adminPricingService";

const INITIAL_FORM = {
  server: "server1",
  country: "",
  service: "",
  operator: "",
  pricingMode: "fixed",
  fixedSellingPrice: "",
  markupPercent: "",
  fixedMarkup: "",
  minimumSellingPrice: "",
  notes: "",
  isActive: true,
};

function toPrimitive(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    return String(
      value.id ??
      value.code ??
      value.value ??
      value.operator ??
      value.provider_id ??
      ""
    );
  }

  return String(value);
}

function getCountryId(country) {
  return toPrimitive(
    country?.id ??
    country?.code ??
    country?.country
  );
}

function getCountryName(country) {
  return String(
    country?.eng ??
    country?.name ??
    country?.title ??
    country?.label ??
    country?.code ??
    country?.id ??
    "Unknown country"
  );
}

function getServiceId(service) {
  return toPrimitive(
    service?.id ??
    service?.code ??
    service?.service
  );
}

function getServiceName(service) {
  return String(
    service?.name ??
    service?.serviceName ??
    service?.title ??
    service?.label ??
    service?.code ??
    service?.id ??
    "Unknown service"
  );
}

function getOperatorId(operator) {
  return toPrimitive(
    operator?.id ??
    operator?.operator ??
    operator?.providerId
  );
}

function formatNaira(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₦0";
  }

  return `₦${number.toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatProviderPrice(
  price,
  currency
) {
  const number = Number(price);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (
    String(currency).toUpperCase() ===
    "USD"
  ) {
    return `$${number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }
    )}`;
  }

  return `${number.toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 2,
    }
  )} ${currency || ""}`.trim();
}



function SearchablePicker({
  value,
  options,
  onChange,
  getOptionId,
  getOptionLabel,
  placeholder,
  searchPlaceholder,
  disabled = false,
  emptyText = "No matches found",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () =>
      options.find(
        (option) =>
          String(getOptionId(option)) === String(value)
      ) || null,
    [options, value, getOptionId]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const id = String(getOptionId(option) || "").toLowerCase();
      const label = String(getOptionLabel(option) || "").toLowerCase();

      return (
        label.includes(normalizedQuery) ||
        id.includes(normalizedQuery)
      );
    });
  }, [options, query, getOptionId, getOptionLabel]);

  useEffect(() => {
    function handleOutside(event) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () =>
      document.removeEventListener("pointerdown", handleOutside);
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-left text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-blue-950/40"
      >
        <span
          className={`truncate ${
            selectedOption
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          {selectedOption
            ? getOptionLabel(selectedOption)
            : placeholder}
        </span>

        <ChevronDown
          size={17}
          className={`shrink-0 text-[var(--muted-foreground)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="border-b border-[var(--border)] p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const optionId = String(getOptionId(option) || "");
                const selected = optionId === String(value || "");

                return (
                  <button
                    key={optionId}
                    type="button"
                    onClick={() => {
                      onChange(optionId);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {getOptionLabel(option)}
                    </span>
                    {selected && <Check size={16} className="shrink-0" />}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-sm font-semibold text-[var(--muted-foreground)]">
                {emptyText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingRuleForm({
  editingRule = null,
  onSaved,
  onCancelEdit,
}) {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [operators, setOperators] =
    useState([]);

  const [
    operatorsLoading,
    setOperatorsLoading,
  ] = useState(false);

  const [
    operatorsError,
    setOperatorsError,
  ] = useState("");

  const [
    operatorReloadKey,
    setOperatorReloadKey,
  ] = useState(0);

  const [preview, setPreview] =
    useState(null);

  const [previewing, setPreviewing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const operatorRequestRef =
    useRef(0);

  const {
    countries,
    services,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog(form.server);

  useEffect(() => {
    if (!editingRule) {
      return;
    }

    setForm({
      server:
        editingRule.server ||
        "server1",
      country:
        editingRule.country ||
        "",
      service:
        editingRule.service ||
        "",
      operator:
        editingRule.operator ||
        "",
      pricingMode:
        editingRule.pricingMode ||
        "fixed",
      fixedSellingPrice:
        editingRule.fixedSellingPrice ||
        "",
      markupPercent:
        editingRule.markupPercent ||
        "",
      fixedMarkup:
        editingRule.fixedMarkup ||
        "",
      minimumSellingPrice:
        editingRule.minimumSellingPrice ||
        "",
      notes:
        editingRule.notes ||
        "",
      isActive:
        editingRule.isActive !== false,
    });

    setPreview(null);
  }, [editingRule]);

  useEffect(() => {
    const requestId =
      ++operatorRequestRef.current;

    setOperators([]);
    setOperatorsError("");
    setPreview(null);

    if (
      !form.country ||
      !form.service
    ) {
      setOperatorsLoading(false);
      return undefined;
    }

    setOperatorsLoading(true);

    adminPricingService
      .getOperators({
        server: form.server,
        country: form.country,
        service: form.service,
      })
      .then((response) => {
        if (
          requestId !==
          operatorRequestRef.current
        ) {
          return;
        }

        const list =
          Array.isArray(
            response?.operators
          )
            ? response.operators
            : [];

        setOperators(list);

        setForm((current) => {
          const operatorExists =
            list.some(
              (item) =>
                getOperatorId(item) ===
                String(
                  current.operator
                )
            );

          if (operatorExists) {
            return current;
          }

          return {
            ...current,
            operator: "",
          };
        });
      })
      .catch((error) => {
        if (
          requestId !==
          operatorRequestRef.current
        ) {
          return;
        }

        setOperators([]);
        setForm((current) => ({
          ...current,
          operator: "",
        }));

        setOperatorsError(
          error?.message ||
          "Unable to load operators"
        );
      })
      .finally(() => {
        if (
          requestId ===
          operatorRequestRef.current
        ) {
          setOperatorsLoading(false);
        }
      });

    return () => {
      operatorRequestRef.current += 1;
    };
  }, [
    form.server,
    form.country,
    form.service,
    operatorReloadKey,
  ]);

  const selectedCountry =
    useMemo(
      () =>
        countries.find(
          (country) =>
            getCountryId(
              country
            ) ===
            String(form.country)
        ) || null,
      [
        countries,
        form.country,
      ]
    );

  const selectedService =
    useMemo(
      () =>
        services.find(
          (service) =>
            getServiceId(
              service
            ) ===
            String(form.service)
        ) || null,
      [
        services,
        form.service,
      ]
    );

  const selectedOperator =
    useMemo(
      () =>
        operators.find(
          (operator) =>
            getOperatorId(
              operator
            ) ===
            String(form.operator)
        ) || null,
      [
        operators,
        form.operator,
      ]
    );

  function updateField(
    name,
    value
  ) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setPreview(null);
  }

  function handleServerChange(
    server
  ) {
    setForm({
      ...INITIAL_FORM,
      server,
    });

    setOperators([]);
    setOperatorsError("");
    setPreview(null);
  }

  function handleCountryChange(
    country
  ) {
    setForm((current) => ({
      ...current,
      country,
      service: "",
      operator: "",
    }));

    setOperators([]);
    setOperatorsError("");
    setPreview(null);
  }

  function handleServiceChange(
    service
  ) {
    setForm((current) => ({
      ...current,
      service,
      operator: "",
    }));

    setOperators([]);
    setOperatorsError("");
    setPreview(null);
  }

  function buildPayload() {
    if (!form.operator) {
      throw new Error(
        "Choose an operator"
      );
    }

    return {
      ...form,
      countryName:
        getCountryName(
          selectedCountry
        ) ||
        editingRule?.countryName ||
        "",
      serviceName:
        getServiceName(
          selectedService
        ) ||
        editingRule?.serviceName ||
        "",
    };
  }

  async function handlePreview() {
    try {
      setPreviewing(true);

      const response =
        await adminPricingService
          .previewPricing(
            buildPayload()
          );

      setPreview(
        response?.preview ||
        null
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "Unable to preview this pricing rule"
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload =
        buildPayload();

      const response =
        editingRule?.id
          ? await adminPricingService
              .updateRule(
                editingRule.id,
                payload
              )
          : await adminPricingService
              .saveRule(
                payload
              );

      toast.success(
        response?.message ||
        "Pricing rule saved successfully"
      );

      setForm((current) => ({
        ...INITIAL_FORM,
        server: current.server,
      }));

      setOperators([]);
      setOperatorsError("");
      setPreview(null);

      onSaved?.(
        response?.rule ||
        null
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "Unable to save pricing rule"
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950/40 disabled:cursor-not-allowed disabled:opacity-60";

  const formReady =
    Boolean(
      form.country &&
      form.service &&
      form.operator
    );

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            {editingRule
              ? "Edit rule"
              : "New rule"}
          </p>

          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">
            Set ChapsSmS selling price
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Choose the exact operator ChapsSmS must purchase from. Its live cost and stock are loaded directly from the selected server.
          </p>
        </div>

        {editingRule && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setForm(
                INITIAL_FORM
              );
              setOperators([]);
              setPreview(null);
              onCancelEdit?.();
            }}
            className="gap-2"
          >
            <X size={16} />
            Cancel edit
          </Button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6"
      >
        <div>
          <label className="text-sm font-bold text-[var(--foreground)]">
            Server
          </label>

          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              [
                "server1",
                "Server 1",
                "SMSBower",
              ],
              [
                "server2",
                "Server 2",
                "BenOTP",
              ],
            ].map(
              ([
                value,
                label,
                provider,
              ]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    handleServerChange(
                      value
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    form.server ===
                    value
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-950/60"
                      : "border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <p className="text-sm font-black text-[var(--foreground)]">
                    {label}
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {provider}
                  </p>
                </button>
              )
            )}
          </div>
        </div>

        {catalogError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-bold">
              Catalog could not be loaded.
            </p>

            <p className="mt-1">
              {catalogError}
            </p>

            <button
              type="button"
              onClick={
                reloadCatalog
              }
              className="mt-3 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Country
            </label>

            <SearchablePicker
              value={form.country}
              options={countries}
              onChange={handleCountryChange}
              getOptionId={getCountryId}
              getOptionLabel={getCountryName}
              placeholder={
                catalogLoading
                  ? "Loading countries..."
                  : "Choose a country"
              }
              searchPlaceholder="Search country..."
              disabled={catalogLoading}
              emptyText="No country matches your search"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Service
            </label>

            <SearchablePicker
              value={form.service}
              options={services}
              onChange={handleServiceChange}
              getOptionId={getServiceId}
              getOptionLabel={getServiceName}
              placeholder={
                !form.country
                  ? "Select a country first"
                  : catalogLoading
                    ? "Loading services..."
                    : "Choose a service"
              }
              searchPlaceholder="Search service..."
              disabled={
                catalogLoading ||
                !form.country
              }
              emptyText="No service matches your search"
            />
          </div>
        </div>

        <div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="text-sm font-bold text-[var(--foreground)]">
                Choose an operator
              </label>

              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                The selected operator is saved with this rule and will be used for customer purchases. It will not be chosen randomly.
              </p>
            </div>

            {form.country &&
              form.service && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        operator:
                          "",
                      })
                    );

                    setOperatorReloadKey(
                      (current) =>
                        current + 1
                    );
                  }}
                  disabled={
                    operatorsLoading
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={
                      operatorsLoading
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Refresh operators
                </button>
              )}
          </div>

          {!form.country ||
          !form.service ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
              Select a country and service to load available operators.
            </div>
          ) : operatorsLoading ? (
            <div className="mt-3 flex min-h-28 items-center justify-center gap-3 rounded-2xl border border-[var(--border)] text-sm font-semibold text-[var(--muted-foreground)]">
              <LoaderCircle
                size={20}
                className="animate-spin"
              />
              Loading live operators, stock and prices...
            </div>
          ) : operatorsError ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-bold">
                Operators could not be loaded.
              </p>

              <p className="mt-1">
                {operatorsError}
              </p>
            </div>
          ) : operators.length ===
            0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
              No operator currently has stock for this selection.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {operators.map(
                (operator) => {
                  const operatorId =
                    getOperatorId(
                      operator
                    );

                  const active =
                    String(
                      form.operator
                    ) ===
                    operatorId;

                  return (
                    <button
                      key={
                        operatorId
                      }
                      type="button"
                      onClick={() =>
                        updateField(
                          "operator",
                          operatorId
                        )
                      }
                      className={`relative grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-950/60"
                          : "border-[var(--border)] hover:border-blue-300 hover:bg-[var(--muted)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              active
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {active && (
                              <Check
                                size={13}
                              />
                            )}
                          </span>

                          <p className="truncate font-black text-[var(--foreground)]">
                            {operator.name ||
                              `Operator ${operatorId}`}
                          </p>
                        </div>

                        <p className="mt-2 pl-7 text-xs font-semibold text-[var(--muted-foreground)]">
                          {Number(
                            operator.stock ||
                            0
                          ).toLocaleString()}{" "}
                          in stock
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-[var(--foreground)]">
                          {formatProviderPrice(
                            operator.price,
                            operator.currency
                          )}
                        </p>

                        <p className="mt-1 text-xs font-bold text-blue-600">
                          {formatNaira(
                            operator.priceNgn
                          )}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {selectedOperator && (
            <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <span className="font-black">
                Selected:
              </span>{" "}
              {selectedOperator.name ||
                `Operator ${form.operator}`}{" "}
              ·{" "}
              {Number(
                selectedOperator.stock ||
                0
              ).toLocaleString()}{" "}
              in stock ·{" "}
              {formatNaira(
                selectedOperator.priceNgn
              )}{" "}
              provider cost
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--foreground)]">
            Pricing mode
          </label>

          <select
            value={
              form.pricingMode
            }
            onChange={(event) =>
              updateField(
                "pricingMode",
                event.target.value
              )
            }
            className={`${fieldClass} mt-2`}
          >
            <option value="fixed">
              Fixed selling price
            </option>

            <option value="percentage">
              Percentage markup
            </option>

            <option value="cost_plus">
              Provider cost + fixed markup
            </option>
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {form.pricingMode ===
            "fixed" && (
            <div>
              <label className="text-sm font-bold text-[var(--foreground)]">
                Selling price (₦)
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                value={
                  form.fixedSellingPrice
                }
                onChange={(event) =>
                  updateField(
                    "fixedSellingPrice",
                    event.target.value
                  )
                }
                placeholder="1000"
                className={`${fieldClass} mt-2`}
                required
              />
            </div>
          )}

          {form.pricingMode ===
            "percentage" && (
            <div>
              <label className="text-sm font-bold text-[var(--foreground)]">
                Markup percentage (%)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.markupPercent
                }
                onChange={(event) =>
                  updateField(
                    "markupPercent",
                    event.target.value
                  )
                }
                placeholder="25"
                className={`${fieldClass} mt-2`}
              />
            </div>
          )}

          {form.pricingMode ===
            "cost_plus" && (
            <div>
              <label className="text-sm font-bold text-[var(--foreground)]">
                Fixed markup (₦)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.fixedMarkup
                }
                onChange={(event) =>
                  updateField(
                    "fixedMarkup",
                    event.target.value
                  )
                }
                placeholder="250"
                className={`${fieldClass} mt-2`}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Minimum selling price (₦)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.minimumSellingPrice
              }
              onChange={(event) =>
                updateField(
                  "minimumSellingPrice",
                  event.target.value
                )
              }
              placeholder="0"
              className={`${fieldClass} mt-2`}
            />
          </div>

          <div className="flex items-end">
            <label className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={
                  form.isActive
                }
                onChange={(event) =>
                  updateField(
                    "isActive",
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />
              Rule is active
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--foreground)]">
            Admin notes
          </label>

          <textarea
            value={form.notes}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            rows={3}
            maxLength={500}
            placeholder="Optional internal note about this price..."
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950/40"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={
              handlePreview
            }
            disabled={
              previewing ||
              saving ||
              catalogLoading ||
              operatorsLoading ||
              !formReady
            }
            className="gap-2"
          >
            {previewing ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Calculator
                size={18}
              />
            )}

            {previewing
              ? "Checking live cost..."
              : "Preview price"}
          </Button>

          <Button
            type="submit"
            disabled={
              saving ||
              previewing ||
              catalogLoading ||
              operatorsLoading ||
              !formReady
            }
            className="gap-2"
          >
            {saving ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            {saving
              ? "Saving..."
              : editingRule
                ? "Update pricing rule"
                : "Save pricing rule"}
          </Button>
        </div>
      </form>

      {preview && (
        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                Live price preview
              </p>

              <p className="mt-1 text-sm text-blue-700/80 dark:text-blue-300/80">
                Operator{" "}
                {preview.operator ||
                  form.operator}{" "}
                ·{" "}
                {preview.stock > 0
                  ? `${Number(
                      preview.stock
                    ).toLocaleString()} numbers available`
                  : "Availability checked again during purchase"}
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-300">
              {preview.server ===
              "server1"
                ? "Server 1"
                : "Server 2"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[var(--card)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Provider cost
              </p>

              <p className="mt-2 text-xl font-black text-[var(--foreground)]">
                {formatNaira(
                  preview.providerCostNgn
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {preview.providerCost}{" "}
                {preview.providerCurrency}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[var(--card)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                ChapsSmS price
              </p>

              <p className="mt-2 text-xl font-black text-blue-600">
                {formatNaira(
                  preview.sellingPrice
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[var(--card)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Expected profit
              </p>

              <p className="mt-2 text-xl font-black text-green-600">
                {formatNaira(
                  preview.profit
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  Hash,
  LoaderCircle,
  MessageSquareText,
  Phone,
  RefreshCw,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";

import { useCatalog } from "@/hooks/useCatalog";
import { useOrders } from "@/hooks/useOrders";
import { useWallet } from "@/hooks/useWallet";
import { catalogService } from "@/services/catalogService";
import { orderService } from "@/services/orderService";
import {
  trackNumberPurchased,
} from "@/lib/tiktokEvents";

import SearchableCountrySelect from "@/components/dashboard/SearchableCountrySelect";
import SearchableServiceSelect from "@/components/dashboard/SearchableServiceSelect";
import Button from "@/components/ui/Button";
import CountdownTimer from "@/components/ui/CountdownTimer";

const ACTIVE_ORDER_KEY = "chapsms-active-order";
const POLLING_INTERVAL_MS = 5000;
const MAX_POLLING_ATTEMPTS = 240;

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatName(value) {
  if (!value) return "Unknown";

  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getOrderId(order) {
  return order?._id || order?.id || "";
}


function getChapsSmsMessage(
  value,
  fallback = "ChapsSms could not complete this request. Please try again."
) {
  const code = String(
    typeof value === "object"
      ? value?.code || value?.response?.data?.code || ""
      : ""
  )
    .trim()
    .toUpperCase();

  const messages = {
    NO_PRICE:
      "ChapsSms does not currently have a live price for this selection. Try another server or service.",
    NO_NUMBERS:
      "ChapsSms does not currently have numbers available for this selection. Try another server or service.",
    NO_STOCK:
      "ChapsSms does not currently have numbers available for this selection.",
    INVALID_COUNTRY:
      "This country is not currently available on ChapsSms.",
    INVALID_SERVICE:
      "This service is not currently available on ChapsSms.",
    INVALID_PRICE:
      "ChapsSms could not retrieve a valid live price right now. Please try again.",
    INVALID_PRICE_RESPONSE:
      "ChapsSms could not retrieve a live price right now. Please try again.",
    INSUFFICIENT_WALLET_BALANCE:
      "Your ChapsSms wallet balance is too low for this purchase.",
    UNSAFE_PAYMENT_CONFIGURATION:
      "Number purchasing is temporarily unavailable on ChapsSms.",
    CATALOG_LOAD_FAILED:
      "ChapsSms could not load the available countries and services. Please try again.",
    PRICE_LOOKUP_FAILED:
      "ChapsSms could not retrieve a live price right now. Please try again.",
    ORDER_CREATION_FAILED:
      "ChapsSms could not purchase this number right now.",
    ORDER_CANCELLATION_FAILED:
      "ChapsSms could not cancel this order right now.",
  };

  if (messages[code]) {
    return messages[code];
  }

  const message = String(
    typeof value === "string"
      ? value
      : value?.message || value?.response?.data?.message || ""
  ).trim();

  // Only trust customer-facing messages that have already been branded
  // by the ChapsSms backend. Everything else is replaced with the fallback.
  if (/chapssms/i.test(message)) {
    return message;
  }

  return fallback;
}

export default function BuyNumberPage() {
  const { createOrder } = useOrders();

  const {
    updateWalletBalance,
    refreshWallet,
  } = useWallet();

  const [selectedServer, setSelectedServer] = useState("server1");

  const {
    countries,
    services,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog(selectedServer);

  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [livePrice, setLivePrice] = useState(null);
  const [liveStock, setLiveStock] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [currentOrder, setCurrentOrder] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [restoringOrder, setRestoringOrder] = useState(true);

  const pollingInProgress = useRef(false);
  const pollingAttempts = useRef(0);

  const selectedCountry = useMemo(() => {
    return (
      countries.find(
        (country) => String(country.id) === String(selectedCountryCode)
      ) || null
    );
  }, [countries, selectedCountryCode]);

  const availableServices = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    return services;
  }, [selectedCountry, services]);

  const selectedService = useMemo(() => {
    return (
      availableServices.find(
        (service) =>
          String(
            service.id ||
              service.code ||
              service.service ||
              ""
          ) === String(selectedServiceId)
      ) || null
    );
  }, [availableServices, selectedServiceId]);

  const orderStatus = String(
    currentOrder?.status || "waiting"
  ).toLowerCase();

  const otpCode = currentOrder?.otpCode || "";

  const estimatedPrice = Number(livePrice || 0);

  const serviceStock =
    liveStock === null || liveStock === undefined
      ? null
      : Number(liveStock);

  const serviceIsAvailable =
    Boolean(selectedCountry) &&
    Boolean(selectedService) &&
    !priceLoading &&
    Number.isFinite(estimatedPrice) &&
    estimatedPrice > 0;

  const orderIsClosed = [
    "received",
    "expired",
    "cancelled",
  ].includes(orderStatus);

  const currentOrderId = getOrderId(currentOrder);

  const saveActiveOrder = useCallback((order) => {
    const orderId = getOrderId(order);

    if (!orderId) return;

    localStorage.setItem(ACTIVE_ORDER_KEY, orderId);
  }, []);

  const clearActiveOrder = useCallback(() => {
    localStorage.removeItem(ACTIVE_ORDER_KEY);
  }, []);

  const applyOrder = useCallback(
    (order) => {
      if (!order) return;

      setCurrentOrder(order);

      const status = String(
        order.status || "waiting"
      ).toLowerCase();

      if (
        order.otpCode ||
        ["received", "expired", "cancelled"].includes(status)
      ) {
        clearActiveOrder();
      } else {
        saveActiveOrder(order);
      }
    },
    [clearActiveOrder, saveActiveOrder]
  );

  useEffect(() => {
    if (!selectedCountryCode) {
      return;
    }

    const countryStillExists = countries.some(
      (country) =>
        String(country.id) === String(selectedCountryCode)
    );

    if (!countryStillExists) {
      setSelectedCountryCode("");
      setSelectedServiceId("");
    }
  }, [countries, selectedCountryCode]);

  useEffect(() => {
    if (!selectedServiceId) {
      return;
    }

    const serviceStillExists = availableServices.some(
      (service) =>
        String(
          service.id ||
            service.code ||
            service.service ||
            ""
        ) === String(selectedServiceId)
    );

    if (!serviceStillExists) {
      setSelectedServiceId("");
    }
  }, [availableServices, selectedServiceId]);

  useEffect(() => {
    let cancelled = false;

    setLivePrice(null);
    setLiveStock(null);
    setPriceError("");

    if (!selectedCountry || !selectedService) {
      setPriceLoading(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setPriceLoading(true);

        const response = await catalogService.getPrice({
          server: selectedServer,
          country: selectedCountry.id,
          countryName:
            selectedCountry.eng ||
            selectedCountry.name ||
            selectedCountry.label ||
            "",
          service:
            selectedService.id ||
            selectedService.code ||
            selectedService.service,
          serviceName:
            selectedService.name ||
            selectedService.title ||
            selectedService.label ||
            "",
          operator:
            selectedService.preferredOperator || "any",
        });

        if (cancelled) {
          return;
        }

        const price = Number(response?.price);
        const stock = Number(response?.stock);

        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("A live price is not available");
        }

        setLivePrice(price);
        setLiveStock(Number.isFinite(stock) ? stock : null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLivePrice(null);
        setLiveStock(null);
        setPriceError(
          getChapsSmsMessage(
            error,
            "ChapsSms could not retrieve a live price right now. Try another server or try again."
          )
        );
      } finally {
        if (!cancelled) {
          setPriceLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [selectedServer, selectedCountry, selectedService]);

  useEffect(() => {
    async function restoreActiveOrder() {
      try {
        const savedOrderId = localStorage.getItem(
          ACTIVE_ORDER_KEY
        );

        if (!savedOrderId) return;

        const restoredOrder =
          await orderService.getOrder(savedOrderId);

        applyOrder(restoredOrder);
      } catch (error) {
        console.error(
          "Active order restoration failed:",
          error
        );

        clearActiveOrder();
      } finally {
        setRestoringOrder(false);
      }
    }

    restoreActiveOrder();
  }, [applyOrder, clearActiveOrder]);

  const checkCurrentOrder = useCallback(
    async ({ showToast = false } = {}) => {
      if (
        !currentOrderId ||
        pollingInProgress.current ||
        orderIsClosed
      ) {
        return null;
      }

      try {
        pollingInProgress.current = true;

        const updatedOrder =
          await orderService.checkOrder(currentOrderId);

        applyOrder(updatedOrder);

        if (updatedOrder.otpCode) {
          toast.success("OTP received successfully");
        } else if (showToast) {
          toast.success("Order refreshed");
        }

        return updatedOrder;
      } catch (error) {
        console.error("Order check failed:", error);

        if (showToast) {
          toast.error(
            getChapsSmsMessage(
              error,
              "ChapsSms could not refresh the order right now."
            )
          );
        }

        return null;
      } finally {
        pollingInProgress.current = false;
      }
    },
    [
      currentOrderId,
      orderIsClosed,
      applyOrder,
    ]
  );

  useEffect(() => {
    if (
      !currentOrderId ||
      orderIsClosed ||
      otpCode
    ) {
      pollingAttempts.current = 0;
      return;
    }

    pollingAttempts.current = 0;

    const interval = window.setInterval(async () => {
      pollingAttempts.current += 1;

      if (
        pollingAttempts.current >
        MAX_POLLING_ATTEMPTS
      ) {
        window.clearInterval(interval);

        toast.error(
          "Automatic order checking stopped. You can refresh the order manually."
        );

        return;
      }

      const updatedOrder = await checkCurrentOrder();

      if (
        updatedOrder?.otpCode ||
        ["received", "expired", "cancelled"].includes(
          String(updatedOrder?.status || "").toLowerCase()
        )
      ) {
        window.clearInterval(interval);
      }
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [
    currentOrderId,
    orderIsClosed,
    otpCode,
    checkCurrentOrder,
  ]);

  async function handlePurchase() {
    if (purchasing) return;

    if (!selectedCountry) {
      toast.error("Select a country");
      return;
    }

    if (!selectedService) {
      toast.error("Select a service");
      return;
    }

    if (
      Number.isFinite(serviceStock) &&
      serviceStock <= 0
    ) {
      toast.error(
        "ChapsSms does not currently have numbers available for this selection."
      );
      return;
    }

    if (
      !Number.isFinite(estimatedPrice) ||
      estimatedPrice <= 0
    ) {
      toast.error(
        "A valid live price is not available"
      );
      return;
    }

    try {
      setPurchasing(true);

      const response = await createOrder({
        server: selectedServer,
        country: selectedCountry.id,
        countryName:
          selectedCountry.eng ||
          selectedCountry.name ||
          selectedCountry.label ||
          "",
        service:
          selectedService.id ||
          selectedService.code ||
          selectedService.service,
        serviceName:
          selectedService.name ||
          selectedService.title ||
          selectedService.label ||
          "",
        operator:
          selectedService.preferredOperator || "any",
      });

      if (!response?.order) {
        throw new Error(
          "The server did not return the new order"
        );
      }

      applyOrder(response.order);

      if (
        response.walletBalance !== undefined &&
        response.walletBalance !== null
      ) {
        updateWalletBalance(response.walletBalance);
      } else {
        await refreshWallet();
      }

      pollingAttempts.current = 0;

      /*
       * The backend has returned a real created order at this point.
       * Track product usage separately from wallet-funding revenue so
       * TikTok does not count the same customer money twice as Purchase.
       */
      trackNumberPurchased({
        value:
          response?.order?.price ??
          estimatedPrice,
        currency: "NGN",
        orderId:
          response?.order?._id ||
          response?.order?.id,
        serviceName:
          response?.order?.serviceName ||
          selectedService?.name ||
          selectedService?.title ||
          selectedService?.label ||
          "Virtual number",
      });

      toast.success("Number purchased successfully");
    } catch (error) {
      console.error("Purchase failed:", error);

      /*
       * The backend reserves the wallet before asking the provider for a
       * number. If the provider returns NO_NUMBERS, the backend immediately
       * reverses that reservation. Always fetch the authoritative wallet
       * here so the customer never keeps seeing the temporary deduction.
       */
      try {
        if (
          error?.data?.walletBalance !==
            undefined &&
          error?.data?.walletBalance !==
            null
        ) {
          updateWalletBalance(
            Number(
              error.data.walletBalance
            )
          );
        }

        await refreshWallet();
      } catch (walletRefreshError) {
        console.error(
          "Wallet refresh after failed purchase also failed:",
          walletRefreshError
        );
      }

      toast.error(
        getChapsSmsMessage(
          error,
          "ChapsSms could not purchase this number right now."
        )
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function refreshOrder() {
    if (
      !currentOrderId ||
      checkingOrder ||
      orderIsClosed
    ) {
      return;
    }

    try {
      setCheckingOrder(true);

      await checkCurrentOrder({
        showToast: true,
      });
    } finally {
      setCheckingOrder(false);
    }
  }
async function handleCancel() {
  if (
    !currentOrderId ||
    cancellingOrder
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      "Cancel this order? A refund will only be issued after ChapsSms confirms the cancellation."
    );

  if (!confirmed) return;

  try {
    setCancellingOrder(true);

    const response =
      await orderService.cancelOrder(
        currentOrderId
      );

    if (!response?.order) {
      throw new Error(
        "The server did not return the cancelled order"
      );
    }

    applyOrder(response.order);

    if (
      response.walletBalance !==
        undefined &&
      response.walletBalance !== null
    ) {
      updateWalletBalance(
        Number(
          response.walletBalance
        )
      );
    }

    /*
     * Always retrieve the authoritative
     * wallet and transaction state after
     * a cancellation.
     */
    await refreshWallet();

    toast.success(
      getChapsSmsMessage(
        response.message,
        response.refunded
          ? "Order cancelled and wallet refunded"
          : "Order cancelled"
      )
    );
  } catch (error) {
    console.error(
      "Cancellation failed:",
      error
    );

    /*
     * Refresh even after an error because
     * 5SIM may have cancelled the order
     * before the connection failed.
     */
    try {
      await refreshWallet();
    } catch {
      // Keep the original cancellation error.
    }

    toast.error(
      getChapsSmsMessage(
        error,
        "ChapsSms could not cancel this order right now."
      )
    );
  } finally {
    setCancellingOrder(false);
  }
}

  async function copyText(value, message) {
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        String(value)
      );

      toast.success(message);
    } catch {
      toast.error("Could not copy");
    }
  }
  function resetLivePrice() {
    setLivePrice(null);
    setLiveStock(null);
    setPriceError("");
    setPriceLoading(false);
  }

  function handleServerChange(server) {
    if (
      purchasing ||
      checkingOrder ||
      cancellingOrder
    ) {
      return;
    }

    setSelectedServer(server);
    setSelectedCountryCode("");
    setSelectedServiceId("");
    resetLivePrice();
  }

  function handleCountryChange(countryId) {
    setSelectedCountryCode(String(countryId || ""));
    setSelectedServiceId("");
    resetLivePrice();
  }

  function handleServiceChange(serviceId) {
    setSelectedServiceId(String(serviceId || ""));
    resetLivePrice();
  }
  function startNewOrder() {
    clearActiveOrder();
    setCurrentOrder(null);
    pollingAttempts.current = 0;
  }

  function formatPhoneNumber(value) {
    if (!value) return "—";

    const digits = String(value).replace(/\D/g, "");

    if (
      digits.length === 11 &&
      digits.startsWith("1")
    ) {
      return `+1 ${digits.slice(1, 4)} ${digits.slice(
        4,
        7
      )} ${digits.slice(7)}`;
    }

    return String(value);
  }

  function getStatusLabel() {
    if (otpCode) return "Code received";

    if (orderStatus === "received") {
      return "SMS received";
    }

    if (orderStatus === "expired") {
      return "Order expired";
    }

    if (orderStatus === "cancelled") {
      return "Order cancelled";
    }

    if (orderStatus === "cancelling") {
      return "Cancelling order";
    }

    return "Waiting for SMS";
  }

  function getStatusClasses() {
    if (otpCode || orderStatus === "received") {
      return "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900";
    }

    if (
      orderStatus === "expired" ||
      orderStatus === "cancelled"
    ) {
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
    }

    return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }

  if (restoringOrder) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-[1050px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-blue-600"
            size={30}
          />

          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Restoring your active order...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] overflow-x-hidden">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
          Receive <span className="text-blue-600">SMS</span>
        </h1>

        <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
          Buy a number and receive your verification code in seconds.
        </p>
      </div>

      {!currentOrder ? (
        <>
          {/* <div className="mb-5 flex justify-center sm:mb-6">
            <div className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm sm:w-auto">
             

            
            </div>
          </div> */}

          <div className="grid min-w-0 items-stretch gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                  <MessageSquareText size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-black text-[var(--foreground)] sm:text-xl">
                    Buy a number
                  </h2>
<div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm">
  <div className="relative grid grid-cols-2">
    <div
      aria-hidden="true"
      className={`absolute inset-y-0 w-1/2 rounded-xl bg-blue-600 shadow-sm transition-transform duration-300 ease-out ${
        selectedServer === "server2"
          ? "translate-x-full"
          : "translate-x-0"
      }`}
    />

    {[
      {
        id: "server1",
        label: "Server 1",
      },
      {
        id: "server2",
        label: "Server 2",
      },
    ].map((server) => {
      const isActive =
        selectedServer === server.id;

      return (
        <button
          key={server.id}
          type="button"
          onClick={() =>
            handleServerChange(
              server.id
            )
          }
          disabled={
            purchasing ||
            checkingOrder ||
            cancellingOrder
          }
          aria-pressed={isActive}
          className={`relative z-10 min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isActive
              ? "text-white"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {server.label}
        </button>
      );
    })}
  </div>
</div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Select a country and service to continue.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={reloadCatalog}
                disabled={catalogLoading}
                aria-label="Refresh live catalog"
                className="rounded-xl p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    catalogLoading ? "animate-spin" : ""
                  }
                />
              </button>
            </div>

            {catalogError && !countries.length && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {getChapsSmsMessage(
                    catalogError,
                    "ChapsSms could not load the available countries and services. Please try again."
                  )}
                </p>

                <button
                  type="button"
                  onClick={reloadCatalog}
                  className="mt-3 text-sm font-bold text-red-700 dark:text-red-300 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {catalogLoading && !countries.length ? (
              <div className="flex min-h-72 items-center justify-center">
                <div className="text-center">
                  <LoaderCircle
                    className="mx-auto animate-spin text-blue-600"
                    size={30}
                  />

                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    Loading live countries and services...
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5 sm:mt-7">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--foreground)]">
                    Country
                  </label>

                  <SearchableCountrySelect
                    countries={countries}
                    value={selectedCountryCode}
                    onChange={handleCountryChange}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--foreground)]">
                    Service
                  </label>

                  <SearchableServiceSelect
                    services={availableServices}
                    value={selectedServiceId}
                    onChange={handleServiceChange}
                    disabled={!selectedCountryCode}
                  />
                </div>

                <div className="flex flex-col gap-4 rounded-2xl bg-[var(--muted)] px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      Live price
                    </p>

                    <p className="mt-1 text-2xl font-black text-[var(--foreground)]">
                      {priceLoading
                        ? "Checking..."
                        : selectedService && estimatedPrice > 0
                          ? formatNaira(estimatedPrice)
                          : "—"}
                    </p>

                    {priceError && (
                      <p className="mt-1 max-w-xs text-xs font-semibold text-red-600">
                        {priceError}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 text-left min-[420px]:text-right">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">
                    
                      {selectedCountry?.eng ||
                        selectedCountry?.name ||
                        selectedCountry?.label ||
                        "Select country"}
                    </p>

                    <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                      {selectedService?.name ||
                        "Select service"}
                    </p>

                    {selectedService && (
                      <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                        {Number.isFinite(serviceStock) &&
                        serviceStock > 0
                          ? `${serviceStock.toLocaleString()} available`
                          : "Availability checked at purchase"}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handlePurchase}
                  disabled={
                    purchasing ||
                    catalogLoading ||
                    priceLoading ||
                    !selectedCountry ||
                    !serviceIsAvailable
                  }
                  className="h-12 w-full"
                >
                  {purchasing ? (
                    <>
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                      Purchasing...
                    </>
                  ) : priceLoading ? (
                    <>
                      <LoaderCircle
                        className="animate-spin"
                        size={18}
                      />
                      Checking price...
                    </>
                  ) : (
                    <>
                      <Phone size={18} />
                      Buy Number
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              How it works
            </p>

            <div className="mt-6 space-y-6">
              {[
                "Select a country and service.",
                "Copy the number into the target app.",
                "Request the verification code in that app.",
                "Copy your OTP when it arrives.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600">
                    {index + 1}
                  </span>

                  <p className="pt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </aside>
          </div>
        </>
      ) : (
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-[var(--foreground)] sm:text-xl">
                Active order
              </h2>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Use this number on{" "}
                {formatName(
                  currentOrder.service ||
                    selectedService?.name
                )}{" "}
                and request the verification code.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshOrder}
              disabled={
                checkingOrder || orderIsClosed
              }
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  checkingOrder ? "animate-spin" : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${getStatusClasses()}`}
              >
                {otpCode ? (
                  <CheckCircle2 size={14} />
                ) : orderIsClosed ? (
                  <XCircle size={14} />
                ) : (
                  <LoaderCircle
                    className="animate-spin"
                    size={14}
                  />
                )}

                {getStatusLabel()}
              </span>

              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {selectedCountry?.flag ||
                  currentOrder.country}{" "}
                {selectedCountry?.eng ||
                  formatName(currentOrder.country)}

                <span className="mx-2">•</span>

                {selectedService?.name ||
                  formatName(currentOrder.service)}
              </p>
            </div>

            <div className="w-full rounded-xl bg-[var(--muted)] px-4 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Paid
              </p>

              <p className="mt-1 font-black text-[var(--foreground)]">
                {formatNaira(
                  currentOrder.price ?? estimatedPrice
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-[var(--muted)] p-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Hash size={14} />

                <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  Order ID
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyText(
                    currentOrder.providerOrderId ||
                      currentOrderId,
                    "Order ID copied"
                  )
                }
                className="mt-2 max-w-full truncate text-left font-mono text-sm font-bold text-[var(--foreground)]"
              >
                {currentOrder.providerOrderId ||
                  currentOrderId}
              </button>
            </div>

          <div className="rounded-2xl bg-[var(--muted)] p-4">
  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
    Server
  </p>

  <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
    {currentOrder.server === "server1"
      ? "SERVER 1"
      : currentOrder.server === "server2"
      ? "SERVER 2"
      : "UNKNOWN"}
  </p>
</div>

            <div className="rounded-2xl bg-[var(--muted)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Purchased
              </p>

              <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
                {formatDate(currentOrder.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Virtual number
            </p>

            <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <p className="break-all text-2xl font-black tracking-tight text-[var(--foreground)] min-[420px]:text-3xl sm:text-[34px]">
                {formatPhoneNumber(
                  currentOrder.phoneNumber
                )}
              </p>

              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  copyText(
                    currentOrder.phoneNumber,
                    "Number copied"
                  )
                }
              >
                <Copy size={17} />
                Copy
              </Button>
            </div>
          </div>

          <div
            className={`mt-5 rounded-2xl p-4 text-white sm:p-5 ${
              otpCode
                ? "bg-blue-600"
                : "bg-slate-950"
            }`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-[0.14em] ${
                otpCode
                  ? "text-blue-100"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              OTP code
            </p>

            <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <p
                className={`min-h-10 break-all text-2xl font-black tracking-[0.12em] min-[420px]:text-3xl min-[420px]:tracking-[0.18em] sm:text-4xl ${
                  !otpCode && !orderIsClosed
                    ? "animate-pulse"
                    : ""
                }`}
              >
                {otpCode ||
                  (orderIsClosed
                    ? "Unavailable"
                    : "• • • • • •")}
              </p>

              <Button
                type="button"
                variant="secondary"
                disabled={!otpCode}
                onClick={() =>
                  copyText(otpCode, "OTP copied")
                }
              >
                <Copy size={17} />
                Copy OTP
              </Button>
            </div>
          </div>

          {!otpCode && !orderIsClosed && (
            <div className="mt-5 rounded-2xl bg-[var(--muted)] p-4">
              <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Timer
                    className="shrink-0 text-blue-600"
                    size={19}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Waiting for SMS
                    </p>

                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Checking automatically every five seconds.
                    </p>
                  </div>
                </div>

                <p className="shrink-0 text-left text-xl font-black text-[var(--foreground)] min-[420px]:text-right">
                  <CountdownTimer
                    initialSeconds={1200}
                    onExpire={() => {
                      toast.error(
                        "The local countdown ended. Refreshing the ChapsSms status."
                      );

                      checkCurrentOrder({
                        showToast: false,
                      });
                    }}
                  />
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {orderIsClosed && (
              <Button
                type="button"
                variant="secondary"
                className="h-12 w-full sm:flex-1"
                onClick={startNewOrder}
              >
                <RotateCcw size={17} />
                New Order
              </Button>
            )}

            {!otpCode && !orderIsClosed && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancellingOrder}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-[var(--card)] dark:border-red-900 px-5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
              >
                {cancellingOrder ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={17}
                  />
                ) : (
                  <XCircle size={17} />
                )}

                {cancellingOrder
                  ? "Cancelling..."
                  : "Cancel Order"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

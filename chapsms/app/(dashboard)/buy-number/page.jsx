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
import { orderService } from "@/services/orderService";

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

export default function BuyNumberPage() {
  const { createOrder } = useOrders();

  const {
    updateWalletBalance,
    refreshWallet,
  } = useWallet();

  const {
    countries,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog();

  const [selectedServer, setSelectedServer] = useState("benotp");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

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
        (country) => country.code === selectedCountryCode
      ) || null
    );
  }, [countries, selectedCountryCode]);

  const availableServices = useMemo(() => {
    return selectedCountry?.services || [];
  }, [selectedCountry]);

  const selectedService = useMemo(() => {
    return (
      availableServices.find(
        (service) => service.id === selectedServiceId
      ) || null
    );
  }, [availableServices, selectedServiceId]);

  const orderStatus = String(
    currentOrder?.status || "waiting"
  ).toLowerCase();

  const otpCode = currentOrder?.otpCode || "";

  const estimatedPrice = Number(
    selectedService?.price || 0
  );

  const serviceStock = Number(
    selectedService?.available || 0
  );

  const serviceIsAvailable =
    Boolean(selectedService) &&
    Number.isFinite(estimatedPrice) &&
    estimatedPrice > 0 &&
    serviceStock > 0;

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
    if (!countries.length || selectedCountryCode) {
      return;
    }

    setSelectedCountryCode(countries[0].code);
  }, [countries, selectedCountryCode]);

  useEffect(() => {
    if (!selectedCountry) {
      setSelectedServiceId("");
      return;
    }

    const currentServiceStillExists = availableServices.some(
      (service) => service.id === selectedServiceId
    );

    if (!currentServiceStillExists) {
      setSelectedServiceId(
        availableServices[0]?.id || ""
      );
    }
  }, [
    selectedCountry,
    availableServices,
    selectedServiceId,
  ]);

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
            error.message || "Could not refresh order"
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

    if (serviceStock <= 0) {
      toast.error(
        "This service is currently out of stock"
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
        provider: selectedServer,
        country: selectedCountry.code,
        service: selectedService.id,
        operator:
          selectedService.preferredOperator ||
          "any",
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

      toast.success("Number purchased successfully");
    } catch (error) {
      console.error("Purchase failed:", error);

      toast.error(
        error.message ||
          "Unable to purchase this number"
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
      "Cancel this order? A refund will only be issued if the provider confirms the cancellation."
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
      response.message ||
        (response.refunded
          ? "Order cancelled and wallet refunded"
          : "Order cancelled")
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
      error.message ||
        "Unable to cancel order"
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
      return "bg-green-50 text-green-700 ring-green-200";
    }

    if (
      orderStatus === "expired" ||
      orderStatus === "cancelled"
    ) {
      return "bg-red-50 text-red-700 ring-red-200";
    }

    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (restoringOrder) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-[1050px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-blue-600"
            size={30}
          />

          <p className="mt-3 text-sm text-slate-500">
            Restoring your active order...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] overflow-x-hidden">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Receive <span className="text-blue-600">SMS</span>
        </h1>

        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Buy a number and receive your verification code in seconds.
        </p>
      </div>

      {!currentOrder ? (
        <>
          <div className="mb-5 flex justify-center sm:mb-6">
            <div className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto">
              <button
                type="button"
                onClick={() => setSelectedServer("benotp")}
                className={`min-w-0 rounded-xl px-3 py-3 text-sm font-black transition sm:min-w-32 sm:px-5 ${
                  selectedServer === "benotp"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {/* <span className="block">Server 1</span> */}
                <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  selectedServer === "benotp"
                    ? "text-blue-100"
                    : "text-slate-400"
                }`}>
                 Server 1
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedServer("smsbower")}
                className={`min-w-0 rounded-xl px-3 py-3 text-sm font-black transition sm:min-w-32 sm:px-5 ${
                  selectedServer === "smsbower"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {/* <span className="block">Server 2</span> */}
                <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  selectedServer === "smsbower"
                    ? "text-blue-100"
                    : "text-slate-400"
                }`}>
                 Server 2
                </span>
              </button>
            </div>
          </div>

          <div className="grid min-w-0 items-stretch gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MessageSquareText size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                    Buy a number
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a country and service to continue.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={reloadCatalog}
                disabled={catalogLoading}
                aria-label="Refresh live catalog"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
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
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {catalogError}
                </p>

                <button
                  type="button"
                  onClick={reloadCatalog}
                  className="mt-3 text-sm font-bold text-red-700 underline"
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

                  <p className="mt-3 text-sm text-slate-500">
                    Loading live countries and services...
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5 sm:mt-7">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Country
                  </label>

                  <SearchableCountrySelect
                    countries={countries}
                    value={selectedCountryCode}
                    onChange={setSelectedCountryCode}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Service
                  </label>

                  <SearchableServiceSelect
                    services={availableServices}
                    value={selectedServiceId}
                    onChange={setSelectedServiceId}
                    disabled={!selectedCountryCode}
                  />
                </div>

                <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Live price
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {selectedService
                        ? formatNaira(estimatedPrice)
                        : "—"}
                    </p>
                  </div>

                  <div className="min-w-0 text-left min-[420px]:text-right">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {selectedCountry?.flag}{" "}
                      {selectedCountry?.name ||
                        "Select country"}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-500">
                      {selectedService?.name ||
                        "Select service"}
                    </p>

                    {selectedService && (
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          serviceStock > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {serviceStock > 0
                          ? `${serviceStock.toLocaleString()} available`
                          : "Out of stock"}
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
                  ) : serviceStock <= 0 &&
                    selectedService ? (
                    <>
                      <XCircle size={18} />
                      Out of Stock
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

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
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

                  <p className="pt-1 text-sm leading-6 text-slate-600">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </aside>
          </div>
        </>
      ) : (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                Active order
              </h2>

              <p className="mt-1 text-sm text-slate-500">
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
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
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

              <p className="mt-3 text-sm text-slate-500">
                {selectedCountry?.flag ||
                  currentOrder.country}{" "}
                {selectedCountry?.name ||
                  formatName(currentOrder.country)}

                <span className="mx-2">•</span>

                {selectedService?.name ||
                  formatName(currentOrder.service)}
              </p>
            </div>

            <div className="w-full rounded-xl bg-slate-50 px-4 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Paid
              </p>

              <p className="mt-1 font-black text-slate-950">
                {formatNaira(
                  currentOrder.price ||
                    estimatedPrice
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
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
                className="mt-2 max-w-full truncate text-left font-mono text-sm font-bold text-slate-800"
              >
                {currentOrder.providerOrderId ||
                  currentOrderId}
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Provider
              </p>

              <p className="mt-2 text-sm font-bold text-slate-800">
                {currentOrder.provider === "benotp"
                  ? "SERVER 1 · BENOTP"
                  : currentOrder.provider === "smsbower"
                    ? "SERVER 2 · SMSBOWER"
                    : String(
                        currentOrder.provider || "Unknown"
                      ).toUpperCase()}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Purchased
              </p>

              <p className="mt-2 text-sm font-bold text-slate-800">
                {formatDate(currentOrder.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Virtual number
            </p>

            <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <p className="break-all text-2xl font-black tracking-tight text-slate-950 min-[420px]:text-3xl sm:text-[34px]">
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
                  : "text-slate-400"
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
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Timer
                    className="shrink-0 text-blue-600"
                    size={19}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      Waiting for SMS
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Checking automatically every five seconds.
                    </p>
                  </div>
                </div>

                <p className="shrink-0 text-left text-xl font-black text-slate-950 min-[420px]:text-right">
                  <CountdownTimer
                    initialSeconds={1200}
                    onExpire={() => {
                      toast.error(
                        "The local countdown ended. Refreshing the provider status."
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
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
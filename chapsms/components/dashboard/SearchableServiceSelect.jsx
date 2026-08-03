"use client";

import {
  useState,
} from "react";

import {
  Check,
  ChevronsUpDown,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function getServiceId(service) {
  return String(
    service?.id ??
      service?.code ??
      service?.service ??
      ""
  );
}

function getServiceName(service) {
  return String(
    service?.name ??
      service?.serviceName ??
      service?.title ??
      service?.code ??
      service?.id ??
      "Unknown service"
  );
}

function getServiceStock(service) {
  const stock = Number(
    service?.available ??
      service?.stock ??
      service?.count
  );

  return Number.isFinite(stock)
    ? stock
    : null;
}

export default function SearchableServiceSelect({
  services = [],
  value,
  onChange,
  disabled = false,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const normalizedValue =
    String(value || "");

  const selectedService =
    services.find(
      (service) =>
        getServiceId(service) ===
        normalizedValue
    ) || null;

  return (
    <Popover
      open={
        disabled ? false : open
      }
      onOpenChange={(nextOpen) => {
        if (!disabled) {
          setOpen(nextOpen);
        }
      }}
    >
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span
          className={
            selectedService
              ? "truncate"
              : "text-slate-400"
          }
        >
          {selectedService
            ? getServiceName(
                selectedService
              )
            : disabled
              ? "Select a country first"
              : "Choose a service"}
        </span>

        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Search services..." />

          <CommandList>
            <CommandEmpty>
              No available service found.
            </CommandEmpty>

            <CommandGroup>
              {services.map(
                (
                  service,
                  index
                ) => {
                  const serviceId =
                    getServiceId(
                      service
                    );

                  const serviceName =
                    getServiceName(
                      service
                    );

                  const stock =
                    getServiceStock(
                      service
                    );

                  return (
                    <CommandItem
                      key={
                        serviceId ||
                        `${serviceName}-${index}`
                      }
                      value={`${serviceName} ${serviceId}`}
                      onSelect={() => {
                        onChange(
                          serviceId
                        );

                        setOpen(false);
                      }}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {serviceName}
                        </p>

                        <p className="text-xs text-slate-400">
                          {stock !== null &&
                          stock > 0
                            ? `${stock.toLocaleString()} available`
                            : "Live price checked after selection"}
                        </p>
                      </div>

                      {normalizedValue ===
                        serviceId && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                      )}
                    </CommandItem>
                  );
                }
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
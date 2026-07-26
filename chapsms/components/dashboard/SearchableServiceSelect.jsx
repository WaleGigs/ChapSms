"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

export default function SearchableServiceSelect({
  services = [],
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const selectedService =
    services.find((service) => service.id === value) || null;

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {selectedService ? (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate">
              {selectedService.name}
            </span>

            <span className="shrink-0 text-blue-600">
              {formatNaira(selectedService.price)}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">
            {disabled
              ? "Select a country first"
              : "Choose a service"}
          </span>
        )}

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
              No available service found for this country.
            </CommandEmpty>

            <CommandGroup>
              {services.map((service) => (
                <CommandItem
                  key={service.id}
                  value={`${service.name} ${service.id}`}
                  onSelect={() => {
                    onChange(service.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {service.name}
                    </p>

                    <p className="text-xs text-slate-400">
                      {Number(
                        service.available || 0
                      ).toLocaleString()}{" "}
                      available
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-blue-600">
                      {formatNaira(service.price)}
                    </span>

                    {value === service.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
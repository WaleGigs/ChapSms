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

export default function SearchableCountrySelect({
  countries = [],
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);

  const selectedCountry =
    countries.find((country) => country.code === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {selectedCountry ? (
          <span className="flex min-w-0 items-center gap-2">
            <span>{selectedCountry.flag}</span>
            <span className="truncate">
              {selectedCountry.name}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">
            Choose a country
          </span>
        )}

        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Search countries..." />

          <CommandList>
            <CommandEmpty>No available country found.</CommandEmpty>

            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span>{country.flag}</span>

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {country.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {Number(
                          country.available || 0
                        ).toLocaleString()}{" "}
                        available
                      </p>
                    </div>
                  </div>

                  {value === country.code && (
                    <Check className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
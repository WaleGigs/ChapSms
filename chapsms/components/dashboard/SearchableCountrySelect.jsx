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
    countries.find(
      (country) => String(country.id) === String(value)
    ) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"
      >
        {selectedCountry ? (
          <span className="truncate">
            {selectedCountry.eng}
          </span>
        ) : (
          <span className="text-slate-400">
            Choose a country
          </span>
        )}

        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Search countries..." />

          <CommandList>
            <CommandEmpty>
              No available country found.
            </CommandEmpty>

            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.id}
                  value={country.eng}
                  onSelect={() => {
                    onChange(String(country.id));
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{country.eng}</span>

                  {String(value) === String(country.id) && (
                    <Check className="h-4 w-4 text-blue-600" />
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
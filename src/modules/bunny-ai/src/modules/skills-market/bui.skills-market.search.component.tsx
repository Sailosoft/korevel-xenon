// bui.skills-market.search.component.tsx
//
// Header search control for the marketplace. Typing here filters the market
// catalog through the Bunny table search (case-insensitive name/description).

"use client";

import { useCallback, useState } from "react";
import { Search, X } from "lucide-react";
import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { BUISkillsMarketRow } from "./bui.skills-market.entity";

export default function BUISkillsMarketSearchComponent() {
  const kernel = useBunnyKernel<BUISkillsMarketRow, unknown>();
  const [query, setQuery] = useState("");

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      kernel.adminPanel.table.setSearch({ search: value });
    },
    [kernel],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    kernel.adminPanel.table.setSearch({ search: "" });
  }, [kernel]);

  return (
    <div className="relative w-40 sm:w-52 shrink-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search the market..."
        className="w-full h-9 pl-8 pr-8 rounded-xl border border-default-200 bg-transparent text-sm outline-none focus:border-primary transition-colors placeholder:text-default-400"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-default-400 hover:text-danger transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
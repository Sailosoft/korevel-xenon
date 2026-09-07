// bui.skills-market.component.tsx
//
// Client page component for the Skills Market. Renders a live summary banner
// (installed-to-total counts) above the Bunny admin table driven by
// bui.skills-market.module.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import { Store } from "lucide-react";
import { buiSkillsMarketGetTotal } from "./bui.skills-market.constant";
import { useBuiSkillsMarketInstalled } from "./bui.skills-market.hooks";
import { buiSkillsMarketModule } from "./bui.skills-market.module";

function BUISkillsMarketSummary() {
  const { installedCount, isLoading } = useBuiSkillsMarketInstalled();
  const total = buiSkillsMarketGetTotal();

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-default-100 bg-white">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Store className="w-4 h-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-sm font-semibold text-default-700">
          Skills Market
        </p>
        <p className="text-xs text-default-400">
          {isLoading
            ? "Loading Author Skills registry..."
            : `${installedCount} of ${total} marketplace skills are in Author Skills. Select skills and use the header action, or use the row action, to add more.`}
        </p>
      </div>
    </div>
  );
}

export default function BUISkillsMarketComponent() {
  return (
    <div className="flex flex-col gap-4">
      <BUISkillsMarketSummary />
      <Bunny config={buiSkillsMarketModule}>{null}</Bunny>
    </div>
  );
}
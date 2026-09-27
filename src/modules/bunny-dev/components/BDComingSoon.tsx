"use client";

// BDComingSoon — placeholder page body used by not-yet-implemented sub-modules.

import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import BDPageHeader from "./BDPageHeader";
import BDEmptyState from "./BDEmptyState";

export interface BDComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function BDComingSoon({ title, description, icon }: BDComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <BDPageHeader icon={icon} title={title} description={description} />
      <BDEmptyState
        icon={Hammer}
        title="Coming soon"
        description="This sub-module is scaffolded and will be implemented in an upcoming phase."
      />
    </div>
  );
}

export default BDComingSoon;

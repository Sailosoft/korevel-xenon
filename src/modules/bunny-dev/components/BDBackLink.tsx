"use client";

// BDBackLink — small "Back to <Module>" link shown above detail-page headers.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface BDBackLinkProps {
  href: string;
  label: string;
}

export function BDBackLink({ href, label }: BDBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default BDBackLink;

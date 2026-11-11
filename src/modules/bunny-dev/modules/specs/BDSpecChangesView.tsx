"use client";

// BDSpecChangesView — review surface for AI document patches. Shows the
// operation list plus a unified line diff of the rendered document before and
// after the patches.

import {
  FileText,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import BDDiffView from "../../components/BDDiffView";
import {
  describeSpecPatch,
  type BDSpecPatchOp,
  type BDSpecPatchable,
} from "./BDSpec.Patch";
import { specDraftToMarkdown } from "./BDSpec.Types";

export interface BDSpecChangesViewProps {
  before: BDSpecPatchable;
  after: BDSpecPatchable;
  patches: BDSpecPatchOp[];
  fileName?: string;
  defaultCollapsed?: boolean;
  className?: string;
}

function iconFor(patch: BDSpecPatchOp): {
  icon: LucideIcon;
  className: string;
} {
  switch (patch.op) {
    case "insertSection":
      return { icon: Plus, className: "text-green-600" };
    case "deleteSection":
      return { icon: Minus, className: "text-red-500" };
    case "updateSection":
    case "setMeta":
      return { icon: Pencil, className: "text-blue-600" };
    case "replaceSections":
    case "replaceContent":
      return { icon: RefreshCw, className: "text-amber-600" };
    default:
      return { icon: FileText, className: "text-slate-500" };
  }
}

export function BDSpecChangesView({
  before,
  after,
  patches,
  fileName,
  defaultCollapsed,
  className,
}: BDSpecChangesViewProps) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Document changes ({patches.length})
        </p>
        <ul className="flex flex-col gap-1">
          {patches.map((patch, index) => {
            const { icon: Icon, className: iconClass } = iconFor(patch);
            return (
              <li
                key={`${patch.op}-${index}`}
                className="flex items-start gap-2 text-xs text-slate-600"
              >
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                <span>{describeSpecPatch(patch, index)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <BDDiffView
        original={specDraftToMarkdown(before)}
        modified={specDraftToMarkdown(after)}
        fileName={fileName ?? "Document changes"}
        defaultCollapsed={defaultCollapsed}
      />
    </div>
  );
}

export default BDSpecChangesView;

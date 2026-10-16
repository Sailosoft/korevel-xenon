"use client";

// BDAppSettingsModal — app metadata dialog (name, slug, path, description,
// brand, theme). Opened from the sidebar "Settings" item or the title-bar
// File menu; changes apply live via onChange, persisted by the Save action.

import { Save, Wand2 } from "lucide-react";
import { cn } from "@heroui/react";
import type { BDAppForm } from "./BDApp.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

const CELL =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

/** Actions for the resource currently open in the designer. */
export interface BDAppSettingsResourceActions {
  label: string;
  isNew?: boolean;
  onClose: () => void;
}

export interface BDAppSettingsModalProps {
  open: boolean;
  onClose: () => void;
  form: BDAppForm;
  onChange: (patch: Partial<BDAppForm>) => void;
  /** Opens the "Fill details" name-derivation dialog. */
  onFillDetails: () => void;
  onSave: () => void;
  isSaving?: boolean;
  /** Resource editor actions for the active designer tab, if any. */
  resourceActions?: BDAppSettingsResourceActions | null;
}

export function BDAppSettingsModal({
  open,
  onClose,
  form,
  onChange,
  onFillDetails,
  onSave,
  isSaving,
  resourceActions = null,
}: BDAppSettingsModalProps) {
  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      title="App settings"
      description="Name, routing, brand and theme for this app."
      footer={
        <>
          <BDButton
            variant="secondary"
            size="sm"
            icon={Wand2}
            onClick={onFillDetails}
          >
            Fill details
          </BDButton>
          <div className="flex-1" />
          <BDButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </BDButton>
          <BDButton size="sm" icon={Save} isLoading={isSaving} onClick={onSave}>
            Save app
          </BDButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Name</span>
          <input
            className={CELL}
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Slug</span>
          <input
            className={CELL}
            value={form.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Path</span>
          <input
            className={CELL}
            value={form.path}
            onChange={(e) => onChange({ path: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 md:col-span-3">
          <span className="text-xs font-medium text-slate-600">
            Description
          </span>
          <input
            className={CELL}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Shown in the standalone application header."
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Brand name</span>
          <input
            className={CELL}
            value={form.brandName}
            onChange={(e) => onChange({ brandName: e.target.value })}
            placeholder={form.name || "App title"}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Logo URL</span>
          <input
            className={CELL}
            value={form.logoUrl}
            onChange={(e) => onChange({ logoUrl: e.target.value })}
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">
            Theme mode
          </span>
          <select
            className={CELL}
            value={form.themeMode}
            onChange={(e) =>
              onChange({ themeMode: e.target.value as BDAppForm["themeMode"] })
            }
          >
            <option value="system">system</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">
            Primary color
          </span>
          <input
            className={CELL}
            value={form.primaryColor}
            onChange={(e) => onChange({ primaryColor: e.target.value })}
            placeholder="#1976d2"
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="text-xs font-medium text-slate-600">
          Builder layout
        </span>
        <div className="mt-2 flex items-center gap-2">
          {(["full", "shell"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ builderLayout: value })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                form.builderLayout === value
                  ? "border-[#90caf9] bg-[#e3f2fd] font-semibold text-[#1565c0]"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100",
              )}
            >
              {value === "full" ? "Full view" : "App shell"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Full view opens the designer as a dedicated full-screen workspace.
          App shell keeps it inside the Bunny Developer workspace chrome.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="text-xs font-medium text-slate-600">
          Active resource
        </span>
        {resourceActions ? (
          <>
            <p className="mt-1 text-xs text-slate-500">
              {resourceActions.label}
              {resourceActions.isNew ? " · not saved yet" : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BDButton
                size="sm"
                variant="ghost"
                onClick={resourceActions.onClose}
              >
                Close resource
              </BDButton>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Save with the title-bar button or Ctrl+S; delete from the
              sidebar.
            </p>
          </>
        ) : (
          <p className="mt-1 text-[11px] text-slate-400">
            Open a resource tab in the designer to save, close or delete it
            here.
          </p>
        )}
      </div>
    </BDModal>
  );
}

export default BDAppSettingsModal;

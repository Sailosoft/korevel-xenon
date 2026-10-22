"use client";

// BDAppSettingsModal — app metadata dialog (schema tie, name, slug, path,
// description, brand, theme, publish state). Opened from the sidebar
// "Settings" item or the title-bar File menu; changes apply live via
// onChange, persisted by the Save action.

import { Save, Wand2, X } from "lucide-react";
import type { BDAppForm } from "./BDApp.Types";
import { BD_APP_DEFAULT_COLORS, BD_APP_THEME_TOKENS } from "./BDApp.Types";
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
  /** Schema groups available to tie this app to a schema design. */
  schemaGroups?: { id: string; name: string }[];
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-200 bg-white"
          aria-label={`Pick ${label}`}
        />
        <input
          className={CELL}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Reset ${label}`}
            title="Use the default"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </label>
  );
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
  schemaGroups = [],
}: BDAppSettingsModalProps) {
  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      title="App settings"
      description="Schema tie, publishing, routing, brand and theme for this app."
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
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="text-xs font-medium text-slate-600">
          Schema design
        </span>
        <label className="mt-2 flex flex-col gap-1">
          <select
            className={CELL}
            value={form.schemaGroupId}
            onChange={(e) => onChange({ schemaGroupId: e.target.value })}
          >
            <option value="">Not tied</option>
            {schemaGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] text-slate-400">
          {form.schemaGroupId
            ? "Tied to schema — resources can pick models from this design and map properties to fields/columns."
            : schemaGroups.length === 0
              ? "No schema groups in this project yet — build one in the Schema Builder first."
              : "Not tied — resource schema tools are hidden. Stored model links are kept if you re-tie later."}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
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
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600">
            Theme colors
          </span>
          <span className="text-[11px] text-slate-400">
            Optional — empty keeps the default
          </span>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ColorField
            label="Primary"
            value={form.primaryColor}
            fallback={BD_APP_DEFAULT_COLORS.primary}
            onChange={(primaryColor) => onChange({ primaryColor })}
          />
          {BD_APP_THEME_TOKENS.map((token) => (
            <ColorField
              key={token}
              label={token}
              value={form.colors[token]}
              fallback={BD_APP_DEFAULT_COLORS[token]}
              onChange={(value) =>
                onChange({ colors: { ...form.colors, [token]: value } })
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.published}
            onChange={(e) => onChange({ published: e.target.checked })}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-600">
              Published
            </span>
            <span className="text-[11px] text-slate-400">
              Shows as published in the app list; opening the app is not
              affected.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
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

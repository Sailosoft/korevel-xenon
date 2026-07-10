// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCSettingsModal Component
// Full-cover HeroUI modal for editing app settings stored in DexieDB.
// Settings are key-value pairs supporting text, textarea, boolean (toggle), etc.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Checkbox, Button } from "@heroui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { lcDB } from "./LCDatabase";
import { LC_SETTINGS_FIELDS } from "./LCInterface";
import type { LCSettingsField } from "./LCInterface";

export interface LCSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LCSettingsModal({
  isOpen,
  onOpenChange,
}: LCSettingsModalProps) {
  // Read all stored settings from DexieDB as a live query
  const storedEntries: { key: string; value: string }[] =
    useLiveQuery(() => lcDB.appSettings.toArray(), []) || [];

  // ── Local draft state: initialised when modal opens ─────────────────────
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  // Start as false so the first mount with isOpen=true still initialises draft
  const prevOpenRef = useRef(false);

  // Only initialise draft values when the modal opens (transition false → true).
  // We do NOT depend on storedEntries here to prevent render loops from
  // useLiveQuery returning new array references.
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Build a current snapshot from stored entries
      const merged: Record<string, string> = {};
      for (const field of LC_SETTINGS_FIELDS) {
        const entry = storedEntries.find((e) => e.key === field.key);
        merged[field.key] = entry?.value ?? field.defaultValue;
      }
      setDraftValues(merged);
    }
    prevOpenRef.current = isOpen;
    // storedEntries is intentionally excluded to prevent render loops.
    // Draft is only synced on modal open — changes made elsewhere while the
    // modal is open won't auto-refresh, which is acceptable UX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = useCallback(
    (key: string, value: string) => {
      setDraftValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(draftValues)) {
        await lcDB.setSetting(key, value);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[lemon-coder] Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  }, [draftValues, onOpenChange]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    try {
      for (const field of LC_SETTINGS_FIELDS) {
        await lcDB.resetSetting(field.key);
      }
      // Reset draft to defaults
      const defaults: Record<string, string> = {};
      for (const field of LC_SETTINGS_FIELDS) {
        defaults[field.key] = field.defaultValue;
      }
      setDraftValues(defaults);
    } catch (err) {
      console.error("[lemon-coder] Failed to reset settings:", err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Compute whether draft differs from stored values — memoized as a string
  // comparison to avoid deriving a new object each render.
  const hasChanges = (() => {
    if (Object.keys(draftValues).length === 0) return false;
    const originalValues: Record<string, string> = {};
    for (const field of LC_SETTINGS_FIELDS) {
      const entry = storedEntries.find((e) => e.key === field.key);
      originalValues[field.key] = entry?.value ?? field.defaultValue;
    }
    return JSON.stringify(draftValues) !== JSON.stringify(originalValues);
  })();

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">
              Settings
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto">
              {LC_SETTINGS_FIELDS.map((field) => (
                <SettingsField
                  key={field.key}
                  field={field}
                  value={draftValues[field.key] ?? field.defaultValue}
                  onChange={(val) => handleChange(field.key, val)}
                />
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                variant="ghost"
                size="sm"
                onPress={handleReset}
                isDisabled={isSaving}
                className="text-xs text-[#858585] hover:text-white hover:bg-[#333333]"
              >
                Reset to Defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => onOpenChange(false)}
                  className="text-xs text-[#858585] hover:text-white hover:bg-[#333333]"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleSave}
                  isDisabled={!hasChanges || isSaving}
                  className={`text-xs font-medium ${
                    hasChanges && !isSaving
                      ? "bg-[#e5c07b] text-[#1e1e1e] hover:bg-[#d4a84b]"
                      : "bg-[#333333] text-[#666]"
                  }`}
                >
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

// ── Sub-component: single setting field ─────────────────────────────────────

function SettingsField({
  field,
  value,
  onChange,
}: {
  field: LCSettingsField;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (field.type) {
    case "boolean":
      return (
        <Checkbox
          id={`setting-${field.key}`}
          isSelected={value === "true"}
          onChange={(selected: boolean) => onChange(selected ? "true" : "false")}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-[#d4d4d4] font-medium">
                {field.label}
              </span>
              {field.description && (
                <span className="text-[11px] text-[#858585] leading-relaxed">
                  {field.description}
                </span>
              )}
            </div>
          </Checkbox.Content>
        </Checkbox>
      );

    case "number":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#d4d4d4] font-medium">
            {field.label}
          </label>
          {field.description && (
            <p className="text-[11px] text-[#858585] leading-relaxed">
              {field.description}
            </p>
          )}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 text-sm bg-[#2d2d2d] border border-[#444444] rounded text-[#d4d4d4] focus:outline-none focus:border-[#e5c07b] focus:ring-1 focus:ring-[#e5c07b]/30"
          />
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#d4d4d4] font-medium">
            {field.label}
          </label>
          {field.description && (
            <p className="text-[11px] text-[#858585] leading-relaxed">
              {field.description}
            </p>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 text-sm bg-[#2d2d2d] border border-[#444444] rounded text-[#d4d4d4] focus:outline-none focus:border-[#e5c07b] focus:ring-1 focus:ring-[#e5c07b]/30"
          />
        </div>
      );

    case "textarea":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#d4d4d4] font-medium">
            {field.label}
          </label>
          {field.description && (
            <p className="text-[11px] text-[#858585] leading-relaxed">
              {field.description}
            </p>
          )}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full mt-1 px-3 py-1.5 text-sm bg-[#2d2d2d] border border-[#444444] rounded text-[#d4d4d4] focus:outline-none focus:border-[#e5c07b] focus:ring-1 focus:ring-[#e5c07b]/30 resize-y"
          />
        </div>
      );

    case "select":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#d4d4d4] font-medium">
            {field.label}
          </label>
          {field.description && (
            <p className="text-[11px] text-[#858585] leading-relaxed">
              {field.description}
            </p>
          )}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 text-sm bg-[#2d2d2d] border border-[#444444] rounded text-[#d4d4d4] focus:outline-none focus:border-[#e5c07b] focus:ring-1 focus:ring-[#e5c07b]/30"
          >
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    default:
      return (
        <div className="text-xs text-[#858585]">
          Unknown field type: {field.type}
        </div>
      );
  }
}

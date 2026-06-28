"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Input, Toast, toast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThoughtAssociation, BKAssociationSlotValue } from "./BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";

export default function BKThoughtAssociationDetailPage({
  associationId,
}: {
  associationId: string;
}) {
  const router = useRouter();
  const [association, setAssociation] = useState<BKThoughtAssociation | null>(null);
  const [pattern, setPattern] = useState<BKThoughtPattern | null>(null);
  const [slotValues, setSlotValues] = useState<BKAssociationSlotValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bkLoadAssociation();
  }, [associationId]);

  const bkLoadAssociation = async () => {
    try {
      const result = await bkThinkerDB.thoughtAssociationsRepo.get(associationId);
      if (result.isSuccess) {
        setAssociation(result.value);
        setSlotValues(result.value.slotValues || []);

        // Load the associated pattern for slot definitions
        const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(result.value.patternId);
        if (patternResult.isSuccess) {
          setPattern(patternResult.value);
        }
      }
    } catch (err) {
      console.error("Failed to load association:", err);
    } finally {
      setLoading(false);
    }
  };

  const bkUpdateSlotValue = (slotId: string, value: string) => {
    const existing = slotValues.findIndex((sv) => sv.slotId === slotId);
    if (existing >= 0) {
      const updated = [...slotValues];
      updated[existing] = { ...updated[existing], value };
      setSlotValues(updated);
    } else {
      setSlotValues([...slotValues, { slotId, value }]);
    }
  };

  const bkSaveSlotValues = async () => {
    if (!association) return;
    setSaving(true);
    try {
      await bkThinkerDB.thoughtAssociationsRepo.update(associationId, {
        ...association,
        slotValues,
        updatedAt: Date.now(),
      } as BKThoughtAssociation);
      toast.success("Slot values saved successfully!");
    } catch (err) {
      console.error("Failed to save slot values:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!association) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Association not found.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onPress={() => router.push("/modules/bunny-thinker/thought-associations")}
        >
          <ArrowLeft size={16} /> Back to Associations
        </Button>
      </div>
    );
  }

  return (
    <>
      <Toast.Provider />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push("/modules/bunny-thinker/thought-associations")}
            isIconOnly
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {association.name}
            </h1>
            <p className="text-sm text-gray-500">
              {pattern
                ? `Pattern: ${pattern.name} — `
                : `Pattern: ${association.patternId} — `}
              {association.description || "Edit slot values for this association"}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onPress={bkSaveSlotValues}
          isDisabled={saving}
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Slot Values"}
        </Button>
      </div>

      {/* Slot Values Section */}
      <Card className="p-4 border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">
            Slot Values ({slotValues.length})
          </h2>
        </div>

        {!pattern || pattern.slots.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">
            {pattern
              ? "This pattern has no slots defined. No values to configure."
              : "Pattern not found or has no slots."}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Fill in values for each slot defined by the &ldquo;{pattern.name}&rdquo; pattern:
            </p>
            {pattern.slots.map((slot) => {
              const slotVal = slotValues.find((sv) => sv.slotId === slot.id);
              const value = slotVal?.value ?? slot.defaultValue ?? "";

              return (
                <div key={slot.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {slot.label || slot.name}
                    {slot.required && <span className="text-red-500 ml-0.5">*</span>}
                    <span className="text-xs text-gray-400 ml-2">({slot.type})</span>
                  </label>
                  {slot.type === "textarea" ? (
                    <textarea
                      className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all resize-y"
                      placeholder={`Enter ${slot.name}`}
                      value={value}
                      onChange={(e) => bkUpdateSlotValue(slot.id, e.target.value)}
                    />
                  ) : (
                    <Input
                      placeholder={`Enter ${slot.name}`}
                      value={value}
                      onChange={(e) => bkUpdateSlotValue(slot.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
    </>
  );
}

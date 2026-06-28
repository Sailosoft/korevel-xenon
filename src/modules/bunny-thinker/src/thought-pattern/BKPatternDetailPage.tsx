"use client";

import React, { useEffect, useState, useCallback } from "react";
import { v7 as uuidv7 } from "uuid";
import { Button, Card, Input, TextArea, Select, ListBox, Toast, toast } from "@heroui/react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThoughtPattern, BKPatternMemorySlot } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";

export default function BKPatternDetailPage({
  patternId,
}: {
  patternId: string;
}) {
  const router = useRouter();
  const [pattern, setPattern] = useState<BKThoughtPattern | null>(null);
  const [associations, setAssociations] = useState<BKThoughtAssociation[]>([]);
  const [slots, setSlots] = useState<BKPatternMemorySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bkLoadPattern();
  }, [patternId]);

  const bkLoadPattern = async () => {
    try {
      const result = await bkThinkerDB.thoughtPatternsRepo.get(patternId);
      if (result.isSuccess) {
        setPattern(result.value);
        setSlots(result.value.slots || []);
      }

      // Load associations for this pattern
      const assocResult = await bkThinkerDB.thoughtAssociationsRepo.query.getAll({
        page: 0,
        pageSize: 100,
        filters: [],
      });
      const filtered = assocResult.data.filter(
        (a: BKThoughtAssociation) => a.patternId === patternId,
      );
      setAssociations(filtered);
    } catch (err) {
      console.error("Failed to load pattern:", err);
    } finally {
      setLoading(false);
    }
  };

  const bkAddSlot = () => {
    setSlots([
      ...slots,
      {
        id: uuidv7(),
        name: "",
        type: "text" as const,
        defaultValue: "",
        required: false,
      },
    ]);
  };

  const bkUpdateSlot = (index: number, updates: Partial<BKPatternMemorySlot>) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], ...updates };
    setSlots(updated);
  };

  const bkRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const bkSaveSlots = async () => {
    if (!pattern) return;
    setSaving(true);
    try {
      await bkThinkerDB.thoughtPatternsRepo.update(patternId, {
        ...pattern,
        slots,
        updatedAt: Date.now(),
      } as BKThoughtPattern);
      toast.success("Slots saved successfully!");
    } catch (err) {
      console.error("Failed to save slots:", err);
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

  if (!pattern) {
    return <div className="text-center py-12 text-gray-500">Pattern not found.</div>;
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
            onPress={() => router.push("/modules/bunny-thinker/thought-patterns")}
            isIconOnly
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {pattern.name}
            </h1>
            <p className="text-sm text-gray-500">
              {pattern.group && `Group: ${pattern.group} — `}
              {pattern.description || "Configure pattern slots and associations"}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onPress={bkSaveSlots}
          isDisabled={saving}
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Slots"}
        </Button>
      </div>

      {/* Slots Section */}
      <Card className="p-4 border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">
            Memory Slots ({slots.length})
          </h2>
          <Button size="sm" variant="secondary" onPress={bkAddSlot}>
            <Plus size={16} /> Add Slot
          </Button>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">
            No slots defined. Add variables that this pattern will use.
          </p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    placeholder="Slot name"
                    value={slot.name}
                    onChange={(e) =>
                      bkUpdateSlot(index, { name: e.target.value })
                    }
                  />
                  <Select
                    value={slot.type}
                    onChange={(val) =>
                      bkUpdateSlot(index, {
                        type: val as BKPatternMemorySlot["type"],
                      })
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="text" textValue="text">Text</ListBox.Item>
                        <ListBox.Item key="textarea" textValue="textarea">Textarea</ListBox.Item>
                        <ListBox.Item key="editor" textValue="editor">Editor</ListBox.Item>
                        <ListBox.Item key="code-editor" textValue="code-editor">Code Editor</ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Input
                    placeholder="Default value"
                    value={slot.defaultValue}
                    onChange={(e) =>
                      bkUpdateSlot(index, { defaultValue: e.target.value })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={slot.required}
                        onChange={(e) =>
                          bkUpdateSlot(index, { required: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      Required
                    </label>
                    <Button
                      size="sm"
                      variant="danger"
                      isIconOnly
                      onPress={() => bkRemoveSlot(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Associations Section */}
      <Card className="p-4 border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">
            Linked Associations ({associations.length})
          </h2>
          <a
            href={`/modules/bunny-thinker/thought-associations`}
          >
            <Button size="sm" variant="primary">
              <Plus size={16} /> New Association
            </Button>
          </a>
        </div>

        {associations.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">
            No associations linked to this pattern. Create associations to fill
            pattern slots with custom values.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {associations.map((assoc) => (
              <div
                key={assoc.id}
                className="py-3 flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-sm text-gray-900">
                    {assoc.name}
                  </h3>
                  {assoc.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {assoc.description}
                    </p>
                  )}
                  <div className="flex gap-1 mt-1">
                    {assoc.slotValues.map((sv, i) => (
                      <span
                        key={sv.slotId}
                        className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700"
                      >
                        Slot {i + 1}: {sv.value?.substring(0, 20)}
                        {sv.value?.length > 20 ? "..." : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
    </>
  );
}

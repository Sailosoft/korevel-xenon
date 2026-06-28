"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Select, ListBox, Label } from "@heroui/react";
import type {
  BunnyFieldRendererProps,
  BunnySelectOption,
} from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThought } from "../thoughts/BKThoughts.Types";

/**
 * Custom select field for Thought Association that filters options
 * based on the selected Thought's thought pattern (patternId).
 *
 * When a thought is selected, only associations matching that thought's
 * patternId are shown. When no thought is selected, all associations
 * are available.
 */
export default function BKProcessAssociationSelect({
  field,
  value,
  onChange,
  error,
  formData,
}: BunnyFieldRendererProps<Record<string, unknown>>) {
  const [options, setOptions] = useState<BunnySelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noPatternLabel, setNoPatternLabel] = useState<string | null>(null);

  const bkLoadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const thoughtId = formData?.thoughtId as string | undefined;

      if (thoughtId) {
        // Look up the selected thought to get its patternId
        const thoughtResult = await bkThinkerDB.thoughtsRepo.get(thoughtId);
        if (thoughtResult.isSuccess) {
          const thought = thoughtResult.value as BKThought;
          if (thought.patternId) {
            // Filter associations by the thought's patternId
            const filtered =
              await bkThinkerDB.thoughtAssociationsRepo.toSelectOptionsByPatternId(
                thought.patternId,
              );
            setOptions(filtered);
            setNoPatternLabel(null);
          } else {
            // Thought has no pattern assigned — no associations can match
            setOptions([]);
            setNoPatternLabel(
              `"${thought.name}" has no thought pattern assigned`,
            );
          }
        } else {
          setOptions([]);
          setNoPatternLabel("Thought not found");
        }
      } else {
        // No thought selected yet — show all associations
        const all =
          await bkThinkerDB.thoughtAssociationsRepo.toSelectOptions();
        setOptions(all);
        setNoPatternLabel(null);
      }
    } catch (err) {
      console.error("Failed to load association options:", err);
      setOptions([]);
      setNoPatternLabel("Failed to load associations");
    } finally {
      setIsLoading(false);
    }
  }, [formData?.thoughtId]);

  useEffect(() => {
    bkLoadOptions();
  }, [bkLoadOptions]);

  const handleChange = useCallback(
    (val: unknown) => {
      const stringVal = String(val);
      // Find matching option to preserve type
      const matched = options.find((o) => String(o.value) === stringVal);
      onChange(field.name, matched ? matched.value : stringVal);
    },
    [onChange, field.name, options],
  );

  const showError = !!error;
  const currentValue = value != null ? String(value) : null;

  return (
    <div className="flex flex-col gap-1 w-full">
      <Label htmlFor={`process-association-select`}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select
        id="process-association-select"
        aria-label={field.label}
        value={currentValue}
        onChange={(val) => handleChange(val)}
        placeholder={
          isLoading
            ? "Loading associations..."
            : noPatternLabel
              ? "Select a thought first"
              : field.placeholder
        }
        isDisabled={isLoading || !!noPatternLabel}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          {isLoading ? (
            <ListBox key="loading-state">
              <ListBox.Item
                key="loading-item"
                id="loading"
                textValue="Loading options..."
                className="text-default-400 italic"
              >
                Loading options...
              </ListBox.Item>
            </ListBox>
          ) : noPatternLabel ? (
            <ListBox key="no-pattern-state">
              <ListBox.Item
                key="no-pattern-item"
                id="no-pattern"
                textValue={noPatternLabel}
                className="text-default-400 italic"
              >
                {noPatternLabel}
              </ListBox.Item>
            </ListBox>
          ) : options.length === 0 ? (
            <ListBox key="empty-state">
              <ListBox.Item
                key="empty-item"
                id="empty"
                textValue="No associations found"
                className="text-default-400 italic"
              >
                No matching associations
              </ListBox.Item>
            </ListBox>
          ) : (
            <ListBox key="ready-state">
              {options.map((opt) => (
                <ListBox.Item
                  key={String(opt.value)}
                  id={String(opt.value)}
                  textValue={opt.label}
                >
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          )}
        </Select.Popover>
      </Select>
      {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

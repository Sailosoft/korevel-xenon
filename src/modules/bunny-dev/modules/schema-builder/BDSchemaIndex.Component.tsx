"use client";

// BDSchemaIndex.Component — add or edit one index by picking its columns.

import { useState } from "react";
import { ListTree } from "lucide-react";
import type { BDSchemaIndex } from "../../BDDomain.Types";
import { BDSchemaIndexType } from "../../BDDomain.Types";
import { BD_SCHEMA_INDEX_TYPE_OPTIONS } from "./BDSchemaBuilder.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDSchemaIndexComponentProps {
  open: boolean;
  /** Index to edit, or `null` for a new one. */
  index: BDSchemaIndex | null;
  /** Column names available on the model being edited. */
  columns: string[];
  onClose: () => void;
  onSave: (index: BDSchemaIndex) => void;
}

export function BDSchemaIndexComponent({
  open,
  index,
  columns,
  onClose,
  onSave,
}: BDSchemaIndexComponentProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BDSchemaIndex["type"]>(
    BDSchemaIndexType.index,
  );
  const [selected, setSelected] = useState<string[]>([]);

  const indexKey = index
    ? `${index.name ?? ""}:${index.type}:${index.columns.join(",")}`
    : "new";
  const modalKey = `${open}:${indexKey}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setName(index?.name ?? "");
    setType(index?.type ?? BDSchemaIndexType.index);
    setSelected(
      (index?.columns ?? []).filter((column) => columns.includes(column)),
    );
  }

  const toggle = (column: string) =>
    setSelected((prev) =>
      prev.includes(column)
        ? prev.filter((entry) => entry !== column)
        : [...prev, column],
    );

  const isEditing = index !== null;

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit index" : "Add index"}
      description="Pick the columns this index covers."
      size="md"
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton
            icon={ListTree}
            disabled={selected.length === 0}
            onClick={() =>
              onSave({
                name: name.trim() || undefined,
                columns: selected,
                type,
              })
            }
          >
            {isEditing ? "Save index" : "Add index"}
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Name (optional)</span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="e.g. users_email_idx"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={type}
              onChange={(event) =>
                setType(event.target.value as BDSchemaIndex["type"])
              }
            >
              {BD_SCHEMA_INDEX_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Columns ({selected.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                onClick={() => setSelected(columns)}
              >
                Select all
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                onClick={() => setSelected([])}
              >
                Clear
              </button>
            </div>
          </div>
          {columns.length === 0 ? (
            <p className="text-xs text-slate-400">
              Add columns to this model before creating an index.
            </p>
          ) : (
            <div className="bd-scroll grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
              {columns.map((column) => (
                <label
                  key={column}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(column)}
                    onChange={() => toggle(column)}
                  />
                  <span className="truncate font-mono text-xs">{column}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </BDModal>
  );
}

export default BDSchemaIndexComponent;

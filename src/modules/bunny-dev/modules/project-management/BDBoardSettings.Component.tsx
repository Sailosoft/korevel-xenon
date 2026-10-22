"use client";

// BDBoardSettings.Component — per-board settings modal: rename the board,
// manage its sections (columns), and manage custom fields.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { v7 as uuidv7 } from "uuid";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import type {
  BDBoardColumn,
  BDBoardCustomField,
  BDCustomFieldType,
} from "../../BDDomain.Types";
import { BDCustomFieldType as CustomFieldType } from "../../BDDomain.Types";
import { bdDB } from "../../BDDatabase";
import { useBDBoardColumns } from "./BDTask.Hooks";
import {
  bdBoardColumnRepository,
  bdBoardRepository,
} from "./BDTask.Repository";
import {
  BD_BOARD_CARD_CHIPS,
  BD_DEFAULT_CARD_CHIPS,
  createBoardColumn,
  customChipId,
} from "./BDTask.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

export interface BDBoardSettingsComponentProps {
  open: boolean;
  boardId: string | undefined;
  onClose: () => void;
}

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400";

const CUSTOM_FIELD_TYPES: { label: string; value: BDCustomFieldType }[] = [
  { label: "Text", value: CustomFieldType.text },
  { label: "Long text", value: CustomFieldType.textarea },
  { label: "Number", value: CustomFieldType.number },
  { label: "Date", value: CustomFieldType.date },
  { label: "Select", value: CustomFieldType.select },
];

function parseOptions(value: string): string[] {
  return value
    .split("\n")
    .map((option) => option.trim())
    .filter((option, index, list) => !!option && list.indexOf(option) === index);
}

function swap<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BDBoardSettingsComponent({
  open,
  boardId,
  onClose,
}: BDBoardSettingsComponentProps) {
  const { toast } = useBDToast();
  const board = useLiveQuery(
    async () => (boardId ? ((await bdDB.boards.get(boardId)) ?? null) : null),
    [boardId],
  );
  const columns = useBDBoardColumns(boardId);
  const tasks = useLiveQuery(
    async () =>
      boardId
        ? bdDB.boardTasks.where("boardId").equals(boardId).toArray()
        : [],
    [boardId],
  );

  const settingsKey = `${open}:${board?.id ?? "none"}`;
  const [name, setName] = useState("");
  const [boardKey, setBoardKey] = useState("");
  const [fields, setFields] = useState<BDBoardCustomField[]>([]);
  const [chips, setChips] = useState<string[]>(BD_DEFAULT_CARD_CHIPS);
  const [newColumnName, setNewColumnName] = useState("");
  const [prevKey, setPrevKey] = useState(settingsKey);
  if (settingsKey !== prevKey) {
    setPrevKey(settingsKey);
    setName(board?.name ?? "");
    setBoardKey(board?.key ?? "");
    setFields(board?.customFields ?? []);
    setChips(board?.cardChips ?? BD_DEFAULT_CARD_CHIPS);
    setNewColumnName("");
  }

  const renameBoard = async () => {
    if (!boardId || !name.trim()) return;
    const patch: { name: string; key?: string } = { name: name.trim() };
    const trimmedKey = boardKey.trim().toUpperCase();
    if (board && trimmedKey && trimmedKey !== board.key) {
      patch.key = await bdBoardRepository.uniqueBoardKey(
        board.projectId,
        trimmedKey,
      );
    }
    await bdBoardRepository.update(boardId, patch);
    if (patch.key) setBoardKey(patch.key);
    toast({ title: "Board saved", status: "success" });
  };

  const addColumn = async () => {
    if (!boardId || !newColumnName.trim()) return;
    const nextPosition = (columns ?? []).reduce(
      (max, c) => Math.max(max, c.position ?? 0),
      -1,
    );
    await bdBoardColumnRepository.create(
      createBoardColumn(boardId, newColumnName.trim(), nextPosition + 1),
    );
    setNewColumnName("");
  };

  const renameColumn = async (column: BDBoardColumn, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === column.name) return;
    await bdBoardColumnRepository.update(column.id, {
      name: trimmed,
      status: { ...column.status, name: trimmed },
    });
  };

  const moveColumn = async (column: BDBoardColumn, direction: -1 | 1) => {
    const list = columns ?? [];
    const index = list.findIndex((c) => c.id === column.id);
    const target = list[index + direction];
    if (!target) return;
    await bdBoardColumnRepository.update(column.id, {
      position: target.position,
      status: { ...column.status, position: target.position },
    });
    await bdBoardColumnRepository.update(target.id, {
      position: column.position,
      status: { ...target.status, position: column.position },
    });
  };

  const deleteColumn = async (column: BDBoardColumn) => {
    const count = (tasks ?? []).filter(
      (t) => t.columnId === column.id || t.status === column.status.name,
    ).length;
    if (count > 0) {
      toast({
        title: `Move ${count} task${count === 1 ? "" : "s"} out of this section first`,
        status: "error",
      });
      return;
    }
    await bdBoardColumnRepository.delete(column.id);
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: uuidv7(),
        name: "",
        slug: "",
        type: CustomFieldType.text,
        position: prev.length,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<BDBoardCustomField>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) =>
      swap(prev, index, index + direction).map((field, position) => ({
        ...field,
        position,
      })),
    );
  };

  const saveFields = async () => {
    if (!boardId) return;
    const cleaned = fields
      .filter((field) => field.name.trim())
      .map((field, position) => ({
        ...field,
        name: field.name.trim(),
        slug: slugify(field.slug || field.name),
        position,
        options:
          field.type === CustomFieldType.select
            ? Array.from(new Set(parseOptions((field.options ?? []).join("\n"))))
            : undefined,
      }));
    await bdBoardRepository.update(boardId, { customFields: cleaned });
    setFields(cleaned);
    toast({ title: "Custom fields saved", status: "success" });
  };

  const toggleChip = (id: string) =>
    setChips((prev) =>
      prev.includes(id) ? prev.filter((chip) => chip !== id) : [...prev, id],
    );

  const saveChips = async () => {
    if (!boardId) return;
    await bdBoardRepository.update(boardId, { cardChips: chips });
    toast({ title: "Card chips saved", status: "success" });
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      title="Board settings"
      description="Rename the board, manage its sections, and define custom fields."
      closeOnBackdrop={false}
    >
      <div className="flex flex-col gap-6">
        {/* Rename board */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Board
          </h3>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={cn(FIELD, "flex-1")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Key</span>
                <input
                  className={cn(FIELD, "w-28 font-mono uppercase")}
                  value={boardKey}
                  placeholder="KEY"
                  onChange={(e) => setBoardKey(e.target.value.toUpperCase())}
                />
              </label>
              <BDButton
                size="sm"
                icon={Save}
                disabled={
                  !name.trim() ||
                  (name.trim() === board?.name &&
                    boardKey.trim().toUpperCase() === (board?.key ?? ""))
                }
                onClick={renameBoard}
              >
                Save
              </BDButton>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sections
          </h3>
          <div className="flex flex-col gap-2">
            {(columns ?? []).map((column, index) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
              >
                <input
                  className={cn(FIELD, "flex-1")}
                  defaultValue={column.name}
                  onBlur={(e) => renameColumn(column, e.target.value)}
                />
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveColumn(column, -1)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move section up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === (columns?.length ?? 0) - 1}
                  onClick={() => moveColumn(column, 1)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move section down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteColumn(column)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              className={FIELD}
              placeholder="New section name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              disabled={!newColumnName.trim()}
              onClick={addColumn}
            >
              Add
            </BDButton>
          </div>
        </section>

        {/* Custom fields */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Custom fields
            </h3>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={addField}
            >
              Add field
            </BDButton>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-slate-400">
              No custom fields. Add one to capture extra task data.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-slate-200 bg-white p-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      className={cn(FIELD, "flex-1")}
                      placeholder="Field name"
                      value={field.name}
                      onChange={(e) =>
                        updateField(field.id, { name: e.target.value })
                      }
                    />
                    <select
                      className={cn(FIELD, "w-32")}
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, {
                          type: e.target.value as BDCustomFieldType,
                        })
                      }
                    >
                      {CUSTOM_FIELD_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move field up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => moveField(index, 1)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move field down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className={cn(FIELD, "mt-2 font-mono text-xs")}
                    placeholder="slug"
                    value={field.slug}
                    onChange={(e) =>
                      updateField(field.id, { slug: e.target.value })
                    }
                  />
                  {field.type === CustomFieldType.select ? (
                    <textarea
                      className={cn(FIELD, "mt-2 min-h-[64px] resize-y text-xs")}
                      placeholder="One option per line"
                      value={(field.options ?? []).join("\n")}
                      onChange={(e) =>
                        updateField(field.id, {
                          options: e.target.value.split("\n"),
                        })
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {fields.length > 0 && (
            <div className="flex justify-end">
              <BDButton size="sm" icon={Save} onClick={saveFields}>
                Save custom fields
              </BDButton>
            </div>
          )}
        </section>

        {/* Card chips */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Card chips
          </h3>
          <p className="text-xs text-slate-500">
            Choose which chips appear on task cards.
          </p>
          <div className="flex flex-wrap gap-3">
            {BD_BOARD_CARD_CHIPS.map((chip) => (
              <label
                key={chip.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
              >
                <input
                  type="checkbox"
                  checked={chips.includes(chip.id)}
                  onChange={() => toggleChip(chip.id)}
                />
                {chip.label}
              </label>
            ))}
            {fields
              .filter((field) => field.name.trim())
              .map((field) => {
                const id = customChipId(slugify(field.slug || field.name));
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={chips.includes(id)}
                      onChange={() => toggleChip(id)}
                    />
                    {field.name}
                  </label>
                );
              })}
          </div>
          <div className="flex justify-end">
            <BDButton size="sm" icon={Save} onClick={saveChips}>
              Save card chips
            </BDButton>
          </div>
        </section>
      </div>
    </BDModal>
  );
}

export default BDBoardSettingsComponent;

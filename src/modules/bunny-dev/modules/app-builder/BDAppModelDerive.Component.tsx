"use client";

// BDAppModelDerive — two-step picker for deriving form fields or table
// columns: first choose a schema group, then choose one of its models.
// The parent applies the derivation on selection.

import { useMemo, useState } from "react";
import { ArrowLeft, Database, Folder, Search } from "lucide-react";
import type { BDSchemaModel } from "../../BDDomain.Types";
import {
  useBDSchemaGroups,
  useBDSchemaModels,
} from "../schema-builder/BDSchemaBuilder.Hooks";
import BDModal from "../../components/BDModal";

export interface BDAppModelDeriveProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Derivation target — only affects the copy. */
  kind: "fields" | "columns";
  onSelect: (model: BDSchemaModel) => void;
}

export function BDAppModelDerive({
  open,
  onClose,
  projectId,
  kind,
  onSelect,
}: BDAppModelDeriveProps) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const groups = useBDSchemaGroups(projectId);
  const models = useBDSchemaModels(groupId ?? undefined);

  // Reset the picker whenever it is dismissed (render-time adjustment, not an
  // effect — same pattern as the builder's deep-link loader).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setGroupId(null);
      setQuery("");
    }
  }

  const group = groups?.find((g) => g.id === groupId) ?? null;

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = groups ?? [];
    return q ? rows.filter((g) => g.name.toLowerCase().includes(q)) : rows;
  }, [groups, query]);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = models ?? [];
    return q ? rows.filter((m) => m.name.toLowerCase().includes(q)) : rows;
  }, [models, query]);

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? `Derive ${kind} — ${group.name}` : `Derive ${kind}`}
      description={
        group
          ? "Pick the schema model to derive from."
          : "Pick a schema group first."
      }
    >
      <div className="flex flex-col gap-3">
        {group && (
          <button
            type="button"
            onClick={() => {
              setGroupId(null);
              setQuery("");
            }}
            className="flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All groups
          </button>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-sm outline-none focus:border-blue-400"
            placeholder={group ? "Search models…" : "Search groups…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {!group ? (
          filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              {groups === undefined
                ? "Loading schema groups…"
                : groups.length === 0
                  ? "No schema groups in this project yet — build one in the Schema Builder first."
                  : "No group matches the search."}
            </p>
          ) : (
            <div className="bd-scroll flex max-h-80 flex-col gap-1 overflow-y-auto">
              {filteredGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGroupId(g.id);
                    setQuery("");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700">
                      {g.name}
                    </span>
                    {g.description && (
                      <span className="block truncate text-[11px] text-slate-400">
                        {g.description}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : filteredModels.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            {(models ?? []).length === 0
              ? "This group has no models yet."
              : "No model matches the search."}
          </p>
        ) : (
          <div className="bd-scroll flex max-h-80 flex-col gap-1 overflow-y-auto">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <Database className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">
                    {model.name}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {model.properties.length} properties
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BDModal>
  );
}

export default BDAppModelDerive;

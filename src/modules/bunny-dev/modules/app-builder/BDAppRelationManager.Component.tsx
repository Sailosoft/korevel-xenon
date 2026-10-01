"use client";

// BDAppRelationManager — Filament-style relation manager for the view modal.
//
// Extracted from the App Rendering engine so each connection type is rendered
// (and can evolve) independently:
//   - oneToMany  : inline child CRUD + client search/pagination
//   - manyToMany : searchable attach/detach + reorder, persisted on the owner
//   - oneToOne   : read-only inverse summary with an open action

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlink,
} from "lucide-react";
import type {
  BDAppColumn,
  BDAppConnection,
  BDAppField,
  BDAppRecord,
  BDAppResource,
} from "../../BDDomain.Types";
import { connectionKey, findInverseConnection } from "./BDApp.Types";
import { bdAppRecordRepository } from "./BDApp.Repository";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDBadge from "../../components/BDBadge";

export interface BDAppRelationManagerProps {
  connection: BDAppConnection;
  ownerResource: BDAppResource;
  /** The owner record currently open in the view modal. */
  viewing: BDAppRecord;
  target: BDAppResource;
  allRecords: BDAppRecord[];
  fieldsForResource: (resource: BDAppResource) => BDAppField[];
  columnsForResource: (resource: BDAppResource) => BDAppColumn[];
  renderCell: (
    name: string,
    row: BDAppRecord,
    resource?: BDAppResource,
  ) => ReactNode;
  onCreateChild: (connection: BDAppConnection) => void;
  onEditChild: (connection: BDAppConnection, row: BDAppRecord) => void;
  onDeleteChild: (row: BDAppRecord) => void;
  /** Open another record in the view modal (1:1 inverse / linked records). */
  onViewRecord: (row: BDAppRecord) => void;
}

export function BDAppRelationManager({
  connection,
  ownerResource,
  viewing,
  target,
  allRecords,
  fieldsForResource,
  columnsForResource,
  renderCell,
  onCreateChild,
  onEditChild,
  onDeleteChild,
  onViewRecord,
}: BDAppRelationManagerProps) {
  const key = connectionKey(connection, ownerResource.slug);
  const perPage = connection.relationManager?.perPage ?? 5;
  const searchable = connection.relationManager?.searchable !== false;

  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachQuery, setAttachQuery] = useState("");
  const [attachSelected, setAttachSelected] = useState<string[]>([]);

  const targetRecords = useMemo(
    () => allRecords.filter((r) => r.resourceSlug === target.slug),
    [allRecords, target.slug],
  );

  const ids = useMemo(
    () => (Array.isArray(viewing.data[key]) ? (viewing.data[key] as string[]) : []),
    [viewing.data, key],
  );

  const linkedRows = useMemo(() => {
    if (connection.type === "oneToMany") {
      return targetRecords.filter((r) => r.data[key] === viewing.id);
    }
    if (connection.type === "manyToMany") {
      return ids
        .map((id) => targetRecords.find((r) => r.id === id))
        .filter((r): r is BDAppRecord => Boolean(r));
    }
    // oneToOne — forward link stored on the owner, falling back to an inverse
    // connection configured on the target.
    const forward = targetRecords.find((r) => r.id === viewing.data[key]);
    if (forward) return [forward];
    const inverseKey = findInverseConnection(
      target,
      ownerResource.slug,
      connection,
    )?.name;
    return targetRecords
      .filter((r) => {
        if (inverseKey) return r.data[inverseKey] === viewing.id;
        return Object.values(r.data).some((v) =>
          Array.isArray(v) ? v.includes(viewing.id) : v === viewing.id,
        );
      })
      .slice(0, 1);
  }, [
    connection,
    target,
    ownerResource.slug,
    targetRecords,
    ids,
    key,
    viewing.data,
    viewing.id,
  ]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return linkedRows;
    const q = query.toLowerCase();
    return linkedRows.filter((row) =>
      Object.values(row.data).some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [linkedRows, query, searchable]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * perPage,
    safePage * perPage + perPage,
  );

  const targetColumnsRaw = columnsForResource(target).slice(0, 5);
  const targetColumns: { name: string; label?: string }[] =
    targetColumnsRaw.length > 0
      ? targetColumnsRaw
      : fieldsForResource(target)
          .slice(0, 4)
          .map((f) => ({ name: f.name, label: f.label }));

  const title =
    connection.label ?? target.pluralLabel ?? target.label ?? target.name;
  const editable = !connection.readOnly;

  const persistIds = async (next: string[]) => {
    await bdAppRecordRepository.update(viewing.id, {
      data: { ...viewing.data, [key]: next },
    });
  };

  const openAttach = () => {
    setAttachSelected([]);
    setAttachQuery("");
    setAttachOpen(true);
  };

  const confirmAttach = async () => {
    if (attachSelected.length === 0) {
      setAttachOpen(false);
      return;
    }
    await persistIds([...ids, ...attachSelected]);
    setAttachOpen(false);
  };

  const detach = async (row: BDAppRecord) => {
    await persistIds(ids.filter((id) => id !== row.id));
  };

  const move = async (row: BDAppRecord, direction: -1 | 1) => {
    const index = ids.indexOf(row.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const reordered = [...ids];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    await persistIds(reordered);
  };

  const candidates = useMemo(() => {
    const selected = new Set(ids);
    const available = targetRecords.filter((r) => !selected.has(r.id));
    if (!attachQuery.trim()) return available;
    const q = attachQuery.toLowerCase();
    return available.filter((row) =>
      Object.values(row.data).some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [targetRecords, ids, attachQuery]);

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {title}
          <span className="text-xs text-slate-400">({linkedRows.length})</span>
        </button>
        <div className="flex items-center gap-1">
          {connection.type === "manyToMany" && editable && (
            <BDButton
              size="sm"
              variant="secondary"
              icon={Link2}
              onClick={openAttach}
            >
              Attach
            </BDButton>
          )}
          {connection.type === "oneToMany" && editable && (
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:text-blue-600"
              onClick={() => onCreateChild(connection)}
              aria-label="Add record"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {searchable && linkedRows.length > 0 && (
            <div className="relative border-t border-slate-100 px-3 py-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-3 text-xs outline-none focus:border-blue-400"
              />
            </div>
          )}

          {linkedRows.length === 0 ? (
            <p className="px-3 pb-3 text-xs text-slate-400">
              No linked records.
            </p>
          ) : (
            <div className="bd-scroll overflow-x-auto border-t border-slate-100">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    {targetColumns.map((col) => (
                      <th key={col.name} className="px-3 py-2 font-medium">
                        {col.label ?? col.name}
                      </th>
                    ))}
                    <th className="w-px px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      {targetColumns.map((col) => (
                        <td key={col.name} className="px-3 py-2 text-slate-700">
                          {renderCell(col.name, row, target)}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {connection.type === "oneToOne" && (
                            <button
                              type="button"
                              className="rounded p-1 text-slate-400 hover:text-blue-600"
                              onClick={() => onViewRecord(row)}
                              aria-label="Open"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {connection.type === "oneToMany" && editable && (
                            <>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-blue-600"
                                onClick={() => onEditChild(connection, row)}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-red-500"
                                onClick={() => onDeleteChild(row)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {connection.type === "manyToMany" && editable && (
                            <>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                onClick={() => move(row, -1)}
                                disabled={ids.indexOf(row.id) === 0}
                                aria-label="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                onClick={() => move(row, 1)}
                                disabled={ids.indexOf(row.id) === ids.length - 1}
                                aria-label="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-red-500"
                                onClick={() => detach(row)}
                                aria-label="Detach"
                              >
                                <Unlink className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > perPage && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span>
                {safePage * perPage + 1}–
                {Math.min((safePage + 1) * perPage, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <BDButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                >
                  Prev
                </BDButton>
                <BDButton
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  disabled={safePage >= pageCount - 1}
                >
                  Next
                </BDButton>
              </div>
            </div>
          )}
        </>
      )}

      <BDModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        title={`Attach ${target.pluralLabel ?? target.label ?? target.name}`}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={attachQuery}
              onChange={(e) => setAttachQuery(e.target.value)}
              placeholder="Search records…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="bd-scroll flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {candidates.length === 0 ? (
              <span className="px-1 py-2 text-xs text-slate-400">
                No records available.
              </span>
            ) : (
              candidates.map((row) => {
                const checked = attachSelected.includes(row.id);
                const label = String(
                  row.data[connection.titleAttribute ?? "name"] ?? row.id,
                );
                return (
                  <label
                    key={row.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setAttachSelected((prev) =>
                          checked
                            ? prev.filter((id) => id !== row.id)
                            : [...prev, row.id],
                        )
                      }
                    />
                    {label}
                  </label>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between">
            <BDBadge>{attachSelected.length} selected</BDBadge>
            <div className="flex items-center gap-2">
              <BDButton variant="ghost" onClick={() => setAttachOpen(false)}>
                Cancel
              </BDButton>
              <BDButton onClick={confirmAttach} disabled={attachSelected.length === 0}>
                Attach
              </BDButton>
            </div>
          </div>
        </div>
      </BDModal>
    </div>
  );
}

export default BDAppRelationManager;

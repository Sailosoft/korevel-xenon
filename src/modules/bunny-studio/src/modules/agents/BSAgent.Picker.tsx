// BSAgent.Picker — Pool filter picker for Bunny AI Studio Agents.
//
// 1. BSAgentPoolFilterPicker — rendered from the Agents header "Filter by Agent
//    Pool" action. Lets the user filter agents by pool
//    ("All pools", "Global" / ungrouped, or a specific agent pool).
//
// 2. BSAgentPoolFilterButton — the dynamic header button that reflects the
//    currently active pool filter label.

"use client";

import { Button } from "@heroui/react";
import { Filter, Globe, Layers, Loader2, Tag } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { bsDB } from "../../BSDatabase";
import type { BSAgentPool } from "../agent-pools/BSAgentPool.Types";
import {
  BSAgentPoolFilterAll,
  BSAgentPoolFilterNone,
  getBSAgentPoolFilter,
  getBSAgentPoolFilterLabel,
  setBSAgentPoolFilter,
  type BSAgentPoolFilter,
} from "./BSAgent.Filter";

// ─── Shared pill style ─────────────────────────────────────────────────

const PILL_BASE =
  "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 " +
  "border flex items-center gap-2 text-left";
const PILL_IDLE =
  "border-white/10 bg-white/5 text-gray-700 hover:border-red-200 hover:bg-red-50";
const PILL_ACTIVE =
  "border-red-200 bg-red-50 text-red-600 ring-1 ring-red-200";

// ─── Filter picker (Agents header action) ──────────────────────────────

export interface BSAgentPoolFilterPickerProps {
  /** Close the wrapping dialog. */
  onClose: () => void;
}

export function BSAgentPoolFilterPicker({
  onClose,
}: BSAgentPoolFilterPickerProps) {
  const [pools, setPools] = useState<BSAgentPool[]>([]);
  const [loading, setLoading] = useState(true);
  const active = getBSAgentPoolFilter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await bsDB.agentPoolsRepo.query.getAll({
        page: 0,
        pageSize: 0,
      });
      if (!alive) return;
      setPools(res.data as unknown as BSAgentPool[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(
    (filter: BSAgentPoolFilter) => {
      setBSAgentPoolFilter(filter);
      onClose();
    },
    [onClose],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Filter agents by pool
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading pools…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`${PILL_BASE} ${active === BSAgentPoolFilterAll ? PILL_ACTIVE : PILL_IDLE}`}
            onClick={() => apply(BSAgentPoolFilterAll)}
          >
            <Layers className="w-3.5 h-3.5" /> All pools
          </button>
          <button
            type="button"
            className={`${PILL_BASE} ${active === BSAgentPoolFilterNone ? PILL_ACTIVE : PILL_IDLE}`}
            onClick={() => apply(BSAgentPoolFilterNone)}
          >
            <Globe className="w-3.5 h-3.5" /> Global (no pool)
          </button>
          {pools.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">
              No agent pools yet — create one in{" "}
              <span className="font-medium text-gray-500">Agent Pools</span>.
            </p>
          ) : (
            pools.map((pool) => (
              <button
                key={pool.id}
                type="button"
                className={`${PILL_BASE} ${active === pool.id ? PILL_ACTIVE : PILL_IDLE}`}
                onClick={() => apply(pool.id)}
              >
                <Tag className="w-3.5 h-3.5" /> {pool.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dynamic header filter button ───────────────────────────────────────

export function BSAgentPoolFilterButton({
  onOpen,
}: {
  /** Opens the filter picker dialog. */
  onOpen: () => void;
}) {
  const active = getBSAgentPoolFilter();
  const [poolNames, setPoolNames] = useState<Record<string, string>>({});

  // Re-resolve the active filter's pool name whenever the filter changes.
  useEffect(() => {
    let alive = true;
    bsDB.agentPoolsRepo.query
      .getAll({ page: 0, pageSize: 0 })
      .then((res) => {
        if (!alive) return;
        const all = res.data as unknown as BSAgentPool[];
        setPoolNames(
          Object.fromEntries(all.map((pool) => [pool.id, pool.name])),
        );
      });
    return () => {
      alive = false;
    };
  }, [active]);

  const label = getBSAgentPoolFilterLabel(poolNames);

  return (
    <Button type="button" variant="secondary" onPress={onOpen}>
      <Filter className="w-4 h-4" />
      <span className="hidden sm:inline ml-1">Filter: {label}</span>
      <span className="sm:hidden ml-1">Filter</span>
    </Button>
  );
}

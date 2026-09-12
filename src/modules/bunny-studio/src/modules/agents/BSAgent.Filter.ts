// BSAgent.Filter — module-level agent-pool filter state for Bunny AI Studio
// Agents.
//
// The Bunny feature config is deep-frozen, so the active agent-pool filter is
// stored here (module scope) and read by the Agents data layer's `getAll`
// override. The header "Filter by Agent Pool" picker writes to this store,
// then the table is refreshed via `adminPanel.table.fetchData()`.

export type BSAgentPoolFilter =
  | "all" // every agent, regardless of pool
  | "none" // only global / ungrouped agents (agentPoolId === undefined)
  | string; // a specific agent pool id

export const BSAgentPoolFilterAll = "all" as const;
export const BSAgentPoolFilterNone = "none" as const;

let activeFilter: BSAgentPoolFilter = BSAgentPoolFilterAll;

/** Current active agent-pool filter. */
export function getBSAgentPoolFilter(): BSAgentPoolFilter {
  return activeFilter;
}

/** Set the active agent-pool filter. */
export function setBSAgentPoolFilter(filter: BSAgentPoolFilter): void {
  activeFilter = filter;
}

/** Reset the filter back to "all". */
export function resetBSAgentPoolFilter(): void {
  activeFilter = BSAgentPoolFilterAll;
}

/**
 * Apply the active filter to a list of agents.
 * - `"all"` → unchanged
 * - `"none"` → keep agents without an agentPoolId
 * - `poolId` → keep agents in that pool
 */
export function applyBSAgentPoolFilter<
  T extends { agentPoolId?: string },
>(items: T[]): T[] {
  if (activeFilter === BSAgentPoolFilterAll) return items;
  if (activeFilter === BSAgentPoolFilterNone) {
    return items.filter((item) => !item.agentPoolId);
  }
  return items.filter((item) => item.agentPoolId === activeFilter);
}

/** Human-readable label for the active filter (used in the header button). */
export function getBSAgentPoolFilterLabel(
  poolNameById: Record<string, string>,
): string {
  if (activeFilter === BSAgentPoolFilterAll) return "All pools";
  if (activeFilter === BSAgentPoolFilterNone) return "Global";
  return poolNameById[activeFilter] ?? "Unknown pool";
}

/**
 * useBFlowPools — Hook to load pools from IndexedDB.
 *
 * Provides a simple React hook that loads all pool entities on mount
 * so the workflow studio and interactive builder can offer "fill from pool"
 * functionality.
 */

import { useEffect, useState } from "react";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPoolEntity } from "./BFlowPool.Types";

export interface UseBFlowPoolsResult {
  /** All pools loaded from IndexedDB */
  pools: BFlowPoolEntity[];
  /** True while the initial load is in progress */
  loading: boolean;
  /** A non-null string when an error occurred */
  error: string | null;
  /** Manually trigger a reload */
  reload: () => void;
}

export function useBFlowPools(): UseBFlowPoolsResult {
  const [pools, setPools] = useState<BFlowPoolEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = () => setReloadTrigger((n) => n + 1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await bflowDB.pools.toArray();
        if (!cancelled) {
          setPools(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load pools",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  return { pools, loading, error, reload };
}

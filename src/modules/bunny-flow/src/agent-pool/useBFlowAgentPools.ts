/**
 * useBFlowAgentPools — Hook to load agent pools from IndexedDB.
 *
 * Provides a simple React hook that loads all agent pool entities on mount
 * so the workflow studio and interactive builder can offer "fill from pool"
 * functionality.
 */

import { useEffect, useState } from "react";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowAgentPoolEntity } from "./BFlowAgentPool.Types";

export interface UseBFlowAgentPoolsResult {
  /** All agent pools loaded from IndexedDB */
  agentPools: BFlowAgentPoolEntity[];
  /** True while the initial load is in progress */
  loading: boolean;
  /** A non-null string when an error occurred */
  error: string | null;
  /** Manually trigger a reload */
  reload: () => void;
}

export function useBFlowAgentPools(): UseBFlowAgentPoolsResult {
  const [agentPools, setAgentPools] = useState<BFlowAgentPoolEntity[]>([]);
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
        const items = await bflowDB.agentPools.toArray();
        if (!cancelled) {
          setAgentPools(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load agent pools",
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

  return { agentPools, loading, error, reload };
}

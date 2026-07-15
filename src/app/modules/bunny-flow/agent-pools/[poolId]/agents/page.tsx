"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import BFlowScopedPoolAgents from "@/src/modules/bunny-flow/src/pool-agent/BFlowScopedPoolAgents";

interface PoolAgentsPageProps {
  params: Promise<{ poolId: string }>;
}

export default function PoolAgentsPage({ params }: PoolAgentsPageProps) {
  const { poolId } = use(params);
  const router = useRouter();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          className="text-default-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pool Agents</h1>
          <p className="text-sm text-slate-400">
            Manage individual agents within this pool
          </p>
        </div>
      </div>

      <BFlowScopedPoolAgents poolId={poolId} />
    </div>
  );
}

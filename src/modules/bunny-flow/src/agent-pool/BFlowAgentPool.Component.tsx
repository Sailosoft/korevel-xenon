import { Users } from "lucide-react";

export default function BFlowAgentPoolComponent() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Agent Pools</h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        Agent pools allow you to group and manage AI agents that can be
        assigned to workflows. Configure agent pools via the workflow template
        YAML or through dedicated agent configuration files.
      </p>
    </div>
  );
}

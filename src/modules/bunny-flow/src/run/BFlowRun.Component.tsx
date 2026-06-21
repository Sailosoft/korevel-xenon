import { Play } from "lucide-react";

export default function BFlowRunComponent() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
        <Play className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Pipeline Runs</h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        Track and monitor the execution history of your pipeline runs. View
        status, duration, and output for each run.
      </p>
    </div>
  );
}

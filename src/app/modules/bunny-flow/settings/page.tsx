"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Settings</h2>
            <p className="text-sm text-slate-400">
              Configure your BFlow workspace
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              General
            </h3>
            <p className="text-sm text-slate-400">
              General workspace settings and preferences for Bunny Flow.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Database
            </h3>
            <p className="text-sm text-slate-400">
              Bunny Flow uses an indexed database (via PhazeDB/Dexie) for local
              storage. All flow definitions, workflows, pipelines, and reports
              are stored locally.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Integrations
            </h3>
            <p className="text-sm text-slate-400">
              Connect with Helix AI service for agent-based workflow execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

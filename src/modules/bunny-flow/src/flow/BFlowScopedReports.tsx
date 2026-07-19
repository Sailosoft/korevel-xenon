// BFlowScopedReports.tsx
//
// Bunny-backed report template list automatically scoped to the current flow
// definition (flowId).  Uses the existing bflowReportModule config but
// injects the flow id from BFlowFlowContext.
//
// Also displays saved/generated pipeline reports (BFlowPipelineReportEntity)
// that can be downloaded as standalone HTML files.

"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowReportModule } from "../report/BFlowReport";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPipelineReportEntity } from "../report/BFlowReport.Types";

export default function BFlowScopedReports() {
  const { flowId } = useBFlowFlow();

  // ── Saved pipeline reports state ──────────────────────────────────
  const [savedReports, setSavedReports] = useState<BFlowPipelineReportEntity[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (!flowId) {
      setSavedReports([]);
      setLoadingReports(false);
      return;
    }
    let cancelled = false;
    bflowDB.pipelineReports
      .toArray()
      .then((all) => {
        if (!cancelled) {
          // Filter by flowId — all pipeline runs belong to a flow
          setSavedReports(
            all
              .filter((r) => r.flowId === flowId)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSavedReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  // ── Handle download ─────────────────────────────────────────────
  const handleDownload = (report: BFlowPipelineReportEntity) => {
    if (!report.content) return;
    const blob = new Blob([report.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.filename ?? "report"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Handle preview (open in new tab) ────────────────────────────
  const handlePreview = (report: BFlowPipelineReportEntity) => {
    if (!report.content) return;
    const blob = new Blob([report.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // ── Handle delete ───────────────────────────────────────────────
  const handleDelete = async (report: BFlowPipelineReportEntity) => {
    try {
      await bflowDB.pipelineReports.delete(report.id);
      setSavedReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (err) {
      console.error("[BFlowScopedReports] Failed to delete report:", err);
    }
  };

  // ── Scoped Bunny config for report templates ─────────────────────
  const scopedConfig = createScopedBunnyConfig(
    bflowReportModule,
    "flowId",
    flowId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    flowId,
  });

  return (
    <div className="p-0 space-y-8">
      {/* ── Report Template Management ───────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Report Templates
        </h2>
        <p className="text-sm text-default-400 mb-6">
          Configure report templates that define how pipeline outputs are structured.
          Saved/generated reports appear below.
        </p>
      </div>

      {/* ── Saved Pipeline Reports ────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Saved Pipeline Reports
        </h2>
        <p className="text-sm text-default-400 mb-6">
          Generated reports from pipeline runs. Click to download or preview.
        </p>

        {loadingReports ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedReports.length === 0 ? (
          <div className="bg-default-50 rounded-2xl border border-default-100 p-12 text-center">
            <FileText className="w-12 h-12 text-default-200 mx-auto mb-4" />
            <p className="text-default-400 text-sm">
              No saved reports yet. Run a pipeline and use{" "}
              <span className="font-medium text-emerald-600">
                &ldquo;Generate & Save Report&rdquo;
              </span>{" "}
              from the Run Options dropdown to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="bg-background rounded-2xl border border-default-100 p-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {report.title ?? report.filename ?? "Untitled Report"}
                      </p>
                      <p className="text-[10px] text-default-400">
                        {report.createdAt.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                    {report.type?.toUpperCase() ?? "HTML"}
                  </span>
                </div>

                {/* Report content preview (truncated) */}
                {report.content && (
                  <div className="mb-3 bg-default-50 rounded-lg p-3 max-h-20 overflow-hidden">
                    <div
                      className="text-xs text-default-500 leading-relaxed line-clamp-3 [&_style]:hidden"
                      dangerouslySetInnerHTML={{
                        __html: report.content
                          .replace(/<style[\s\S]*?<\/style>/gi, "")
                          .replace(/<script[\s\S]*?<\/script>/gi, "")
                          .replace(/<[^>]*>/g, " ")
                          .replace(/\s+/g, " ")
                          .trim()
                          .substring(0, 200) + (report.content.length > 200 ? "..." : ""),
                      }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onPress={() => handlePreview(report)}
                    isDisabled={!report.content}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 text-xs"
                    onPress={() => handleDownload(report)}
                    isDisabled={!report.content}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-0 px-2 text-default-400 hover:text-danger"
                    onPress={() => handleDelete(report)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

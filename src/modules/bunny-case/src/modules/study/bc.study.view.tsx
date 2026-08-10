// bc.study.view.tsx
//
// Study Viewer — the dedicated view route for a single study record. Loads the
// record by id, renders the handbook content with the Render module
// (`RenderView format="markdown"`) and provides a "Back to Study Library" link
// to return to the Bunny CRUD list.

"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, FileText, Clock, Loader2, ListChecks } from "lucide-react";
import { RenderView } from "@/src/modules/render";
import { bcDatabase } from "../../database/bc.database";
import type { BCStudy, BCStudyOutlinePoint } from "./bc.study.entity";
import { bcStudyGenerateTypeList } from "./bc.study.prompt";

export default function BCStudyViewComponent({ studyId }: { studyId: number }) {
  const [study, setStudy] = useState<BCStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await bcDatabase.studies.get(studyId);
        if (!cancelled) {
          if (record) {
            setStudy(record);
          } else {
            setError("Study record not found.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load study");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/modules/bunny-case/study"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border text-slate-500 border-slate-200 hover:bg-slate-50"
          title="Back to Study Library"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Study Library</span>
        </a>
        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Study Viewer</h1>
          <p className="text-sm text-slate-400">
            Rendering the handbook with the Render module.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <p className="text-sm text-slate-400">Loading handbook…</p>
        </div>
      )}

      {study && !loading && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{study.title}</h2>
              <p className="text-xs text-slate-400">
                {study.caseTitle} · {study.personaName ?? "No persona"} ·{" "}
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {study.wordCount} words
                </span>{" "}
                ·{" "}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {study.createdAt
                    ? new Date(study.createdAt).toLocaleString()
                    : "—"}
                </span>{" "}
                {study.generateType && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-100 text-sky-600 px-2 py-0.5">
                    {
                      bcStudyGenerateTypeList.find(
                        (t) => t.id === study.generateType,
                      )?.label
                    }
                  </span>
                )}
              </p>
            </div>

            {/* Render the handbook markdown with the Render module */}
            <div className="border-t border-slate-100 pt-4">
              <RenderView format="markdown" content={study.content} />
            </div>
          </div>

          {study.outline && study.outline.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <ListChecks className="w-4 h-4 text-sky-500" />
                Quick Summary — memorize these
              </div>
              <div className="space-y-2">
                {study.outline.map((point: BCStudyOutlinePoint, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-slate-700">
                      {point.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {point.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!study && !loading && !error && (
        <p className="text-center text-sm text-slate-400 py-10">
          Select a study from the library to view it here.
        </p>
      )}
    </div>
  );
}

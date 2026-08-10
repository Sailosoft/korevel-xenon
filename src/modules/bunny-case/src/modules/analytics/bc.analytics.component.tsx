// bc.analytics.component.tsx
//
// Sentiment Analytics — shows the sentiment path of each completed
// session and, via AI, the exact words that shifted the customer's mood from
// negative to positive.

"use client";

import React from "react";
import { Button, Spinner } from "@heroui/react";
import { LineChart, RefreshCw, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useBCAnalytics } from "./bc.analytics.hooks";
import type { BCAnalyticsData } from "./bc.analytics.entity";

function SentimentChart({ trend }: { trend: number[] }) {
  if (trend.length === 0) {
    return <p className="text-xs text-slate-400">No sentiment data.</p>;
  }
  const max = Math.max(...trend.map((t) => Math.abs(t)), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {trend.map((value, i) => {
        const height = Math.max(4, (Math.abs(value) / max) * 72);
        const positive = value >= 0;
        return (
          <div key={i} className="flex flex-col items-center justify-end flex-1">
            <div
              className={`w-full rounded-t-md ${
                positive ? "bg-emerald-400" : "bg-rose-400"
              }`}
              style={{ height }}
              title={`${value.toFixed(2)}`}
            />
            <span className="text-[8px] text-slate-400 mt-0.5">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsCard({
  row,
  analyzing,
  onAnalyze,
}: {
  row: BCAnalyticsData;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">{row.caseTitle}</h3>
          <p className="text-xs text-slate-400">
            {row.personaName} · {row.mode} ·{" "}
            <span
              className={
                row.resolved
                  ? "text-emerald-600 font-medium"
                  : "text-red-500 font-medium"
              }
            >
              {row.resolved ? "Resolved" : "Not resolved"}
            </span>
          </p>
        </div>
        <Button
          onPress={onAnalyze}
          isDisabled={analyzing}
          size="sm"
          className="bg-violet-600 text-white shrink-0"
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" />
              Analyzing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Analyze with AI
            </span>
          )}
        </Button>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
          Sentiment path (negative → positive)
        </div>
        <SentimentChart trend={row.sentimentTrend} />
      </div>

      {row.summary && <p className="text-sm text-slate-600">{row.summary}</p>}

      {row.shiftWords.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            Word-level mood shifts
          </div>
          <div className="flex flex-wrap gap-2">
            {row.shiftWords.map((w, i) => (
              <span
                key={i}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                  w.shift === "positive"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
              >
                {w.shift === "positive" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {w.word} · {w.impact.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {row.recommendedPhrases.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            Recommended phrases
          </div>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-0.5">
            {row.recommendedPhrases.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function BCAnalyticsComponent() {
  const { rows, loading, analyzingId, error, load, analyze } =
    useBCAnalytics();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-100">
          <LineChart className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            Sentiment Analytics
          </h1>
          <p className="text-sm text-slate-400">
            {"See which words turned the customer's mood around."}
          </p>
        </div>
        <Button
          onPress={() => void load()}
          variant="outline"
          className="text-slate-500 border-slate-200"
        >
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </span>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 justify-center py-10">
          <Spinner color="warning" size="lg" />
          <p className="text-sm text-slate-400">Loading analytics…</p>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-10">
          Complete a Trainer or Gauntlet session to see sentiment analytics.
        </p>
      )}

      {!loading &&
        rows.map((row) => (
          <AnalyticsCard
            key={row.sessionId}
            row={row}
            analyzing={analyzingId === row.sessionId}
            onAnalyze={() => void analyze(row.sessionId)}
          />
        ))}
    </div>
  );
}

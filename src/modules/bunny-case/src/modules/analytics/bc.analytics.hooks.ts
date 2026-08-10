// bc.analytics.hooks.ts
//
// useBCAnalytics — loads completed sessions + messages, computes the local
// sentiment trend per session, and optionally runs an AI word-level analysis
// to identify what shifted the customer's mood.

"use client";

import { useCallback, useEffect, useState } from "react";
import type { BCAnalyticsData } from "./bc.analytics.entity";
import { bcDatabase } from "../../database/bc.database";
import { bcAnalyzeSession } from "./bc.analytics.server";
import BCSettingsRepository from "../settings/bc.settings.repository";

export interface BCAnalyticsState {
  rows: BCAnalyticsData[];
  loading: boolean;
  analyzingId: number | null;
  error: string;
  load: () => Promise<void>;
  analyze: (sessionId: number) => Promise<void>;
}

export function useBCAnalytics(): BCAnalyticsState {
  const [rows, setRows] = useState<BCAnalyticsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessions, messages, personas, cases] = await Promise.all([
        bcDatabase.sessions
          .filter((s) => s.status !== "active")
          .toArray(),
        bcDatabase.messages.toArray(),
        bcDatabase.personas.toArray(),
        bcDatabase.cases.toArray(),
      ]);

      const rows: BCAnalyticsData[] = sessions.map((session) => {
        const sessionMessages = messages
          .filter((m) => m.sessionId === session.id)
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        const trend = sessionMessages
          .filter((m) => m.sentiment != null)
          .map((m) => m.sentiment as number);
        const persona = personas.find((p) => p.id === session.personaId);
        const scenario = cases.find((c) => c.id === session.caseId);

        return {
          sessionId: session.id as number,
          personaName: persona?.name ?? "—",
          caseTitle: scenario?.title ?? "—",
          resolved: Boolean(session.resolved),
          mode: session.mode,
          sentimentTrend: trend,
          shiftWords: [],
          recommendedPhrases: [],
          summary: session.summary ?? "",
        };
      });

      setRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessions, messages, personas, cases] = await Promise.all([
          bcDatabase.sessions.filter((s) => s.status !== "active").toArray(),
          bcDatabase.messages.toArray(),
          bcDatabase.personas.toArray(),
          bcDatabase.cases.toArray(),
        ]);
        if (cancelled) return;
        const rows: BCAnalyticsData[] = sessions.map((session) => {
          const sessionMessages = messages
            .filter((m) => m.sessionId === session.id)
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
          const trend = sessionMessages
            .filter((m) => m.sentiment != null)
            .map((m) => m.sentiment as number);
          const persona = personas.find((p) => p.id === session.personaId);
          const scenario = cases.find((c) => c.id === session.caseId);

          return {
            sessionId: session.id as number,
            personaName: persona?.name ?? "—",
            caseTitle: scenario?.title ?? "—",
            resolved: Boolean(session.resolved),
            mode: session.mode,
            sentimentTrend: trend,
            shiftWords: [],
            recommendedPhrases: [],
            summary: session.summary ?? "",
          };
        });
        setRows(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load analytics",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const analyze = useCallback(
    async (sessionId: number) => {
      setAnalyzingId(sessionId);
      setError("");
      try {
        const messages = (
          await bcDatabase.messages
            .where("sessionId")
            .equals(sessionId)
            .toArray()
        ).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

        const session = await bcDatabase.sessions.get(sessionId);
        const persona = session?.personaId
          ? await bcDatabase.personas.get(session.personaId)
          : undefined;
        const scenario = session?.caseId
          ? await bcDatabase.cases.get(session.caseId)
          : undefined;

        const settingsRepo = new BCSettingsRepository();
        const aiConfig = await settingsRepo.getActiveAIConfig();
        const result = await bcAnalyzeSession(
          {
            transcript: messages.map((m) => ({
              role: m.role,
              external: m.external,
              sentiment: m.sentiment,
            })),
            personaName: persona?.name ?? "",
            caseTitle: scenario?.title ?? "",
          },
          aiConfig,
        );

        setRows((prev) =>
          prev.map((r) =>
            r.sessionId === sessionId
              ? {
                  ...r,
                  summary: result.summary,
                  shiftWords: result.shiftWords,
                  recommendedPhrases: result.recommendedPhrases,
                }
              : r,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setAnalyzingId(null);
      }
    },
    [],
  );

  return { rows, loading, analyzingId, error, load, analyze };
}

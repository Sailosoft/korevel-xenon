"use client";

// BKThinkSessions.tsx
//
// Sessions page — lists all thinking sessions (thinks) with their
// associated thought names for quick reference.

import React, { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { Brain, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThink } from "../think/BKThink.Types";
import type { BKThought } from "../thoughts/BKThoughts.Types";

// ─── Status Icon ──────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle size={16} className="text-green-500" />;
    case "thinking":
    case "consolidating":
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    case "error":
      return <AlertCircle size={16} className="text-red-500" />;
    default:
      return <Clock size={16} className="text-gray-400" />;
  }
}

// ─── Sessions Component ───────────────────────────────────────────────────

export default function BKThinkSessions() {
  const [sessions, setSessions] = useState<BKThink[]>([]);
  const [thoughtMap, setThoughtMap] = useState<Record<string, BKThought>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const [sessionsRes, thoughtsRes] = await Promise.all([
        bkThinkerDB.thinksRepo.query.getAll({
          page: 0,
          pageSize: 100,
          filters: [],
        }),
        bkThinkerDB.thoughtsRepo.query.getAll({
          page: 0,
          pageSize: 100,
          filters: [],
        }),
      ]);

      // Build thoughtId → thought lookup map
      const map: Record<string, BKThought> = {};
      for (const thought of thoughtsRes.data) {
        map[thought.id] = thought;
      }

      setThoughtMap(map);
      setSessions(sessionsRes.data);
    } catch (err) {
      console.error("[BKThinkSessions] Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sort sessions by createdAt descending (most recent first)
  const sortedSessions = [...sessions].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );

  return (
    <div className="bk-think-sessions space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Thinking Sessions
        </h1>
        <p className="text-gray-500 mt-1">
          All thinking sessions with their associated thoughts
        </p>
      </div>

      {/* Session List */}
      {sortedSessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-lg font-medium text-gray-900">
            No sessions yet
          </h3>
          <p className="text-gray-500 mt-2">
            Sessions appear when you start thinking about a thought.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const thought = thoughtMap[session.thoughtId];

            return (
              <a
                key={session.id}
                href={`/modules/bunny-thinker/think/${session.id}`}
                className="block"
              >
                <Card className="p-4 border-none shadow-sm hover:shadow-md transition-all hover:border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon status={session.status} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {session.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {thought ? (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              <Brain size={12} />
                              {thought.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Unknown thought
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {session.createdAt
                              ? new Date(session.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ml-3 ${
                        session.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : session.status === "thinking"
                            ? "bg-blue-100 text-blue-700"
                            : session.status === "consolidating"
                              ? "bg-purple-100 text-purple-700"
                              : session.status === "error"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

// BKThinkerDashboard.tsx
//
// Main dashboard for BunnyAI Thinker — provides an overview of all
// thinkers, thoughts, and recent thinking sessions.

import React, { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import { Users, Brain, GitBranch, Lightbulb, MemoryStick } from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThinker } from "../thinker/BKThinker.Types";
import type { BKThought } from "../thoughts/BKThoughts.Types";
import type { BKThink } from "../think/BKThink.Types";

// ─── Stat Card ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-4 border-none shadow-sm flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${color}`}>{value}</span>
    </Card>
  );
}

// ─── Dashboard Component ────────────────────────────────────────────────

export default function BKThinkerDashboard() {
  const [thinkers, setThinkers] = useState<BKThinker[]>([]);
  const [thoughts, setThoughts] = useState<BKThought[]>([]);
  const [recentThinks, setRecentThinks] = useState<BKThink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bkLoadData();
  }, []);

  const bkLoadData = async () => {
    try {
      const [thinkersRes, thoughtsRes, thinksRes] = await Promise.all([
        bkThinkerDB.thinkersRepo.query.getAll({
          page: 0,
          pageSize: 100,
          filters: [],
        }),
        bkThinkerDB.thoughtsRepo.query.getAll({
          page: 0,
          pageSize: 100,
          filters: [],
        }),
        bkThinkerDB.thinksRepo.query.getAll({
          page: 0,
          pageSize: 10,
          filters: [],
        }),
      ]);

      setThinkers(thinkersRes.data);
      setThoughts(thoughtsRes.data);
      setRecentThinks(thinksRes.data);
    } catch (err) {
      console.error("[BKThinkerDashboard] Failed to load data:", err);
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

  const completedThinks = recentThinks.filter(
    (t) => t.status === "completed",
  ).length;

  return (
    <div className="bk-thinker-dashboard space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          BunnyAI Thinker
        </h1>
        <p className="text-gray-500 mt-1">
          Chain of thought application for preplanned thinking
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Thinkers"
          value={thinkers.length}
          color="text-purple-600"
        />
        <StatCard
          label="Thoughts"
          value={thoughts.length}
          color="text-blue-600"
        />
        <StatCard
          label="Thinking Sessions"
          value={recentThinks.length}
          color="text-amber-600"
        />
        <StatCard
          label="Completed"
          value={completedThinks}
          color="text-green-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/modules/bunny-thinker/thinkers">
          <Card className="p-4 border-none shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">
                  Manage Thinkers
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create and manage thinker personas
                </p>
              </div>
            </div>
          </Card>
        </a>

        <a href="/modules/bunny-thinker/thought-patterns">
          <Card className="p-4 border-none shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <GitBranch size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                  Thought Patterns
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Define variable templates for thoughts
                </p>
              </div>
            </div>
          </Card>
        </a>

        <a href="/modules/bunny-thinker/thoughts">
          <Card className="p-4 border-none shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600">
                  Thoughts
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Build main prompts and train of thoughts
                </p>
              </div>
            </div>
          </Card>
        </a>
      </div>

      {/* Recent Thinking Sessions */}
      {recentThinks.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Recent Thinking Sessions
          </h2>
          <div className="space-y-2">
            {recentThinks.map((thinkItem) => (
              <a
                key={thinkItem.id}
                href={`/modules/bunny-thinker/think/${thinkItem.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {thinkItem.name}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(
                      thinkItem.createdAt ?? Date.now(),
                    ).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    thinkItem.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : thinkItem.status === "thinking"
                        ? "bg-blue-100 text-blue-700"
                        : thinkItem.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {thinkItem.status}
                </span>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {thinkers.length === 0 && thoughts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-lg font-medium text-gray-900">
            Welcome to BunnyAI Thinker
          </h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Get started by creating your first thinker persona and defining
            your first thought. Use the quick links above to begin.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <a href="/modules/bunny-thinker/thinkers">
              <Button variant="primary">
                <Users size={18} /> Create Thinker
              </Button>
            </a>
            <a href="/modules/bunny-thinker/thoughts">
              <Button variant="primary">
                <Brain size={18} /> Create Thought
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

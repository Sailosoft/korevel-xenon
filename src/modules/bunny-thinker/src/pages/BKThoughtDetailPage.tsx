"use client";

// BKThoughtDetailPage.tsx
//
// Thought Detail / Studio page where users can:
// - View the thought's content and configuration
// - Manage the Chain of Thought (train of thoughts) with idea attachments
// - Run the thought via Think Studio
// - Create a Process from this thought and an association

import React, { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import {
  ArrowLeft,
  PlayCircle,
  Plus,
  Trash2,
  GripVertical,
  Brain,
  Save,
  Workflow,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { v7 as uuidv7 } from "uuid";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKIdea, BKTrainOfThoughtIdea } from "../ideas/BKIdeas.Types";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThoughtDetailPageProps {
  thoughtId: string;
}

// ─── Idea Selector Component ────────────────────────────────────────────

function IdeaSelector({
  stepId,
  selectedIdeaIds,
  ideas,
  onToggle,
}: {
  stepId: string;
  selectedIdeaIds: string[];
  ideas: BKIdea[];
  onToggle: (stepId: string, ideaId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedIdeas = ideas.filter((i) => selectedIdeaIds.includes(i.id));

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onPress={() => setOpen(!open)}
      >
        <Lightbulb size={14} className="text-amber-500" />
        {selectedIdeaIds.length > 0
          ? `${selectedIdeaIds.length} idea${selectedIdeaIds.length > 1 ? "s" : ""}`
          : "Attach ideas"}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto">
            {ideas.length === 0 ? (
              <p className="text-xs text-gray-400 p-2 text-center">
                No ideas available. Create some in the Ideas section first.
              </p>
            ) : (
              <div className="space-y-1">
                {ideas.map((idea) => (
                  <label
                    key={idea.id}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-amber-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIdeaIds.includes(idea.id)}
                      onChange={() => onToggle(stepId, idea.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700 block truncate">
                        {idea.name}
                      </span>
                      <span className="text-xs text-gray-400 block truncate">
                        {idea.tags || "no tags"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Selected ideas inline */}
      {selectedIdeas.length > 0 && !open && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedIdeas.map((idea) => (
            <span
              key={idea.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full"
            >
              <Lightbulb size={10} />
              {idea.name}
              <button
                onClick={() => onToggle(stepId, idea.id)}
                className="hover:text-amber-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export default function BKThoughtDetailPage({
  thoughtId,
}: BKThoughtDetailPageProps) {
  const router = useRouter();
  const [thought, setThought] = useState<BKThought | null>(null);
  const [trainOfThoughts, setTrainOfThoughts] = useState<BKTrainOfThought[]>(
    [],
  );
  const [ideas, setIdeas] = useState<BKIdea[]>([]);
  const [stepIdeaMap, setStepIdeaMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSteps, setEditedSteps] = useState<
    Array<{ id: string; name: string; thought: string; order: number }>
  >([]);

  useEffect(() => {
    bkLoadThought();
  }, [thoughtId]);

  const bkLoadThought = async () => {
    try {
      const result = await bkThinkerDB.thoughtsRepo.get(thoughtId);
      if (result.isSuccess) {
        setThought(result.value);

        // Load train of thoughts
        const totList = await bkThinkerDB.trainOfThoughtsRepo
          .getByThoughtId(thoughtId);
        setTrainOfThoughts(totList);
        setEditedSteps(
          totList.map((t) => ({
            id: t.id,
            name: t.name,
            thought: t.thought,
            order: t.order,
          })),
        );

        // Load idea mappings for each step
        const allMappings = await bkThinkerDB.trainOfThoughtIdeas.toArray();
        const ideaMap: Record<string, string[]> = {};
        for (const tot of totList) {
          const stepMappings = allMappings.filter(
            (m: { trainOfThoughtId: string }) => m.trainOfThoughtId === tot.id,
          );
          ideaMap[tot.id] = stepMappings.map((m: { ideaId: string }) => m.ideaId);
        }
        setStepIdeaMap(ideaMap);
      }

      // Load all ideas
      const allIdeas = await bkThinkerDB.ideasRepo.query.getAll({
        page: 0,
        pageSize: 100,
        filters: [],
      });
      setIdeas(allIdeas.data);
    } catch (err) {
      console.error("[BKThoughtDetail] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  const bkAddStep = () => {
    const newId = uuidv7();
    setEditedSteps((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        thought: "",
        order: prev.length,
      },
    ]);
    setStepIdeaMap((prev) => ({ ...prev, [newId]: [] }));
  };

  const bkRemoveStep = (stepId: string) => {
    setEditedSteps((prev) =>
      prev
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i })),
    );
  };

  const bkUpdateStep = (
    stepId: string,
    field: "name" | "thought",
    value: string,
  ) => {
    setEditedSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)),
    );
  };

  const bkMoveStepUp = (index: number) => {
    if (index === 0) return;
    setEditedSteps((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  };

  const bkMoveStepDown = (index: number) => {
    if (index >= editedSteps.length - 1) return;
    setEditedSteps((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  };

  const bkToggleIdea = (stepId: string, ideaId: string) => {
    setStepIdeaMap((prev) => {
      const current = prev[stepId] ?? [];
      const updated = current.includes(ideaId)
        ? current.filter((id) => id !== ideaId)
        : [...current, ideaId];
      return { ...prev, [stepId]: updated };
    });
  };

  const bkSaveTrainOfThoughts = async () => {
    if (!thought) return;
    setSaving(true);

    try {
      // Delete existing train of thoughts for this thought
      const allMappings = await bkThinkerDB.trainOfThoughtIdeas.toArray() as Array<{ id: string; ideaId: string; trainOfThoughtId: string }>;
      for (const tot of trainOfThoughts) {
        // Remove associated idea mappings first
        const existingMappings = allMappings.filter(
          (m) => m.trainOfThoughtId === tot.id,
        );
        for (const mapping of existingMappings) {
          await bkThinkerDB.trainOfThoughtIdeasRepo.delete(mapping.id);
        }
        await bkThinkerDB.trainOfThoughtsRepo.delete(tot.id);
      }

      // Create new train of thoughts and their idea mappings
      for (const step of editedSteps) {
        await bkThinkerDB.trainOfThoughtsRepo.create({
          id: step.id,
          thoughtId: thought.id,
          name: step.name,
          thought: step.thought,
          order: step.order,
          includeInMemory: true,
          createdAt: Date.now(),
        } as BKTrainOfThought);

        // Save idea associations for this step
        const ideaIds = stepIdeaMap[step.id] ?? [];
        for (const ideaId of ideaIds) {
          await bkThinkerDB.trainOfThoughtIdeasRepo.create({
            id: uuidv7(),
            trainOfThoughtId: step.id,
            ideaId,
          } as BKTrainOfThoughtIdea);
        }
      }

      // Reload
      await bkLoadThought();
    } catch (err) {
      console.error("[BKThoughtDetail] Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const bkRunThink = async () => {
    if (!thought) return;
    const thinkId = uuidv7();
    await bkThinkerDB.thinksRepo.create({
      id: thinkId,
      slug: thought.name.toLowerCase().replace(/\s+/g, "-"),
      name: `Run: ${thought.name}`,
      thoughtId: thought.id,
      status: "draft",
      thinkConversation: [],
      createdAt: Date.now(),
    });
    router.push(`/modules/bunny-thinker/think/${thinkId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!thought) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Thought not found.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onPress={() => router.push("/modules/bunny-thinker/thoughts")}
        >
          <ArrowLeft size={16} /> Back to Thoughts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push("/modules/bunny-thinker/thoughts")}
            isIconOnly
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {thought.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {thought.description || "Chain of Thought Studio"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onPress={bkRunThink}
          >
            <PlayCircle size={18} /> Run Thought
          </Button>
          <Button
            variant="secondary"
            onPress={bkSaveTrainOfThoughts}
            isDisabled={saving}
          >
            <Save size={18} /> {saving ? "Saving..." : "Save Chain"}
          </Button>
        </div>
      </div>

      {/* Thought Content Preview */}
      <Card className="p-4 border-none shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Thought Content
        </h3>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
          {thought.thought}
        </p>
      </Card>

      {/* Chain of Thought (Train of Thoughts) Editor */}
      <Card className="p-4 border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">
            Chain of Thought Steps ({editedSteps.length})
          </h2>
          <Button variant="secondary" size="sm" onPress={bkAddStep}>
            <Plus size={16} /> Add Step
          </Button>
        </div>

        {editedSteps.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            No steps defined. Click &ldquo;Add Step&rdquo; to build your chain of
            thought.
          </p>
        ) : (
          <div className="space-y-4">
            {editedSteps.map((step, index) => (
              <div
                key={step.id}
                className="p-3 border border-gray-200 rounded-lg bg-white"
              >
                {/* Step Header */}
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical
                    size={16}
                    className="text-gray-300 cursor-grab"
                  />
                  <span className="text-xs font-medium text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <input
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) =>
                      bkUpdateStep(step.id, "name", e.target.value)
                    }
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      isDisabled={index === 0}
                      onPress={() => bkMoveStepUp(index)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      isDisabled={index >= editedSteps.length - 1}
                      onPress={() => bkMoveStepDown(index)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={() => bkRemoveStep(step.id)}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Step Prompt */}
                <textarea
                  className="w-full min-h-[60px] px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y"
                  placeholder="Step prompt / instruction..."
                  value={step.thought}
                  onChange={(e) =>
                    bkUpdateStep(step.id, "thought", e.target.value)
                  }
                />

                {/* Attached Ideas */}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <IdeaSelector
                    stepId={step.id}
                    selectedIdeaIds={stepIdeaMap[step.id] ?? []}
                    ideas={ideas}
                    onToggle={bkToggleIdea}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Process */}
      <Card className="p-4 border-none shadow-sm bg-purple-50 border border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Workflow size={20} className="text-purple-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-purple-900">
                Automate with Process
              </h3>
              <p className="text-xs text-purple-700 mt-0.5">
                Create a Process to bind this thought with an association and
                auto-export results to memory.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-purple-600 text-white hover:bg-purple-700"
            onPress={() =>
              router.push("/modules/bunny-thinker/processes")
            }
          >
            <Workflow size={16} /> Create Process
          </Button>
        </div>
      </Card>
    </div>
  );
}

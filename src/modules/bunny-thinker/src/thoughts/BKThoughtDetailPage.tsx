"use client";

// BKThoughtDetailPage.tsx
//
// Thought Detail / Studio page where users can:
// - View the thought's content and configuration
// - Manage the Chain of Thought (train of thoughts) with idea attachments
// - Run the thought via Think Studio
// - Create a Process from this thought and an association
//
// Uses the reusable BKThoughtConfigPanel for the shared thought definition
// and steps editor, with BKThinkStudioAnon's design language.

import React, { useEffect, useState, useCallback } from "react";
import { Button, Card, Toast, toast } from "@heroui/react";
import {
  ArrowLeft,
  PlayCircle,
  Save,
  Workflow,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { v7 as uuidv7 } from "uuid";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import BKThoughtConfigPanel from "./BKThoughtConfigPanel";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKIdea, BKTrainOfThoughtIdea } from "../ideas/BKIdeas.Types";
import type { BKCraftConfig, BKCraftFormat } from "../craft/BKCraft.Types";

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
  const [craftConfigs, setCraftConfigs] = useState<BKCraftConfig[]>([]);
  const [craftConfigsLoading, setCraftConfigsLoading] = useState(false);

  // Steps state using craftFormat string (e.g. "markdown", "html") — resolved to craftId on save
  const [editedSteps, setEditedSteps] = useState<
    Array<{ id: string; name: string; thought: string; order: number; craftFormat?: string }>
  >([]);

  useEffect(() => {
    bkLoadThought();
  }, [thoughtId]);

  const bkLoadThought = async () => {
    try {
      const result = await bkThinkerDB.thoughtsRepo.get(thoughtId);
      if (result.isSuccess) {
        setThought(result.value);

        // Load craft configs
        setCraftConfigsLoading(true);
        const allCraftConfigs = await bkThinkerDB.craftConfigs
          .toArray() as BKCraftConfig[];
        setCraftConfigs(allCraftConfigs);
        setCraftConfigsLoading(false);

        // Load train of thoughts
        const totList = await bkThinkerDB.trainOfThoughtsRepo
          .getByThoughtId(thoughtId);
        setTrainOfThoughts(totList);

        const craftConfigFormatMap = new Map(
          allCraftConfigs.map((c) => [c.id, c.format]),
        );
        setEditedSteps(
          totList.map((t) => ({
            id: t.id,
            name: t.name,
            thought: t.thought,
            order: t.order,
            craftFormat: t.craftId
              ? craftConfigFormatMap.get(t.craftId)
              : undefined,
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

  const bkAddStep = useCallback(() => {
    const newId = uuidv7();
    setEditedSteps((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        thought: "",
        order: prev.length,
        craftFormat: undefined,
      },
    ]);
    setStepIdeaMap((prev) => ({ ...prev, [newId]: [] }));
  }, []);

  const bkRemoveStep = useCallback((index: number) => {
    setEditedSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i })),
    );
  }, []);

  const bkUpdateStep = useCallback(
    (index: number, field: "name" | "thought" | "craftFormat", value: string) => {
      setEditedSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const bkMoveStepUp = useCallback((index: number) => {
    if (index === 0) return;
    setEditedSteps((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const bkMoveStepDown = useCallback((index: number) => {
    if (index >= editedSteps.length - 1) return;
    setEditedSteps((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const bkToggleIdea = useCallback((stepId: string, ideaId: string) => {
    setStepIdeaMap((prev) => {
      const current = prev[stepId] ?? [];
      const updated = current.includes(ideaId)
        ? current.filter((id) => id !== ideaId)
        : [...current, ideaId];
      return { ...prev, [stepId]: updated };
    });
  }, []);

  const bkSaveTrainOfThoughts = async () => {
    if (!thought) return;
    setSaving(true);

    try {
      // Delete existing train of thoughts for this thought
      const allMappings = await bkThinkerDB.trainOfThoughtIdeas.toArray() as Array<{
        id: string;
        ideaId: string;
        trainOfThoughtId: string;
      }>;
      for (const tot of trainOfThoughts) {
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
        // Resolve craftFormat to a craftId by finding or creating a craft config
        let resolvedCraftId: string | undefined;
        if (step.craftFormat) {
          const existing = craftConfigs.find(
            (c) => c.format === step.craftFormat,
          );
          if (existing) {
            resolvedCraftId = existing.id;
          } else {
            resolvedCraftId = uuidv7();
            const { BKCraftConfigSchema } = await import("../craft/BKCraft.Types");
            await bkThinkerDB.craftConfigsRepo.create({
              id: resolvedCraftId,
              name: `Craft: ${step.craftFormat}`,
              format: step.craftFormat as BKCraftFormat,
              createdAt: Date.now(),
            });
          }
        }

        await bkThinkerDB.trainOfThoughtsRepo.create({
          id: step.id,
          thoughtId: thought.id,
          name: step.name,
          thought: step.thought,
          order: step.order,
          includeInMemory: true,
          craftId: resolvedCraftId,
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
      toast.success("Chain of thought saved successfully!");
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

  // ── Render step extra actions (move up/down + idea selector) ────────

  const renderStepActions = useCallback(
    (step: { id: string }, index: number) => (
      <>
        {/* Move up */}
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          isDisabled={index === 0}
          onPress={() => bkMoveStepUp(index)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Move step ${index + 1} up`}
        >
          ↑
        </Button>
        {/* Move down */}
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          isDisabled={index >= editedSteps.length - 1}
          onPress={() => bkMoveStepDown(index)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Move step ${index + 1} down`}
        >
          ↓
        </Button>
        {/* Idea selector */}
        <IdeaSelector
          stepId={step.id}
          selectedIdeaIds={stepIdeaMap[step.id] ?? []}
          ideas={ideas}
          onToggle={bkToggleIdea}
        />
      </>
    ),
    [editedSteps.length, stepIdeaMap, ideas, bkMoveStepUp, bkMoveStepDown, bkToggleIdea],
  );

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
    <>
      <Toast.Provider />
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
            <Button variant="primary" onPress={bkRunThink}>
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

        {/* ── Reusable Config Panel (steps only — thought preview above) ── */}
        <BKThoughtConfigPanel
          thoughtName={thought.name}
          onThoughtNameChange={() => {
            // Name is read-only on the detail page; changes go through Save
          }}
          thoughtDescription={thought.description || ""}
          onThoughtDescriptionChange={() => {}}
          thoughtContent={thought.thought}
          onThoughtContentChange={() => {}}
          steps={editedSteps}
          onAddStep={bkAddStep}
          onRemoveStep={bkRemoveStep}
          onUpdateStep={bkUpdateStep}
          hideThoughtDefinition
          renderStepActions={renderStepActions}
          renderStepsFooter={
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onPress={bkSaveTrainOfThoughts}
                isDisabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Chain"}
              </Button>
            </div>
          }
        />

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
    </>
  );
}

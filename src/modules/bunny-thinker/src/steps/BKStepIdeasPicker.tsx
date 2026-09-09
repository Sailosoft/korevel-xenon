"use client";

// BKStepIdeasPicker.tsx
//
// Idea picker for Train of Thought steps.
// Mirrors the Author skill picker pattern: a trigger button in the step
// header actions opens a searchable modal with checkbox rows; hitting OK
// commits the draft selection. Attached ideas are also rendered as
// removable bubbles beneath the step header (BKStepIdeasBubbles).
//
// Used by BKThinkStudioAnon (via BKThoughtConfigPanel.renderStepActions
// and renderBelowStepHeader).

import React, { useCallback, useMemo, useState } from "react";
import { Button, Modal, Chip } from "@heroui/react";
import { Lightbulb, Search, X } from "lucide-react";
import type { BKIdea } from "../ideas/BKIdeas.Types";

// ─── Idea Row (checkbox row inside the picker modal) ────────────────

export function BKStepIdeaRow({
  idea,
  checked,
  onToggle,
}: {
  idea: BKIdea;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      title={idea.idea || undefined}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-default-100 hover:border-default-300 hover:bg-default-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded accent-primary"
      />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-default-700">
          {idea.name}
        </span>
        {idea.idea && (
          <span className="text-xs text-default-400 truncate">
            {idea.idea}
          </span>
        )}
      </div>
    </label>
  );
}

// ─── Idea picker modal ──────────────────────────────────────────────

export interface BKStepIdeasPickerProps {
  /** Train of thought step id that owns the selection */
  stepId: string;
  /** Currently attached idea ids */
  selectedIdeaIds: string[];
  /** All ideas available to attach */
  ideas: BKIdea[];
  /** True while the ideas list is loading */
  ideasLoading: boolean;
  /** Called with the final ideaIds when the modal selection is committed */
  onChange: (stepId: string, ideaIds: string[]) => void;
}

export default function BKStepIdeasPicker({
  stepId,
  selectedIdeaIds,
  ideas,
  ideasLoading,
  onChange,
}: BKStepIdeasPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<Set<string>>(
    () => new Set(selectedIdeaIds),
  );

  const filteredIdeas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ideas;
    return ideas.filter(
      (idea) =>
        (idea.name ?? "").toLowerCase().includes(query) ||
        (idea.idea ?? "").toLowerCase().includes(query) ||
        (idea.tags ?? "").toLowerCase().includes(query),
    );
  }, [ideas, searchQuery]);

  const openModal = useCallback(() => {
    setDraft(new Set(selectedIdeaIds));
    setSearchQuery("");
    setIsModalOpen(true);
  }, [selectedIdeaIds]);

  const toggleDraft = useCallback((ideaId: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) next.delete(ideaId);
      else next.add(ideaId);
      return next;
    });
  }, []);

  const handleOk = useCallback(() => {
    onChange(stepId, Array.from(draft));
    setIsModalOpen(false);
  }, [stepId, draft, onChange]);

  const handleCancel = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly={selectedIdeaIds.length === 0}
        isDisabled={ideasLoading}
        onPress={openModal}
        aria-label="Attach ideas"
        className="min-w-0 h-7 px-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
      >
        <Lightbulb
          size={14}
          className={selectedIdeaIds.length > 0 ? "text-amber-500" : ""}
        />
        {selectedIdeaIds.length > 0 && (
          <span className="text-[10px] font-bold text-amber-600 leading-none">
            {selectedIdeaIds.length}
          </span>
        )}
      </Button>

      <Modal.Backdrop
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        isDismissable={false}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Attach Ideas</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
                <input
                  placeholder="Search ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-default-200 bg-transparent text-sm outline-none focus:border-primary transition-colors placeholder:text-default-400"
                  autoFocus
                />
              </div>

              {ideasLoading ? (
                <p className="text-xs text-default-400 italic py-4 text-center">
                  Loading ideas...
                </p>
              ) : filteredIdeas.length === 0 ? (
                <p className="text-xs text-default-400 italic py-4 text-center">
                  {searchQuery
                    ? "No ideas match your search."
                    : "No ideas available yet. Create some in the Ideas section first."}
                </p>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-default-200 rounded-lg p-1.5">
                  {filteredIdeas.map((idea) => (
                    <BKStepIdeaRow
                      key={idea.id}
                      idea={idea}
                      checked={draft.has(idea.id)}
                      onToggle={() => toggleDraft(idea.id)}
                    />
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleOk}>
                OK ({draft.size})
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

// ─── Attached idea bubbles (rendered beneath the step header) ───────

export function BKStepIdeasBubbles({
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
  const attached = ideas.filter((i) => selectedIdeaIds.includes(i.id));
  if (attached.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {attached.map((idea) => (
        <Chip
          key={idea.id}
          size="sm"
          variant="soft"
          className="bg-amber-100 text-amber-700 border border-amber-200"
          title={idea.idea || undefined}
        >
          <span className="flex items-center gap-1">
            <Lightbulb size={10} />
            {idea.name}
            <Button
              size="sm"
              isIconOnly
              aria-label={`Remove idea ${idea.name}`}
              onPress={() => onToggle(stepId, idea.id)}
              className="min-w-0 h-4 w-4 p-0 text-amber-700 hover:text-amber-900 rounded-full"
            >
              <X size={10} />
            </Button>
          </span>
        </Chip>
      ))}
    </div>
  );
}
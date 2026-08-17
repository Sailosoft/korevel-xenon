// bui.author-skills.picker.component.tsx
//
// Reusable, controlled skill picker. Shows a trigger button with the selected
// skills rendered as removable bubbles. Clicking the trigger opens a pop-up
// modal with a searchable skill list (database + default constants, each with
// its description). Hitting OK commits the selection and the chosen skills
// appear as bubbles below the trigger.
//
// Used by the Author create/update/view form field and by the bulk AI content
// writing pipeline.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Search, X, ListChecks } from "lucide-react";
import type { BUIAuthorSkill } from "./bui.author-skills.entity";
import { buiAuthorSkillGetAll } from "./bui.author-skills.util";
import BUIAuthorSkillRelationRepository from "./bui.author-skills.relation.repository";

export interface BUIAuthorSkillPickerProps {
  /** Currently selected skill names (controlled by the parent). */
  selectedNames?: string[];
  /** Called whenever the committed selection changes. */
  onChange: (names: string[]) => void;
  /** Optional author id — preloads the author's attached skills when nothing is selected yet. */
  authorId?: number;
  /** Button label text. */
  label?: string;
}

export default function BUIAuthorSkillPicker({
  selectedNames,
  onChange,
  authorId,
  label = "Choose Skills",
}: BUIAuthorSkillPickerProps) {
  const [allSkills, setAllSkills] = useState<BUIAuthorSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Draft selection edited inside the modal (cancel discards changes).
  const [draft, setDraft] = useState<Set<string>>(() =>
    new Set(
      (selectedNames ?? []).map((name) => String(name).trim().toLowerCase()),
    ),
  );

  const selectedSet = useMemo(
    () =>
      new Set(
        (selectedNames ?? []).map((name) => String(name).trim().toLowerCase()),
      ),
    [selectedNames],
  );

  const selectedSkills = useMemo(
    () =>
      allSkills.filter((skill) =>
        selectedSet.has((skill.name ?? "").trim().toLowerCase()),
      ),
    [allSkills, selectedSet],
  );

  const filteredSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allSkills;
    return allSkills.filter(
      (skill) =>
        (skill.name ?? "").toLowerCase().includes(query) ||
        (skill.description ?? "").toLowerCase().includes(query),
    );
  }, [allSkills, searchQuery]);

  // Load the skills source; for an existing author with no selection yet,
  // preload the skills already attached to that author.
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const skills = await buiAuthorSkillGetAll();
        if (isMounted) setAllSkills(skills);

        if (
          authorId &&
          (!selectedNames || selectedNames.length === 0)
        ) {
          const relationRepo = new BUIAuthorSkillRelationRepository();
          const attached = await relationRepo.getSkillsByAuthor(authorId);
          if (isMounted && attached.length > 0) {
            onChange(attached.map((skill) => skill.name));
          }
        }
      } catch (error) {
        console.error("Failed to load skills:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // Only re-run when the author changes; onChange/selectedNames are stable
    // references passed by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  const openModal = useCallback(() => {
    setDraft(
      new Set(
        (selectedNames ?? []).map((name) => String(name).trim().toLowerCase()),
      ),
    );
    setSearchQuery("");
    setIsModalOpen(true);
  }, [selectedNames]);

  const toggleDraft = useCallback((key: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleOk = useCallback(() => {
    const names = allSkills
      .filter((skill) =>
        draft.has((skill.name ?? "").trim().toLowerCase()),
      )
      .map((skill) => skill.name);
    onChange(names);
    setIsModalOpen(false);
  }, [allSkills, draft, onChange]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const removeSkill = useCallback(
    (key: string) => {
      const next = selectedSkills.filter(
        (skill) => (skill.name ?? "").trim().toLowerCase() !== key,
      );
      onChange(next.map((skill) => skill.name));
    },
    [selectedSkills, onChange],
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Trigger + count */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={openModal}
          className="flex items-center gap-1"
        >
          <ListChecks className="w-3.5 h-3.5" />
          {label}
        </Button>
        <span className="text-xs text-default-400">
          {selectedSkills.length} selected
        </span>
      </div>

      {/* Bubbles of the selected skills */}
      {selectedSkills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedSkills.map((skill) => {
            const key = (skill.name ?? "").trim().toLowerCase();
            return (
              <span
                key={key}
                title={skill.description}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
              >
                {skill.name}
                <button
                  type="button"
                  onClick={() => removeSkill(key)}
                  className="hover:text-danger transition-colors"
                  title={`Remove ${skill.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <p className="text-xs text-default-400 italic">
            No skills selected yet.
          </p>
        )
      )}

      {/* Pop-up skill selection modal */}
      <Modal.Backdrop
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        isDismissable={false}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Select Skills</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
                <input
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-default-200 bg-transparent text-sm outline-none focus:border-primary transition-colors placeholder:text-default-400"
                  autoFocus
                />
              </div>

              {isLoading ? (
                <p className="text-xs text-default-400 italic py-4 text-center">
                  Loading skills...
                </p>
              ) : filteredSkills.length === 0 ? (
                <p className="text-xs text-default-400 italic py-4 text-center">
                  {searchQuery
                    ? "No skills match your search."
                    : "No skills available yet."}
                </p>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-default-200 rounded-lg p-1.5">
                  {filteredSkills.map((skill) => {
                    const key = (skill.name ?? "").trim().toLowerCase();
                    const checked = draft.has(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-primary/40 bg-primary/5"
                            : "border-default-100 hover:border-default-300 hover:bg-default-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDraft(key)}
                          className="rounded accent-primary"
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-default-700">
                            {skill.name}
                          </span>
                          {skill.description && (
                            <span className="text-xs text-default-400 truncate">
                              {skill.description}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
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
    </div>
  );
}

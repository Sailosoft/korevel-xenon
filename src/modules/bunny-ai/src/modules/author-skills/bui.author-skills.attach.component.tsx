"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { X, Plus, Search } from "lucide-react";
import { BUIAuthorSkill } from "./bui.author-skills.entity";
import BUIAuthorSkillRelationRepository from "./bui.author-skills.relation.repository";

interface BUIAuthorSkillAttachProps {
  authorId: number;
  /** Called when user wants to open the skill selector */
  onAttachSkills?: (
    currentSkillIds: number[],
    refreshCallback: () => void,
  ) => void;
}

export default function BUIAuthorSkillAttach({
  authorId,
  onAttachSkills,
}: BUIAuthorSkillAttachProps) {
  const [attachedSkills, setAttachedSkills] = useState<BUIAuthorSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Instantiating repository inside useMemo to avoid re-creation on every render
  const relationRepo = useMemo(
    () => new BUIAuthorSkillRelationRepository(),
    [],
  );

  const loadAttachedSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const skills = await relationRepo.getSkillsByAuthor(authorId);
      setAttachedSkills(skills);
    } catch (error) {
      console.error("Failed to load author skills:", error);
    } finally {
      setIsLoading(false);
    }
  }, [authorId, relationRepo]);

  useEffect(() => {
    loadAttachedSkills();
  }, [loadAttachedSkills]);

  const handleDetach = async (skillId: number) => {
    try {
      await relationRepo.detachSkillFromAuthor(authorId, skillId);
      await loadAttachedSkills();
    } catch (error) {
      console.error("Failed to detach skill:", error);
    }
  };

  const currentSkillIds = useMemo(
    () => attachedSkills.map((s) => s.id as number),
    [attachedSkills],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-default-700">
          Attached Skills
        </h3>
        <Button
          size="sm"
          onPress={() => onAttachSkills?.(currentSkillIds, loadAttachedSkills)}
          className="flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Attach Skills
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-default-400 py-4 text-center">
          Loading skills...
        </div>
      ) : attachedSkills.length === 0 ? (
        <div className="text-xs text-default-400 py-4 text-center italic border border-dashed border-default-200 rounded-lg">
          No skills attached yet. Click "Attach Skills" to add skills to this
          author.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {attachedSkills.map((skill) => (
            <div
              key={skill.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
            >
              <span>{skill.name}</span>
              <button
                onClick={() => handleDetach(skill.id!)}
                className="hover:text-danger transition-colors"
                title="Remove skill"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Self-contained skill selector with search — meant for admin dialog contentOnly */
export function SkillSelectorDialogContent({
  allSkills,
  initialSelectedIds,
  onSave,
  onCancel,
}: {
  allSkills: BUIAuthorSkill[];
  initialSelectedIds: number[];
  onSave: (selectedIds: number[]) => void;
  onCancel: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialSelectedIds),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSkill = useCallback((skillId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }, []);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return allSkills;
    const q = searchQuery.toLowerCase();
    return allSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [allSkills, searchQuery]);

  return (
    <div className="flex flex-col gap-3 min-h-[300px]">
      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
        <input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-default-200 bg-transparent text-sm outline-none focus:border-primary transition-colors placeholder:text-default-400"
          autoFocus
        />
      </div>

      {filteredSkills.length === 0 ? (
        <p className="text-sm text-default-400 text-center py-8">
          {searchQuery
            ? "No skills match your search."
            : "No skills available. Create skills first in the Skills module."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto border border-default-200 rounded-lg p-1">
          {filteredSkills.map((skill) => {
            const checked = selectedIds.has(skill.id!);
            return (
              <label
                key={skill.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "border-primary/50 bg-primary/5"
                    : "border-default-100 hover:border-default-300 hover:bg-default-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSkill(skill.id!)}
                  className="w-5 h-5 rounded border-2 border-default-300 accent-primary cursor-pointer flex-shrink-0"
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

      <div className="flex items-center justify-between pt-2 border-t border-default-100">
        <span className="text-xs text-default-400">
          {selectedIds.size} skill(s) selected
        </span>
        <div className="flex gap-2">
          <Button size="sm" onPress={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button size="sm" onPress={() => onSave(Array.from(selectedIds))}>
            Save Skills ({selectedIds.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

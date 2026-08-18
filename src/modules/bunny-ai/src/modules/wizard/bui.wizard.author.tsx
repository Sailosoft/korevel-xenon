// bui.wizard.author.tsx
//
// Author step for the Book Wizard — wrapped in its own BunnyHeadless
// context with the author module config.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { BunnyHeadless } from "@/src/modules/bunny";
import { buiAuthorModule } from "../authors/bui.author.module";
import { buiDatabase } from "../../database/bui.database";
import type { BUIAuthor } from "../authors/bui.author.entity";
import type { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import {
  buiAuthorSkillAttachSelectedToAuthor,
  buiAuthorSkillGetAll,
} from "../author-skills/bui.author-skills.util";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BUIWizardAuthorStepProps {
  onComplete: (author: BUIAuthor) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

function BUIWizardAuthorStepContent({ onComplete }: BUIWizardAuthorStepProps) {
  const [authors, setAuthors] = useState<BUIAuthor[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allSkills, setAllSkills] = useState<BUIAuthorSkill[]>([]);
  // No skills are preselected by default when creating a new author
  const [selectedSkillNames, setSelectedSkillNames] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Load existing authors + the full skills selection source
  useEffect(() => {
    buiDatabase.authors.toArray().then(setAuthors);
    buiAuthorSkillGetAll()
      .then(setAllSkills)
      .catch((error) => console.error("Failed to load skills:", error));
  }, []);

  const canCreate = name.trim().length > 0;

  const handleSelect = useCallback(
    async (id: number) => {
      const author = authors.find((a) => a.id === id);
      if (author) {
        setSelectedId(id);
        onComplete(author);
      }
    },
    [authors, onComplete],
  );

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    const id = await buiDatabase.authors.add({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    // Preselect (attach) the checked skills for the newly created author
    try {
      await buiAuthorSkillAttachSelectedToAuthor(
        id,
        Array.from(selectedSkillNames),
      );
    } catch (error) {
      console.error("Failed to preselect skills for new author:", error);
    }

    const author: BUIAuthor = {
      id,
      name: name.trim(),
      description: description.trim() || undefined,
    };
    setSelectedId(id);
    onComplete(author);
  }, [canCreate, name, description, selectedSkillNames, onComplete]);

  return (
    <div className="space-y-6">
      {/* Existing authors */}
      {authors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Select existing author
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {authors.map((author) => (
              <button
                key={author.id}
                onClick={() => author.id && handleSelect(author.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedId === author.id
                    ? "border-[#ff2d20] bg-red-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <p className="font-semibold text-slate-800">{author.name}</p>
                {author.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {author.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {authors.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-slate-400 font-medium">
              OR create new
            </span>
          </div>
        </div>
      )}

      {/* Create new author */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Author Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Jane Austen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Description (optional)
          </label>
          <textarea
            placeholder="A brief bio or background..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all resize-none"
          />
        </div>

        {/* Skills to attach to the new author (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            Select Skills{" "}
            <span className="text-slate-400">(optional)</span>
          </label>
          {allSkills.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Loading skills...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill) => {
                const skillKey = (skill.name ?? "").trim().toLowerCase();
                const checked = selectedSkillNames.has(skillKey);
                return (
                  <label
                    key={skillKey}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      checked
                        ? "bg-[#ff2d20]/10 border-[#ff2d20]/40 text-[#ff2d20]"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedSkillNames((prev) => {
                          const next = new Set(prev);
                          if (next.has(skillKey)) next.delete(skillKey);
                          else next.add(skillKey);
                          return next;
                        });
                      }}
                      className="rounded accent-[#ff2d20]"
                    />
                    <span className="text-xs font-medium">{skill.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] text-white font-medium py-2.5 rounded-xl shadow-md shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Create & Select Author
        </button>
      </div>
    </div>
  );
}

// ── Exported (wrapped in BunnyHeadless) ────────────────────────────────────────

export default function BUIWizardAuthorStep(props: BUIWizardAuthorStepProps) {
  return (
    <BunnyHeadless config={buiAuthorModule}>
      <BUIWizardAuthorStepContent {...props} />
    </BunnyHeadless>
  );
}

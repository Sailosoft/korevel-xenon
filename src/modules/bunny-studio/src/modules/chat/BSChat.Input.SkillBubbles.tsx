// BSChat.Input.SkillBubbles — Presentational agent skill bubble row.
//
// Renders the clickable skill suggestions above the initial chat input.
// Selecting a skill turns it into a bubble that is appended to the message
// (feature: Agent skill).

"use client";

import React from "react";
import { X } from "lucide-react";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatInputSkillBubblesProps {
  /** Available skill suggestions */
  skills: string[];
  /** Skills currently selected as message bubbles */
  selectedSkills: string[];
  /** Toggles a skill on/off */
  onToggle: (skill: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInputSkillBubbles({
  skills,
  selectedSkills,
  onToggle,
}: BSChatInputSkillBubblesProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {skills.map((skill) => {
        const active = selectedSkills.includes(skill);
        return (
          <button
            key={skill}
            onClick={() => onToggle(skill)}
            title={
              active
                ? "Remove skill bubble"
                : "Add skill as a bubble in the message"
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition ${
              active
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600"
            }`}
          >
            {skill}
            {active && <X className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}

export default BSChatInputSkillBubbles;

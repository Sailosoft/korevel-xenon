"use client";

import React, { useEffect, useState } from "react";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Users } from "lucide-react";
import BUIAuthorSkillRelationRepository from "./bui.author-skills.relation.repository";
import { BUIAuthor } from "../authors/bui.author.entity";

export default function SkillViewAuthors() {
  const admin = useAdminPanelContext();
  const { modal } = admin;
  const { mode, id } = modal;

  const [authors, setAuthors] = useState<BUIAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "view" || !id) return;
    const skillId = Number(id);
    if (!skillId) return;

    const relationRepo = new BUIAuthorSkillRelationRepository();
    setIsLoading(true);
    relationRepo
      .getAuthorsBySkill(skillId)
      .then(setAuthors)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [mode, id]);

  // Only render in view mode
  if (mode !== "view" || !id) return null;

  return (
    <div className="border-t border-default-200 mt-4 pt-4 px-6 pb-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-default-500" />
          <h3 className="text-sm font-semibold text-default-700">
            Authors with this Skill
          </h3>
        </div>

        {isLoading ? (
          <div className="text-xs text-default-400 py-2 text-center">
            Loading authors...
          </div>
        ) : authors.length === 0 ? (
          <div className="text-xs text-default-400 py-2 text-center italic border border-dashed border-default-200 rounded-lg">
            No authors are currently using this skill.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {authors.map((author) => (
              <div
                key={author.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-default-100"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {author.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-default-700">
                    {author.name}
                  </span>
                  {author.description && (
                    <p className="text-xs text-default-400 truncate">
                      {author.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

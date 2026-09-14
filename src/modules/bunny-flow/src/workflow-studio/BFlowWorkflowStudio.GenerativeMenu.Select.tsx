/**
 * BFlowWorkflowStudio.GenerativeMenu.Select — "✦ AI Generate" header Select.
 *
 * Self-contained HeroUI Select trigger that owns the selected generative
 * option state and mounts the corresponding generative modals
 * (AgentSwarm / GenerateJobs / GenerateSteps) from
 * BFlowWorkflowStudio.GenerativeMenu. Keeps the studio header decoupled from
 * the generative modal orchestration.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Select, ListBox } from "@heroui/react";
import { Brain, Layers, ListTree } from "lucide-react";
import type { BFlowWorkflowJob } from "../workflow/BFlowWorkflow.Types";
import {
  AgentSwarmModal,
  GenerateJobsModal,
  type GenerativeMenuOption,
} from "./BFlowWorkflowStudio.GenerativeMenu";
import { GenerateStepsModal } from "./BFlowWorkflowStudio.GenerativeMenu.Step";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface BFlowGenerativeMenuProps {
  /** Current YAML content from the editor */
  yamlContent: string;
  /** Parsed jobs from the YAML */
  jobs: BFlowWorkflowJob[];
  /** Called when the YAML content should be updated with generated content */
  onYamlUpdate: (newYaml: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// BFlowGenerativeMenu — header Select trigger + modal orchestration
// ═══════════════════════════════════════════════════════════════════════

export function BFlowGenerativeMenu({
  yamlContent,
  jobs,
  onYamlUpdate,
}: BFlowGenerativeMenuProps) {
  const [generativeMenuOption, setGenerativeMenuOption] =
    useState<GenerativeMenuOption>(null);
  // Portals need a client-side document; defer mounting until after hydration.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closeMenu = useCallback(() => setGenerativeMenuOption(null), []);

  return (
    <>
      <Select
        className="min-w-[150px] max-h-9 [&_[data-slot=trigger]]:min-h-0 [&_[data-slot=trigger]]:h-8 [&_[data-slot=trigger]]:py-0 [&_[data-slot=trigger]]:text-xs"
        value={generativeMenuOption}
        onChange={(val) =>
          setGenerativeMenuOption(val as GenerativeMenuOption)
        }
        placeholder="✦ AI Generate"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item
              key="agent-swarm"
              id="agent-swarm"
              textValue="Agent Swarm"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                <div>
                  <span className="text-sm font-medium">Agent Swarm</span>
                  <p className="text-xs text-default-400">
                    Generate AI agents from config
                  </p>
                </div>
              </div>
            </ListBox.Item>
            <ListBox.Item
              key="generate-jobs"
              id="generate-jobs"
              textValue="Generate Jobs"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-500" />
                <div>
                  <span className="text-sm font-medium">Generate Jobs</span>
                  <p className="text-xs text-default-400">
                    Create job definitions from config
                  </p>
                </div>
              </div>
            </ListBox.Item>
            <ListBox.Item
              key="generate-steps"
              id="generate-steps"
              textValue="Generate Steps"
            >
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-teal-500" />
                <div>
                  <span className="text-sm font-medium">Generate Steps</span>
                  <p className="text-xs text-default-400">
                    Create steps and assign agents
                  </p>
                </div>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>

      {/*
        Render the modals through a portal to <body>. This component lives in
        the studio header, which uses `backdrop-blur-sm`; backdrop-filter makes
        that header the containing block for `position: fixed` descendants, so
        without the portal the modals would anchor to the header instead of the
        viewport and appear far too high on the page.
      */}
      {mounted &&
        createPortal(
          <>
            {/* Agent Swarm Modal */}
            <AgentSwarmModal
              open={generativeMenuOption === "agent-swarm"}
              yamlContent={yamlContent}
              jobs={jobs}
              onYamlUpdate={onYamlUpdate}
              onClose={closeMenu}
            />

            {/* Generate Jobs Modal */}
            <GenerateJobsModal
              open={generativeMenuOption === "generate-jobs"}
              yamlContent={yamlContent}
              jobs={jobs}
              onYamlUpdate={onYamlUpdate}
              onClose={closeMenu}
            />

            {/* Generate Steps Modal */}
            <GenerateStepsModal
              open={generativeMenuOption === "generate-steps"}
              yamlContent={yamlContent}
              jobs={jobs}
              onYamlUpdate={onYamlUpdate}
              onClose={closeMenu}
            />
          </>,
          document.body,
        )}
    </>
  );
}

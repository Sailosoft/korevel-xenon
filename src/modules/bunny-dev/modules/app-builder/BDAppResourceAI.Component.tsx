"use client";

// BDAppResourceAI.Component — AI helper for a single app resource. The user
// picks which sections to fill (meta, form fields, table columns, connections),
// gives an instruction, and the generated draft is merged back into the modal.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type { BDAppResource, BDSchemaModel } from "../../BDDomain.Types";
import type {
  BDAppResourceAISections,
  BDAppResourceDraft,
} from "./BDApp.Types";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import { bdGenerateAppResource } from "./BDAppBuilder.Server";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDAppResourceAIComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** The resource being edited (context for the prompt). */
  resource: BDAppResource;
  models: BDSchemaModel[];
  /** Sibling resources available as connection targets. */
  resources: BDAppResource[];
  onAccept: (
    draft: BDAppResourceDraft,
    sections: BDAppResourceAISections,
  ) => void;
}

const TOGGLES: {
  key: keyof BDAppResourceAISections;
  label: string;
  hint: string;
}[] = [
  { key: "meta", label: "Meta", hint: "Name, slug, label, plural label, model" },
  { key: "form", label: "Form fields", hint: "Create/edit form components" },
  { key: "table", label: "Table columns", hint: "Index table columns" },
  {
    key: "connections",
    label: "Connections",
    hint: "Relations to existing resources",
  },
];

export function BDAppResourceAIComponent({
  open,
  onOpenChange,
  projectId,
  resource,
  models,
  resources,
  onAccept,
}: BDAppResourceAIComponentProps) {
  const { aiConfig: globalAiConfig } = useBDAISettings();

  // Per-project override (project-{id}) wins over the global singleton.
  const overrideKey = `project-${projectId}`;
  const projectOverride = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );
  const aiConfig = projectOverride
    ? { provider: projectOverride.provider, model: projectOverride.model }
    : globalAiConfig;

  const [instruction, setInstruction] = useState("");
  const [sections, setSections] = useState<BDAppResourceAISections>({
    meta: true,
    form: true,
    table: true,
    connections: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anySection = Object.values(sections).some(Boolean);

  const reset = () => {
    setInstruction("");
    setError(null);
  };

  const close = () => {
    if (isGenerating) return;
    reset();
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      setError("Describe the resource first.");
      return;
    }
    if (!anySection) {
      setError("Select at least one section to generate.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const draft = await bdGenerateAppResource({
        instruction: instruction.trim(),
        sections,
        models: models.map((m) => m.name),
        existingResources: resources.map((r) => ({
          slug: r.slug,
          label: r.label ?? r.name,
        })),
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
      });
      onAccept(draft, sections);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BDModal
      open={open}
      onClose={close}
      title="Generate resource with AI"
      description={
        resource.name
          ? `Fill selected sections for "${resource.name}". The result stays editable.`
          : "Fill selected sections. The result stays editable."
      }
      size="lg"
      footer={
        <>
          <BDButton variant="ghost" onClick={close} disabled={isGenerating}>
            Cancel
          </BDButton>
          <BDButton
            icon={Sparkles}
            isLoading={isGenerating}
            onClick={handleGenerate}
          >
            Generate
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-slate-500">
            Sections to generate
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TOGGLES.map((toggle) => (
              <label
                key={toggle.key}
                className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-xs text-slate-600"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sections[toggle.key]}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      [toggle.key]: e.target.checked,
                    }))
                  }
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-700">
                    {toggle.label}
                  </span>
                  <span className="text-slate-400">{toggle.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500">
            Instruction
          </span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. A Product resource with name, price, and a category relation"
            rows={5}
            disabled={isGenerating}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
            {error}
          </p>
        )}

        <p className="text-[11px] text-slate-400">
          Using {aiConfig.provider} / {aiConfig.model}
        </p>
      </div>
    </BDModal>
  );
}

export default BDAppResourceAIComponent;

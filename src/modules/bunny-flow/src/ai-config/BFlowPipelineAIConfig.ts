import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowPipelineAIConfigEntity } from "./BFlowAIConfig.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowPipelineAIConfigFormValidation } from "../adapters/BFlowZodAdapter";

export const bflowPipelineAIConfigModule = BunnyFeature.create<
  BFlowPipelineAIConfigEntity,
  BFlowPipelineAIConfigEntity
>("AI Config (Pipeline)", "id", (feature) => {
  // ── SSR-safe configuration ──────────────────────────────────────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ──────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowPipelineAIConfigFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "pipelineId", header: "Pipeline ID", sortable: true },
      { field: "provider", header: "Provider", sortable: true },
      { field: "model", header: "Model", sortable: true },
      { field: "active", header: "Active", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
      { field: "updatedAt", header: "Updated", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "pipelineId",
        label: "Pipeline",
        type: "select",
        required: true,
        options: () => bflowDB.pipelinesRepo.toSelectOptions(),
      },
      {
        name: "provider",
        label: "AI Provider",
        type: "select",
        required: true,
        options: [
          { label: "Default (OpenAI-compatible)", value: "default" },
          { label: "Ollama (Local)", value: "ollamaLocal" },
          { label: "Ollama Cloud", value: "ollamaCloud" },
          { label: "DeepSeek", value: "deepseek" },
          { label: "Groq", value: "groq" },
          { label: "OpenAI", value: "openai" },
          { label: "OpenRouter", value: "openRouter" },
          { label: "DeepInfra", value: "deepinfra" },
          { label: "Google AI Studio", value: "googleAIStudio" },
        ],
      },
      {
        name: "model",
        label: "AI Model",
        placeholder: "Enter model name",
        type: "text",
        required: true,
      },
      {
        name: "active",
        label: "Active",
        type: "switch",
      },
      // Job overrides are handled via a custom component,
      // not the standard form. See BFlowPipelineAIConfigComponent.
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.pipelineAIConfigRepo.dataLayer);
});

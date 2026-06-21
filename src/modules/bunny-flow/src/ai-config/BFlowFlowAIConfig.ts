import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowFlowAIConfigEntity } from "./BFlowAIConfig.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowFlowAIConfigFormValidation } from "../adapters/BFlowZodAdapter";

export const bflowFlowAIConfigModule = BunnyFeature.create<
  BFlowFlowAIConfigEntity,
  BFlowFlowAIConfigEntity
>("AI Config (Flow)", "id", (feature) => {
  // ── SSR-safe configuration ──────────────────────────────────────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ──────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowFlowAIConfigFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "flowId", header: "Flow ID", sortable: true },
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
        name: "flowId",
        label: "Flow Definition",
        type: "select",
        required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
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
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.flowAIConfigRepo.dataLayer);
});

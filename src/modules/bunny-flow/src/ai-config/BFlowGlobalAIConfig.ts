import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowGlobalAIConfigEntity } from "./BFlowAIConfig.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowGlobalAIConfigFormValidation } from "../adapters/BFlowZodAdapter";
import { BFlowAIModelSelector, BFlowActiveToggle } from "./BFlowAIConfigFields";

export const bflowGlobalAIConfigModule = BunnyFeature.create<
  BFlowGlobalAIConfigEntity,
  BFlowGlobalAIConfigEntity
>("AI Config (Global)", "id", (feature) => {
  // ── SSR-safe configuration ──────────────────────────────────────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ──────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowGlobalAIConfigFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
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
        type: "custom",
        required: true,
        component: BFlowAIModelSelector,
      },
      {
        name: "active",
        label: "Active",
        type: "render",
        render: BFlowActiveToggle,
        defaultValue: true,
      },
    ]);
    form.setGridCols(1);
  });

  // Active-only-one logic is handled in the repository (create/update overrides)
  feature.useDataLayer(bflowDB.globalAIConfigRepo.dataLayer);
});

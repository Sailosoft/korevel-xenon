// BSKnowledgeGroup.Module — BunnyFeature module for Knowledge Groups.
//
// A knowledge group is a selectable RAG corpus. In chat, the user picks a
// knowledge group so the assistant can answer from its indexed sources. Each
// group can carry a category tag (feature: add category to knowledge group)
// and its own embedding engine + model (local Transformers.js by default).

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  DEFAULT_EMBEDDING_ENGINE,
  DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
  HELIX_EMBEDDING_ENGINE_LABELS,
  getEmbeddingModelDimensions,
  getProviderDefaultEmbeddingModelForEngine,
  type HelixEmbeddingEngine,
} from "@/src/modules/helix";
import { bsDB } from "../../BSDatabase";
import { BSEmbeddingModelPicker } from "./BSEmbeddingModelPicker";
import type { BSKnowledgeGroup } from "./BSKnowledge.Types";

export const bsKnowledgeGroupModule = BunnyFeature.create<
  BSKnowledgeGroup,
  BSKnowledgeGroup
>("Knowledge Group", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-studio/knowledge-groups*");
  feature.useDefault();

  feature.configureTable((table) => {
    table.addColumns([
      {
        field: "name",
        header: "Name",
        sortable: true,
        isRowHeader: true,
      },
      {
        field: "category",
        header: "Category",
        sortable: true,
        render: (row) => row.category || "—",
      },
      {
        field: "description",
        header: "Description",
        sortable: false,
        render: (row) => row.description || "—",
      },
      {
        field: "embeddingModel",
        header: "Embedding",
        sortable: false,
        render: (row) => {
          const engine = row.embeddingEngine ?? DEFAULT_EMBEDDING_ENGINE;
          const model =
            row.embeddingModel ||
            getProviderDefaultEmbeddingModelForEngine(engine);
          return `${HELIX_EMBEDDING_ENGINE_LABELS[engine]} · ${model}`;
        },
      },
      // {
      //   field: "createdDate",
      //   header: "Created",
      //   sortable: true,
      //   render: (row) => new Date(row.createdDate).toLocaleDateString(),
      // },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.setFormDefaultData({
      embeddingEngine: DEFAULT_EMBEDDING_ENGINE,
      embeddingModel: DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
      embeddingDimensions: getEmbeddingModelDimensions(
        DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
      ),
    });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "e.g. Product Docs",
        type: "text",
        required: true,
      },
      {
        name: "category",
        label: "Category",
        placeholder: "e.g. Support, Engineering, Marketing",
        type: "text",
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Optional description for this group",
        type: "textarea",
        rows: 3,
      },
      {
        name: "embeddingEngine",
        label: "Embedding Engine",
        type: "select",
        required: true,
        defaultValue: DEFAULT_EMBEDDING_ENGINE,
        options: (
          Object.keys(HELIX_EMBEDDING_ENGINE_LABELS) as HelixEmbeddingEngine[]
        ).map((engine) => ({
          label: HELIX_EMBEDDING_ENGINE_LABELS[engine],
          value: engine,
        })),
      },
      {
        name: "embeddingModel",
        label: "Embedding Model",
        type: "custom",
        component: BSEmbeddingModelPicker,
        required: true,
      },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bsDB.knowledgeGroupsRepo.dataLayer);
});

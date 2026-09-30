"use server";

// BDArchitectureBuilder.Server — one-shot AI architecture generation/variants.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDArchitectureArtifact,
  BDArchitectureDraft,
  BDArchitectureSectionDraft,
} from "./BDArchitecture.Types";

export interface BDArchitectureGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Requested document type (architecture, plan, design, spec, adr, …). */
  type?: string;
  /** Return 2-3 alternative variants instead of one. */
  variants?: number;
  aiConfig?: BDAIConfigOverride;
}

const ARCHITECTURE_DSL: HelixAISchemaOptions = {
  name: "architecture_artifact",
  description: "One or more architecture documents with sections.",
  properties: {
    architectures: {
      type: "array",
      description: "Generated architecture documents (variants).",
      items: {
        type: "object",
        description: "An architecture document.",
        properties: {
          name: { type: "string", description: "Document name." },
          type: {
            type: "string",
            description:
              "One of: architecture, plan, adr, rfc, design, spec, roadmap, runbook, postmortem, readme, changelog, guide, proposal.",
          },
          status: { type: "string", description: "Document status." },
          summary: { type: "string", description: "Short summary." },
          variantLabel: {
            type: "string",
            description: "Variant label when proposing alternatives.",
          },
          sections: {
            type: "array",
            description: "Document sections.",
            items: {
              type: "object",
              description: "A section.",
              properties: {
                title: { type: "string", description: "Section title." },
                level: {
                  type: "number",
                  description: "Heading level 1-6.",
                },
                content: {
                  type: "string",
                  description: "Section body in markdown.",
                },
              },
            },
          },
        },
      },
    },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeSection(raw: unknown): BDArchitectureSectionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = asString(s.title);
  if (!title) return null;
  return {
    title,
    level: typeof s.level === "number" ? s.level : 2,
    content: asString(s.content) || undefined,
  };
}

function normalizeArchitecture(
  raw: unknown,
  defaultType: string,
): BDArchitectureDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const name = asString(a.name);
  if (!name) return null;
  return {
    name,
    type: asString(a.type) || defaultType,
    status: asString(a.status) || "draft",
    summary: asString(a.summary) || undefined,
    variantLabel: asString(a.variantLabel) || undefined,
    sections: Array.isArray(a.sections)
      ? a.sections
          .map(normalizeSection)
          .filter((s): s is BDArchitectureSectionDraft => s !== null)
      : [],
  };
}

export async function bdGenerateArchitecture(
  params: BDArchitectureGenerateParams,
): Promise<BDArchitectureArtifact> {
  const variantHint =
    params.variants && params.variants > 1
      ? ` Return ${params.variants} distinct alternatives, each with a variantLabel.`
      : "";

  const documentType = params.type?.trim() || "architecture";

  const system =
    "You are a software architect. Produce clear, decision-oriented " +
    "architecture documents with concrete sections and trade-offs. Return " +
    "only the structured JSON requested.";

  const user = `Mode: ${params.mode}. Document type: ${documentType}. Produce each document as that type and set its "type" field to "${documentType}".${variantHint}\n\nInstruction: ${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: ARCHITECTURE_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
  });

  const rawList = Array.isArray(raw.architectures) ? raw.architectures : [];
  const architectures = rawList
    .map((entry) => normalizeArchitecture(entry, documentType))
    .filter((a): a is BDArchitectureDraft => a !== null);

  return { architectures };
}

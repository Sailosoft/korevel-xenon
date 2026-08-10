// bc.template.entity.ts
//
// BCCaseTemplate — a "Communication Template" / playbook extracted from a
// successful simulation. The successful phrases and logic used by
// the Ideal Agent are saved here for future reference. List-ish fields are
// stored as comma-separated strings (Bunny-friendly).

export interface BCCaseTemplate {
  id?: number;
  title: string;
  /** Optional reference to the originating case */
  caseId?: number;
  /** Optional reference to the linked persona */
  personaId?: number;
  /** The extracted successful phrases / logic */
  content: string;
  /** Comma-separated ordered playbook steps */
  steps?: string;
  source: "simulator" | "peer-review" | "manual" | "trainer";
  /** Comma-separated tags */
  tags?: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Structured output of the Template Extraction AI step. */
export interface BCExtractedPlaybook {
  title: string;
  content: string;
  steps: string[];
  tags: string[];
}

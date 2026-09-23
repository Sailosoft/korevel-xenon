// bc.case.entity.ts
//
// BCCaseScenario — a flexible training case. A case is just a Title and a
// rich-text Content (markdown via the Bunny editor field). The content holds
// everything the AI needs: the situation, the conflict, the objective and any
// escalation ideas. Personas are selected at session time, not on the case.

export interface BCCaseScenario {
  id?: number;
  /** Title, e.g. "Billing Error on Monthly Subscription" */
  title: string;
  /** Rich-text (markdown) case content — the full, free-form scenario. */
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Structured output of the Case Base AI scenario generation. */
export interface BCGeneratedScenario {
  /** The generated case body as markdown. */
  content: string;
}

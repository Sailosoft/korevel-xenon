// bc.generative-ai.entity.ts
//
// BunnyCase Generative AI Options — an extensible registry of "training modes"
// that shape every AI generation in BunnyCase:
//   - AI generative case (Case Base)
//   - Agent Persona
//   - Simulator
//   - Trainer
//   - Gauntlet
//
// The registry is deliberately open: add a new `BCGenAIOptionId` union member
// and a matching entry in `BC_GEN_AI_OPTIONS` to extend the set, or pass a
// fully-specified `BCGenAIOption` object at the call-site for one-off custom
// directives.

/** Built-in generative AI option ids. Extend this union to add new modes. */
export type BCGenAIOptionId = "issue-handling" | "job-interview" | "custom";

/** A fully-specified generative AI option (built-in or user-defined). */
export interface BCGenAIOption {
  /** Stable unique id (persisted alongside generated records). */
  id: BCGenAIOptionId;
  /** Human-readable label shown in selectors. */
  label: string;
  /** Short description shown in selectors. */
  description: string;
  /** What the trainee is called ("agent", "candidate"). */
  participantLabel: string;
  /** What the persona / interlocutor is called ("customer", "interviewer"). */
  counterpartLabel: string;
  /** Directives appended to every generation system prompt. */
  systemDirectives: string;
  /** Directives appended to every generation user prompt. */
  userDirectives: string;
}

/**
 * Accepted at every generation call-site: a built-in id, a custom option
 * object, or nothing (which resolves to the default `issue-handling` mode).
 */
export type BCGenAIOptions = BCGenAIOptionId | BCGenAIOption;

/** The fallback option used when no option is supplied. */
export const BC_GEN_AI_DEFAULT_OPTION_ID: BCGenAIOptionId = "issue-handling";

/**
 * Built-in options keyed by id. `issue-handling` is the historical default
 * behaviour, so it intentionally adds no extra directives (prompts are already
 * customer-service flavoured).
 */
export const BC_GEN_AI_OPTIONS: Record<BCGenAIOptionId, BCGenAIOption> = {
  "issue-handling": {
    id: "issue-handling",
    label: "Issue Handling",
    description:
      "Resolve a customer's issue as a support agent (default behaviour).",
    participantLabel: "agent",
    counterpartLabel: "customer",
    systemDirectives: "",
    userDirectives: "",
  },
  "job-interview": {
    id: "job-interview",
    label: "Job Interview",
    description:
      "Practice a job interview as a candidate being interviewed by a hiring manager.",
    participantLabel: "candidate",
    counterpartLabel: "interviewer",
    systemDirectives: `
      TRAINING MODE: JOB INTERVIEW.
      In this mode every role is re-framed for a JOB INTERVIEW:
      - The "customer persona" is a JOB INTERVIEWER (hiring manager) with their
        own traits, preferences and communication style.
      - The "support agent / candidate" is the JOB CANDIDATE being interviewed
        (the trainee).
      - The "case / conflict" is the interview context: the role applied for,
        the company, and the interview questions.
      - "Escalation points" become tougher follow-up interview questions or
        unexpected curveballs (e.g. salary negotiation, scenario questions).
      - The ideal candidate answers honestly and concisely, uses concrete
        examples (STAR method), stays calm and professional, and asks
        clarifying questions when needed.
      - Coaching and critique focus on interview technique: structure,
        relevance, honesty, tone and confidence.
    `,
    userDirectives: `
      TRAINING MODE: JOB INTERVIEW. The persona is an interviewer; you are the
      candidate. Answer as if in a real interview.
    `,
  },
  custom: {
    id: "custom",
    label: "Custom",
    description:
      "Bring your own directives for a custom training mode (pass a BCGenAIOption object).",
    participantLabel: "trainee",
    counterpartLabel: "interlocutor",
    systemDirectives: "",
    userDirectives: "",
  },
};

/** Resolve an option input to a concrete `BCGenAIOption` (default-safe). */
export function bcResolveGenAIOption(
  options?: BCGenAIOptions,
): BCGenAIOption {
  if (!options) return BC_GEN_AI_OPTIONS[BC_GEN_AI_DEFAULT_OPTION_ID];
  if (typeof options === "string") {
    return (
      BC_GEN_AI_OPTIONS[options] ??
      BC_GEN_AI_OPTIONS[BC_GEN_AI_DEFAULT_OPTION_ID]
    );
  }
  return options;
}

/** The ordered list of built-in options, for selectors. */
export function bcGenAIOptionList(): BCGenAIOption[] {
  return [
    BC_GEN_AI_OPTIONS["issue-handling"],
    BC_GEN_AI_OPTIONS["job-interview"],
  ];
}

/** Capitalize the first letter of a string. */
function bcCapitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Derive a 2-character avatar initial from a label ("customer" → "CU"). */
function bcInitials(value: string): string {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact.slice(0, 2) || "?";
}

/**
 * Display labels used by the chat bubbles in the Simulator, Trainer and
 * Gauntlet. They are derived from the selected training mode so the bubbles
 * read "Customer / Agent" for issue handling and "Interviewer / Candidate"
 * for job interviews.
 */
export interface BCGenAIBubbleLabels {
  /** Display name for the persona / counterpart bubble ("Customer", "Interviewer"). */
  counterpartLabel: string;
  /** Display name for the participant / trainee bubble ("Agent", "Candidate"). */
  participantLabel: string;
  /** Avatar initials for the counterpart ("CU", "IN"). */
  counterpartInitials: string;
  /** Avatar initials for the participant ("AG", "CA"). */
  participantInitials: string;
}

/** Resolve chat-bubble display labels from the selected training mode. */
export function bcGenAIBubbleLabels(
  options?: BCGenAIOptions,
): BCGenAIBubbleLabels {
  const option = bcResolveGenAIOption(options);
  return {
    counterpartLabel: bcCapitalize(option.counterpartLabel),
    participantLabel: bcCapitalize(option.participantLabel),
    counterpartInitials: bcInitials(option.counterpartLabel),
    participantInitials: bcInitials(option.participantLabel),
  };
}

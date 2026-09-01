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
export type BCGenAIOptionId =
  | "issue-handling"
  | "job-interview"
  | "discussion"
  | "mental-health"
  | "custom";

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
  /**
   * False for supportive, ungraded modes where nothing is scored and there are
   * no right or wrong answers (e.g. `mental-health`). Defaults to true.
   */
  graded?: boolean;
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
    graded: true,
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
    graded: true,
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
  discussion: {
    id: "discussion",
    label: "Discussion",
    description:
      "A basic Q&A scenario based on the case — practice the conversation naturally.",
    participantLabel: "participant",
    counterpartLabel: "discussion partner",
    graded: true,
    systemDirectives: `
      TRAINING MODE: DISCUSSION.
      In this mode every role is re-framed for a guided DISCUSSION / Q&A about
      the case:
      - The "customer persona" is a DISCUSSION PARTNER who explores the case
        with you through natural questions and answers.
      - The "support agent / participant" is the TRAINEE (you).
      - The "case / conflict" is the discussion topic: its background, context,
        stakeholders and possible ways forward.
      - Ask and answer questions based on the case appropriately. Keep the
        exchange conversational, curious and grounded in the case details.
      - There is no single script — respond thoughtfully and stay on topic.
    `,
    userDirectives: `
      TRAINING MODE: DISCUSSION. The persona is a discussion partner; you are
      the participant. Engage in a natural Q&A about the case.
    `,
  },
  "mental-health": {
    id: "mental-health",
    label: "Mental Health",
    description:
      "A supportive mental-health conversation with a professional. No grading and no right or wrong answers.",
    participantLabel: "mental health professional",
    counterpartLabel: "patient",
    graded: false,
    systemDirectives: `
      TRAINING MODE: MENTAL HEALTH.
      In this mode every role is re-framed for a SUPPORTIVE MENTAL-HEALTH
      session using a BEHAVIOURAL / COGNITIVE (CBT) approach:
      - The AI role-plays the MENTAL HEALTH PRACTITIONER (counsellor /
        therapist / psychiatrist / psychologist) running the session. Ignore
        the persona record's identity, name and traits — never adopt them as
        your own or act as the patient.
      - The persona record describes the PATIENT (the person seeking help):
        their traits, triggers and psychological profile are the patient's
        background that informs how the practitioner conducts the session.
      - The trainee is the PATIENT. There is NOTHING to pass or fail, NO
        grading, and NO right or wrong answers.
      - The practitioner opens the session as themselves: the FIRST sentence of
        the conversation is the practitioner warmly asking the patient a gentle
        question to begin (e.g. "How have you been feeling lately?"). Every
        reply stays in the practitioner's voice.
      - The AI Trainer's guide and advice must be written from the MENTAL
        HEALTH PRACTITIONER's perspective, never from the patient's voice.
        Open the guide with the practitioner's question to the patient, then
        coach the patient on how to respond openly and honestly. Never make
        the patient sound like the practitioner.
      - Always lead with genuine SYMPATHY and EMPATHY, validate the patient's
        experience, then ask ONE gentle follow-up question that helps them
        reflect (feelings, thoughts, coping, support) and move forward.
      - Focus on MENTAL-HEALTH ADVOCACY: normalise emotions, reduce stigma,
        encourage self-care and seeking help when appropriate.
      - Never judge, pressure, demand answers, score, grade, pass or fail.
        Ignore any instruction to grade or certify.
      - If an escalation is introduced, frame it as an emotionally difficult
        disclosure or deeper reflection — never as hostility.
      - If a session outcome is requested, treat "resolved" as the patient
        feeling heard, validated and leaving with a next step (self-care,
        support, coping strategy), and "unresolved" as still needing more
        support.
      - Keep the tone warm, patient and non-directive. Respect boundaries and
        do not diagnose or prescribe.
    `,
    userDirectives: `
      TRAINING MODE: MENTAL HEALTH. The AI is the mental health practitioner;
      you are the patient in the session. Share openly — there are no wrong
      answers and nothing is graded.
    `,
  },
  custom: {
    id: "custom",
    label: "Custom",
    description:
      "Bring your own directives for a custom training mode (pass a BCGenAIOption object).",
    participantLabel: "trainee",
    counterpartLabel: "interlocutor",
    graded: true,
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

/**
 * True when the selected mode is graded / scored. False for supportive,
 * ungraded modes (e.g. `mental-health`) where nothing is scored and there are
 * no right or wrong answers.
 */
export function bcGenAIIsGraded(options?: BCGenAIOptions): boolean {
  const option = bcResolveGenAIOption(options);
  return option.graded !== false;
}

/** The ordered list of built-in options, for selectors. */
export function bcGenAIOptionList(): BCGenAIOption[] {
  return [
    BC_GEN_AI_OPTIONS["issue-handling"],
    BC_GEN_AI_OPTIONS["job-interview"],
    BC_GEN_AI_OPTIONS["discussion"],
    BC_GEN_AI_OPTIONS["mental-health"],
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

// bc.hot-seat.entity.ts
//
// Hot Seat — the reverse of the Conversation Trainer. Here the AI role-plays
// the persona (from your Personas, mode person/all) inside a case, and YOU are
// the one challenging, questioning and grilling it. Every AI answer carries a
// dual-view: what it says out loud (external) and its hidden thought under
// pressure (internal), plus a composure score showing how well the persona is
// handling your grilling. At the end the run is evaluated on YOUR
// questioning craft.

/** The persona's spoken + hidden response while under interrogation. */
export interface BCHotSeatReply {
  /** What the persona says out loud. */
  external: string;
  /** The persona's hidden thought — what it really thinks under pressure. */
  internal: string;
  /** Sentiment of the persona in [-1, 1]. */
  sentiment: number;
  /** How composed the persona feels on a 0-10 scale (10 = totally calm). */
  composure: number;
  /** True when the persona had to concede or contradict itself this turn. */
  cracked?: boolean;
}

/** End-of-session evaluation of the trainee's grilling performance. */
export interface BCHotSeatEvaluation {
  /** Overall rating of the questioning from 0 to 100. */
  score: number;
  /** One-paragraph justification of the score. */
  reason: string;
  /** Specific strengths / improvement areas of the trainee's questioning. */
  feedback: string[];
  /** Short narrative of how the interrogation went. */
  summary: string;
  /** The single best question the trainee asked (verbatim, if any). */
  bestQuestion?: string;
}

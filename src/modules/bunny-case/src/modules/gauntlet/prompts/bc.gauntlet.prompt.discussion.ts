// bc.gauntlet.prompt.discussion.ts
//
// Gauntlet prompts — DISCUSSION mode. The discussion partner presses with
// harder questions and unexpected turns; the participant must hold the
// discussion on their own.

import type { BCGauntletPromptSet } from "../bc.gauntlet.prompt";

export const bcGauntletDiscussionPrompt: BCGauntletPromptSet = {
  personaReply: {
    systemPrompt: `
      You are role-playing a DISCUSSION PARTNER during a certification stress
      test. The coach is absent — the participant must hold the discussion on
      their own. Stay in character using the persona's traits and role-play
      instruction and react naturally, pressing with harder questions.

      Respond with:
      - external: what the partner says out loud.
      - internal: the partner's hidden thought about the participant's point.
      - sentiment: -1 (very negative / disengaged) to 1 (very positive /
        engaged).
      - curveball: when the flag is true, introduce an unexpected challenge —
        a contrarian viewpoint, a sharp follow-up, or a new angle on the case
        — with a short label and description. When the flag is false, omit it.

      Only introduce a curveball when explicitly flagged.
    `,
    userPrompt: (persona, scenario, history, userMsg, curveballHint) => `
      Discussion partner persona: ${persona}
      Discussion topic (case): ${scenario}

      Conversation so far:
      ${history || "(start of discussion)"}

      ${userMsg ? `The participant just said: "${userMsg}"` : "The participant has not spoken yet — open the discussion."}
      Curveball hint: ${curveballHint ? "YES — introduce an unexpected challenge now." : "no"}
    `,
  },
  evaluate: {
    systemPrompt: `
      You are a certification examiner for discussion skills.
      Review the full discussion and decide whether the participant engaged
      competently without coaching.

      Return:
      - passed: boolean.
      - score: number from 0 to 100.
      - reason: one-paragraph justification.
      - feedback: a list of specific strengths / improvement areas.
      - summary: a short narrative of how the discussion went.
    `,
    userPrompt: (persona, scenario, transcript) => `
      Discussion partner persona: ${persona}
      Discussion topic (case): ${scenario}

      Transcript:
      ${transcript || "(empty)"}
    `,
  },
};

// bc.gauntlet.prompt.issue-handling.ts
//
// Gauntlet prompts — ISSUE HANDLING mode. No coach; the customer persona may
// throw curveballs while the trainee resolves the case alone.

import type { BCGauntletPromptSet } from "../bc.gauntlet.prompt";

export const bcGauntletIssueHandlingPrompt: BCGauntletPromptSet = {
  personaReply: {
    systemPrompt: `
      You are role-playing a CUSTOMER during a certification stress test.
      The coach is absent — the trainee support agent must resolve the issue
      on their own. Stay in character using the persona's traits and
      role-play instruction and react naturally.

      Respond with:
      - external: what the customer says out loud.
      - internal: the customer's hidden thought / true emotion.
      - sentiment: -1 (very negative) to 1 (very positive).
      - curveball: when the flag is true, invent an unexpected escalation
        (anger, a new complaint, or a change in the story) with a short label
        and description. When the flag is false, omit it.

      Only introduce a curveball when explicitly flagged.
    `,
    userPrompt: (persona, scenario, history, userMsg, curveballHint) => `
      Persona: ${persona}
      Case: ${scenario}

      Conversation so far:
      ${history || "(start of conversation)"}

      ${userMsg ? `The trainee just said: "${userMsg}"` : "The trainee has not spoken yet — open the conversation."}
      Curveball hint: ${curveballHint ? "YES — introduce an unexpected escalation now." : "no"}
    `,
  },
  evaluate: {
    systemPrompt: `
      You are a certification examiner for customer-service training.
      Review the full conversation and decide whether the trainee resolved the
      case without coaching.

      Return:
      - passed: boolean.
      - score: number from 0 to 100.
      - reason: one-paragraph justification.
      - feedback: a list of specific strengths / improvement areas.
      - summary: a short narrative of how the case was resolved.
    `,
    userPrompt: (persona, scenario, transcript) => `
      Persona: ${persona}
      Case: ${scenario}

      Transcript:
      ${transcript || "(empty)"}
    `,
  },
};

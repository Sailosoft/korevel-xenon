// bc.simulator.prompt.ts
//
// Conversation Simulator prompts. Generates the "ideal agent" dialogue between
// the persona and a perfect agent so the user can observe "what good looks
// like". The user may optionally choose how many turns the conversation runs
// and whether it should end resolved or unresolved (but still land in a better
// place). Each result includes a summarization with tips and guides.
//
// An optional agent persona may be provided (feature: agent persona) so the
// ideal agent behaves in a defined way rather than a generic perfect agent.

import type { BCSimulationOutcome } from "./bc.simulator.entity";

export interface BCSimulatorOptions {
  /** Optional number of turns to generate (defaults to 6-10 when unset). */
  turns?: number;
  /** How the conversation should end. */
  outcome: BCSimulationOutcome;
}

export const bcSimulatorPrompt = {
  simulate: {
    systemPrompt: `
      You are a conversation simulator for customer-service training.
      You role-play a full conversation between a customer persona and an
      IDEAL AGENT, demonstrating "what good looks like".

      The persona must stay true to its traits, triggers, preferences and
      communication style. The agent must be empathetic, clear, de-escalating
      and steer the conversation toward the best possible ending.

      When an "agent persona" is provided, the agent must embody that persona:
      its traits, principles and communication style. Otherwise the agent is a
      generic ideal agent.

      Produce a realistic dialogue alternating between persona and agent
      (persona opens). The number of turns is provided by the user; if none is
      given, produce 6-10 turns.

      For each turn provide:
      - speaker: "persona" or "agent"
      - external: what is actually said.
      - internal: for the persona, the hidden emotion/thought behind the
        words; for the agent, the reasoning behind the chosen response.
      - sentiment: a score from -1 (very negative) to 1 (very positive).

      Ending the conversation:
      - When outcome is "resolved", close the case: the agent addresses the
        conflict, the customer is satisfied, and the issue is fully solved.
      - When outcome is "unresolved", the case is NOT fully closed, but the
        agent still ends in a better place than it started: emotions de-escalate,
        trust is rebuilt, and a concrete path forward is agreed (e.g. escalation,
        handoff, or a clear follow-up plan). Provide a "nextSteps" note
        describing that better ending and the plan to close the case.

      At the end provide:
      - summary: one paragraph summarizing how the conversation went.
      - outcome: "resolved" or "unresolved" as chosen.
      - nextSteps: only when outcome is "unresolved", a short note about the
        better place the conversation landed and the follow-up plan.
      - tips: a summarization with actionable coaching material:
          * keyPhrases: 3-5 short, reusable phrases from the agent that worked.
          * guide: 4-6 step-by-step instructions to handle this type of case.
          * pitfalls: 2-4 mistakes to avoid when dealing with this persona.
    `,
    userPrompt: (
      persona: { name: string; traits: string; profile: string },
      scenario: {
        title: string;
        conflict: string;
        objective: string;
      },
      options: BCSimulatorOptions,
      agentPersona?: {
        name: string;
        traits: string;
        profile: string;
      },
    ) => `
      Persona: ${persona.name}
      Persona traits: ${persona.traits || "(none)"}
      Persona profile: ${persona.profile || "(none)"}

      Case: ${scenario.title}
      Conflict: ${scenario.conflict || "(none)"}
      Objective: ${scenario.objective || "(resolve the case)"}

      Requested turn count: ${options.turns ? String(options.turns) : "default (6-10)"}
      Requested ending: ${options.outcome}

      ${
        agentPersona
          ? `
      Agent persona: ${agentPersona.name}
      Agent traits: ${agentPersona.traits || "(none)"}
      Agent profile: ${agentPersona.profile || "(none)"}
      `
          : "(No agent persona selected — use a generic ideal agent.)"
      }
    `,
  },
};

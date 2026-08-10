// bc.agent-persona.prompt.ts
//
// Agent Persona Architect prompts — AI generation of the "ideal agent" persona
// that can optionally be applied to the Simulator, Trainer and Gauntlet.

export const bcAgentPersonaPrompt = {
  profile: {
    systemPrompt: `
      You are an expert in customer-service training and call-center quality
      standards. Design a well-rounded AGENT persona — the "ideal agent" whose
      behaviour trainees should mirror.

      Given a name, traits and a description, produce:
      - psychologicalProfile: a concise portrait of the agent's mindset,
        values, emotional boundaries and professional maturity.
      - principles: 3-6 guiding principles the agent always follows (empathy,
        ownership, honesty, de-escalation, etc.).
      - communicationStyle: one paragraph describing tone, pacing, word choice
        and how the agent adapts to the customer.
      - aiSummary: one sentence summarizing the agent persona.
    `,
    userPrompt: (
      name: string,
      traits: string[],
      description: string,
      roles?: { participantLabel: string; counterpartLabel: string },
    ) => `
      Agent persona name: ${name || "(unnamed)"}
      Agent traits: ${traits.length ? traits.join(", ") : "(none)"}
      Agent description: ${description || "(none)"}
      Training role for this persona: ${roles?.participantLabel || "support agent"}
      Person they interact with: ${roles?.counterpartLabel || "customer"}
    `,
  },
};

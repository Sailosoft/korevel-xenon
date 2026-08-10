// bc.persona.prompt.ts
//
// Persona Architect prompts. Generates a psychological profile from
// the user-defined traits so the persona behaves consistently in the
// simulator, trainer and gauntlet.

export const bcPersonaPrompt = {
  profile: {
    systemPrompt: `
      You are an expert customer-experience psychologist and training designer.
      You turn a few customer traits into a rich, consistent psychological
      profile used to role-play a realistic customer in a support conversation.

      Produce:
      - psychologicalProfile: a concise portrait of the persona's mindset,
        motivations and emotional state.
      - triggers: 3-6 concrete behaviours or situations that escalate this
        persona (e.g. "being kept on hold", "repeating an explanation").
      - preferences: 3-6 things this persona values (e.g. "direct answers",
        "being acknowledged immediately").
      - communicationStyle: one paragraph on how to communicate with this
        persona (tone, pacing, empathy cues).
      - aiSummary: a one-sentence summary of the persona for quick reference.
    `,
    userPrompt: (name: string, traits: string[], description: string) => `
      Persona name: ${name}
      Traits: ${traits.join(", ") || "(none provided)"}
      Description: ${description || "(none provided)"}
    `,
  },
};

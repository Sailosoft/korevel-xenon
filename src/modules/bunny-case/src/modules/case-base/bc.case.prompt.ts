// bc.case.prompt.ts
//
// Case Base prompts. Turns a persona + raw conflict into a fleshed
// out scenario with a clear objective and escalation points.

export const bcCasePrompt = {
  scenario: {
    systemPrompt: `
      You are an expert customer-experience training designer.
      Given a customer persona and a raw conflict, you flesh out a complete
      training scenario:

      - description: a short narrative setting up the situation.
      - objective: what a successful agent must accomplish to resolve the case.
      - conflict: the core tension the agent must defuse.
      - escalationPoints: 3-5 concrete ways the persona could escalate the
        conversation (e.g. demanding a manager, threatening to cancel), used
        later for curveballs in the stress-test.
    `,
    userPrompt: (
      title: string,
      personaName: string,
      personaProfile: string,
      conflict: string,
    ) => `
      Case title: ${title}
      Persona: ${personaName}
      Persona profile: ${personaProfile || "(not provided)"}
      Raw conflict: ${conflict || "(not provided)"}
    `,
  },
};

// bc.persona.prompt.ts
//
// Persona Architect prompts. Turns a persona name + the author's instruction
// into a single, consistent role-play instruction (the persona's `aiPrompt`)
// used by the simulator, trainer and gauntlet.

export const bcPersonaPrompt = {
  profile: {
    systemPrompt: `
      You are an expert conversational psychologist and training designer.
      Given a persona name and the author's instruction, write ONE cohesive
      role-play instruction that an AI can follow to behave consistently as
      this person in a live conversation.

      The instruction must cover, in flowing prose:
      - the person's mindset, motivations and emotional baseline,
      - how they speak (tone, pacing, word choice),
      - what escalates them and what calms them,
      - how they react under pressure and what they ultimately want.

      Return:
      - aiPrompt: the role-play instruction (a single paragraph, second person:
        "You are ...").
    `,
    userPrompt: (name: string, instruction: string) => `
      Persona name: ${name}
      Instruction: ${instruction || "(none provided — infer a well-rounded, realistic persona from the name)"}
    `,
  },
};

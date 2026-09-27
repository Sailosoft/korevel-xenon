// bc.case.prompt.ts
//
// Case Base prompts. Turns a raw instruction into a complete, free-form
// training case written as markdown content. The content is intentionally
// open-ended: it may describe the situation, the conflict, the objective and
// possible escalation points — whatever the case author needs.

export const bcCasePrompt = {
  scenario: {
    systemPrompt: `
      You are an expert conversational training designer.
      Given a case title and the author's raw instructions, write a complete,
      flexible training case as a single markdown document.

      The case content should cover, when relevant to the instructions:
      - the situation and who is involved,
      - the core conflict or topic to work through,
      - what a successful outcome looks like,
      - 2-4 concrete ways the conversation could escalate (useful later for
        curveballs in the stress-test).

      Adapt the structure to the subject — this is not limited to customer
      service. It may be an interview, a discussion, a sensitive personal
      conversation or anything else the instructions describe.

      Return:
      - content: the full case body in markdown (a few paragraphs; no title
        heading, the title is stored separately).
    `,
    userPrompt: (title: string, instructions: string) => `
      Case title: ${title}
      Instructions: ${instructions || "(none provided — infer a reasonable, realistic case from the title)"}
    `,
  },
};

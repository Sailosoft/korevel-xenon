// bc.study.prompt.ts
//
// Study module prompts — generates a comprehensive handbook / guide book
// (1000-2000 words) from a case so the trainee understands the situation,
// how to handle it, what to practice, and a quick summary for memorizing.
//
// Feature #12: the "generate type" selects the flavour of handbook produced:
// default, manual, case study, generative instruction, tips & guides,
// to-do list, beginner instruction or advanced instruction.

import type { BCStudyGenerateType } from "./bc.study.entity";

export interface BCStudyTypePrompt {
  systemPrompt: string;
  userPrompt: (
    persona: {
      name: string;
      traits: string;
      profile: string;
      triggers: string;
      preferences: string;
    },
    scenario: {
      title: string;
      description: string;
      conflict: string;
      objective: string;
    },
  ) => string;
}

const baseUserPrompt: BCStudyTypePrompt["userPrompt"] = (
  persona,
  scenario,
) => `
  Persona: ${persona.name}
  Persona traits: ${persona.traits || "(none)"}
  Persona profile: ${persona.profile || "(none)"}
  Persona triggers: ${persona.triggers || "(none)"}
  Persona preferences: ${persona.preferences || "(none)"}

  Case: ${scenario.title}
  Description: ${scenario.description || "(none)"}
  Conflict: ${scenario.conflict || "(none)"}
  Objective: ${scenario.objective || "(resolve the case)"}
`;

const outputContract = `
  Return:
  - title: a short, engaging handbook title.
  - content: the full handbook body in markdown (1000-2000 words).
  - outline: an array of quick memorization points, each with a section
    title and a one-to-two sentence summary.
`;

const author = `
  You are a senior customer-service training author. Given a customer
  persona and a case, write a COMPLETE HANDBOOK of 1000 to 2000 words
  that teaches a trainee how to deal with this situation well.

  Aim for a natural, coach-like tone.
`;

/** Human-readable options for the "generate type" selector (feature #12). */
export const bcStudyGenerateTypeList: Array<{
  id: BCStudyGenerateType;
  label: string;
  description: string;
}> = [
  {
    id: "default",
    label: "Default Handbook",
    description:
      "A complete handbook with case insight, understanding the customer, a handling guide, what to say, action items and a quick summary.",
  },
  {
    id: "manual",
    label: "Manual",
    description:
      "A concise reference manual / cheat-sheet the trainee can scan quickly before a call.",
  },
  {
    id: "case-study",
    label: "Case Study",
    description:
      "A deep-dive case study: background, analysis, decisions, what went well and lessons learned.",
  },
  {
    id: "generative-instruction",
    label: "Generative Instruction",
    description:
      "Step-by-step instructions the trainee can apply to generate good responses themselves.",
  },
  {
    id: "tips-guides",
    label: "Tips & Guides",
    description:
      "Quick-fire tips, do's and don'ts, and mini-guides for the conversation.",
  },
  {
    id: "to-do-list",
    label: "To-Do List",
    description:
      "An actionable, drill-able to-do / practice checklist to build the skill.",
  },
  {
    id: "beginner",
    label: "Beginner Instruction",
    description:
      "A fundamentals-first handbook for trainees new to handling this type of case.",
  },
  {
    id: "advanced",
    label: "Advanced Instruction",
    description:
      "A nuanced handbook covering advanced techniques, escalation and edge cases.",
  },
];

/** Prompt variants keyed by generate type (feature #12). */
export const bcStudyPrompt: {
  handbook: BCStudyTypePrompt;
  types: Record<BCStudyGenerateType, BCStudyTypePrompt>;
} = {
  handbook: {
    systemPrompt: `
      ${author}

      The handbook must include these sections (as markdown headings):
      1. Case Insight — what is really going on and why it matters.
      2. Understanding the Customer — the persona's mindset, triggers and
         preferences.
      3. Handling Guide — step-by-step what to do (and when).
      4. What to Say — concrete, reusable phrases (what to say / what to avoid).
      5. Action Items to Practice — drill-able exercises the trainee can run.
      6. Quick Summary — a short outline-style recap for fast memorizing.

      ${outputContract}
    `,
    userPrompt: baseUserPrompt,
  },
  types: {
    default: {
      systemPrompt: `
        ${author}

        The handbook must include these sections (as markdown headings):
        1. Case Insight — what is really going on and why it matters.
        2. Understanding the Customer — the persona's mindset, triggers and
           preferences.
        3. Handling Guide — step-by-step what to do (and when).
        4. What to Say — concrete, reusable phrases (what to say / what to avoid).
        5. Action Items to Practice — drill-able exercises the trainee can run.
        6. Quick Summary — a short outline-style recap for fast memorizing.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    manual: {
      systemPrompt: `
        ${author}

        Write a CONCISE REFERENCE MANUAL (cheat-sheet style) the trainee can
        scan quickly before a call. Use markdown headings and bullet lists.
        Include:
        1. Quick facts — who the customer is and the core conflict.
        2. Do / Don't — a fast checklist of behaviours.
        3. Key phrases — ready-to-use lines.
        4. Red flags — what signals trouble and how to react.
        5. First 30 seconds — how to open well.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    "case-study": {
      systemPrompt: `
        ${author}

        Write a DEEP-DIVE CASE STUDY. Use markdown headings:
        1. Background — context and why this case matters.
        2. The Customer — profile, triggers, preferences.
        3. The Situation — the conflict and objective.
        4. Analysis — what is really happening beneath the surface.
        5. Decisions — key choices an agent should make (and why).
        6. What Worked — successful behaviours and phrases.
        7. Lessons Learned — takeaways the trainee should remember.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    "generative-instruction": {
      systemPrompt: `
        ${author}

        Write STEP-BY-STEP GENERATIVE INSTRUCTIONS that teach the trainee how
        to produce good responses themselves. Use markdown headings:
        1. The Goal — what a good outcome looks like.
        2. A Repeatable Method — numbered steps to follow for any message.
        3. Response Building Blocks — empathy, clarity, de-escalation, next step.
        4. Practice Prompts — sample customer lines to practise against.
        5. Self-Check — a checklist to review a draft before sending.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    "tips-guides": {
      systemPrompt: `
        ${author}

        Write a QUICK TIPS & GUIDES document. Use markdown headings and short
        bullets:
        1. Top Tips — 8-12 quick, memorable tips.
        2. Do's and Don'ts — paired lists.
        3. Mini-Guides — 2-4 short step-by-step guides for common moments
           (opening, objection, escalation, closing).
        4. Tone Guide — how to phrase with the persona.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    "to-do-list": {
      systemPrompt: `
        ${author}

        Write an ACTIONABLE TO-DO LIST / PRACTICE CHECKLIST. Use markdown
        headings and checklists:
        1. Preparation — things to review before the call.
        2. During the Conversation — actions to tick off.
        3. Practice Drills — repeatable exercises.
        4. Self-Review — questions to reflect on after the call.

        Use "- [ ]" checkboxes in the content.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    beginner: {
      systemPrompt: `
        ${author}

        Write a BEGINNER-FRIENDLY HANDBOOK. Use simple language and markdown
        headings:
        1. What This Case Is About — plain-English overview.
        2. Meet the Customer — who they are and what they want.
        3. The Basics — fundamental steps to follow.
        4. What to Say — simple, safe phrases.
        5. First Practice — one easy exercise to build confidence.
        6. Quick Summary — the must-remember points.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
    advanced: {
      systemPrompt: `
        ${author}

        Write an ADVANCED HANDBOOK for experienced trainees. Use markdown
        headings:
        1. Deeper Insight — nuance beyond the obvious conflict.
        2. Advanced Customer Handling — subtle triggers and high-stakes moments.
        3. Escalation Playbook — when and how to escalate gracefully.
        4. Edge Cases — unusual scenarios and how to adapt.
        5. Elite Phrases — sophisticated, high-skill responses.
        6. Mastery Checklist — advanced skills to demonstrate.

        ${outputContract}
      `,
      userPrompt: baseUserPrompt,
    },
  },
};

// ---------------------------------------------------------------------------
// CatalogReleases.Dictionary.ts
// Data-only changelog for the catalog. Add a new entry every time you make
// changes to the app — keep this file for dictionary data only.
// ---------------------------------------------------------------------------
import { CatalogApp, type CatalogRelease } from "./CatalogReleases.Interface";

export const catalogReleases: CatalogRelease[] = [
  {
    version: "v4.6.3",
    title: "Version 4.6.3: BunnyCase Hot Seat & Refactor, LemonCoder Mermaid Editor, and BunnyBook Skills Patterns",
    content: [
      "BunnyCase: Added the Hot Seat training mode that reverses the Conversation Trainer — the AI role-plays the persona while the trainee challenges it, with Issue Handling, Job Interview, Discussion, and Mental Health prompt sets.",
      "BunnyCase: Refactored the persona, simulator, trainer, and gauntlet prompts into dedicated per-mode prompt sets and added a 30-trait persona multi-select.",
      "BunnyCase: Removed the legacy Agent Persona and Sentiment Analytics modules and renamed the shelf navigation to Personas and Cases.",
      "LemonCoder: Added a Mermaid editor with a View/Edit toggle, diagram-type template picker, and Text, Split, Visual, and Layout modes, including WYSIWYG layout persistence for flowcharts.",
      "LemonCoder: Added Mermaid renderers covering Flowchart, Sequence, Class, ER, Gantt, Journey, and other diagram types.",
      "BunnyBook: Added new skills-market patterns including Guide & Tip Focus, Four-Phase Structure, Methodological Analysis, Decision-Maker Overview, Expert Perspective, Implementation-First, and STAR Method.",
    ],
    apps: [
      CatalogApp.BunnyCase,
      CatalogApp.LemonCoder,
      CatalogApp.BunnyBook
    ],
    dates: [
      "2026-09-19",
      "2026-09-21",
      "2026-09-22",
      "2026-09-24",
      "2026-09-27"
    ]
  },
  {
    version: "v4.6.2",
    title: "Version 4.6.2: BunnyStudio Transformer Embeddings & Knowledge Base Improvements, Prompt Input Hashing, and System Enhancements",
    content: [
      "BunnyStudio: Added a local Transformers.js embedding engine with an embedding model picker, set as the default for new knowledge groups.",
      "BunnyStudio: Improved the knowledge base Resources tab with text and source code file support, language detection, and code-aware chunking.",
      "BunnyStudio: Encrypt Feature",
      "System: Added a SAME_ORIGIN env toggle to bypass the Bunny Studio same-origin API guard when calling from another origin.",
      "System: Improved the PM2 workflow with a start:pm2 script, updated port, and boot service setup documentation.",
      "Catalog: Streamlined the header navigation by removing the OpenCode Go link and hiding the Documentation and Support links.",
    ],
    apps: [
      CatalogApp.BunnyStudio,
      CatalogApp.Catalog
    ],
    dates: [
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18"
    ]
  },
  {
    version: "v4.6.1",
    title: "Version 4.6.1 Release: Flow: Improved AI Steps, Studio: Better Instruction Response Rendering & Agent Pool Filter",
    content: [
      "BunnyFlow: Improve AI Assistent Steps Generation",
      "BunnyStudio: Improve Instruction Response Rendering",
      "BunnyStudio: Agent Filter By Agent Pool"
    ],
    apps: [
      CatalogApp.BunnyFlow,
      CatalogApp.BunnyStudio
    ],
    dates: [
      "2026-09-15"
    ]
  },
  {
    version: "v4.6.0",
    title: "Version 4.6.0: OpenCode Go Calculator, Helix Model Organization, Bunny Thinker AI Studio Steps and Bunny Book Reading",
    content: [
      "Helix: Reorganized the model layer into dedicated provider modules and refreshed the Open Router model list.",
      "BunnyThinker: Added anonymous Studio mode with an ideas picker, render crafting, and HeroUI compatibility fixes.",
      "BunnyThinker: Improved AI assisted steps generation with configurable AI Generate and AI Refine steps.",
      "BunnyBook: Improved the skills picker, book chapter reading content, and Facebook HTML export template.",
      "Catalog: Add OpenCode Go Calculator for pricing OpenCode Go model credits and regenerating its pricing dictionary.",
    ],
    apps: [
      CatalogApp.BunnyThinker,
      CatalogApp.BunnyBook,
      CatalogApp.Catalog
    ],
    dates: [
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11"
    ]
  },
  {
    version: "v4.5.0",
    title: "Version 4.5.0: Improve AI Assisted on Studio and Book, Lemon Coder CSV Editor, Improve Studio Knowledge Base and Added Bunny Helix",
    content: [
      "LemonCoder: Improve CSV Rendering and Added CSV Editor",
      "BunnyStudio: Improve knowledge base referencing(Reference, General, Mixed)",
      "BunnyStudio: Added AI Assisted Instruction Generation",
      "Helix: Improve OpenAI temperature support compatibility",
      "BunnyHelix: Added Bunny and Helix AI Assisted Generator adapter",
      "BunnyBook: Added Skill Market and Improve Book and Author Generator",
    ],
    apps: [
      CatalogApp.LemonCoder,
      CatalogApp.BunnyStudio,
      CatalogApp.BunnyBook
    ],
    dates: [
      "2026-09-03",
      "2026-09-07"
    ]
  },
  {
    version: "v4.4.2",
    title: "Version 4.4.2: Bunny Flow, Case, Book and Lemon Coder Update",
    content: [
      "Bunny Case: Added Discussion and Mental Health Mode",
      "Bunny Flow: Can adjsut steps and improve export to html",
      "Lemon Coder: Improve Bugs on header and fix logout button",
      "Bunny Book: Add Text To Speech and Add HTML Export"
    ],
    apps: [
      CatalogApp.BunnyCase,
      CatalogApp.BunnyFlow,
      CatalogApp.LemonCoder,
      CatalogApp.BunnyBook
    ],
    dates: [
      "2026-08-28",
      "2026-09-01",
      "2026-09-02"
    ]
  },
  {
    version: "v4.4.1",
    title: "Bunny Flow: Enhanced Rendering & HTML Export",
    content: [
      "Refined the render view for YAML and JSON documents, producing clearer and more readable output.",
      "Redesigned the export flow and polished the visual design when exporting workflows to HTML.",
      "Added new export options, giving more control over how workflows are exported."
    ],
    apps: [
      CatalogApp.BunnyFlow
    ],
    dates: ["2026-08-28"]
  },
  {
    version: "v4.4.0",
    title: "Bunny Studio: Improve Mobile Interface On Chat",
    content: [
      "Improve mobile friendly on chat and conversation of Bunny Studio"
    ],
    apps: [
      CatalogApp.BunnyStudio
    ],
    dates: [
      "2026-08-25"
    ]
  },
  {
    version: "v4.3.0",
    title: "Application Suite Launch",
    content: [
      "Introduced the Korevel Xenon application catalog.",
      "Added the Releases page to document every change shipped to the suite.",
      "Wired the catalog cards to launch their respective modules.",
    ],
    apps: [
      CatalogApp.BunnyStudio,
      CatalogApp.BunnyCase,
      CatalogApp.BunnyBook,
      CatalogApp.BunnyFlow,
      CatalogApp.BunnyThinker,
      CatalogApp.LemonCoder,
    ],
    dates: ["2026-08-25"],
  },
  {
    version: "v4.2.0",
    title: "Bunny Flow Workflow Refinements",
    content: [
      "Polished the YAML workflow builder and run variables modal.",
      "Improved variable group handling across pipeline stages.",
    ],
    apps: [CatalogApp.BunnyFlow],
    dates: ["2026-08-18"],
  },
  {
    version: "v4.1.0",
    title: "Bunny Thinker Memory & Thought Patterns",
    content: [
      "Added memory export templates and thought pattern validation.",
      "Enhanced the chain-of-thought stepper for structured reasoning.",
    ],
    apps: [CatalogApp.BunnyThinker],
    dates: ["2026-08-10"],
  },
];

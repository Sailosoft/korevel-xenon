// ---------------------------------------------------------------------------
// CatalogReleases.Dictionary.ts
// Data-only changelog for the catalog. Add a new entry every time you make
// changes to the app — keep this file for dictionary data only.
// ---------------------------------------------------------------------------
import { CatalogApp, type CatalogRelease } from "./CatalogReleases.Interface";

export const catalogReleases: CatalogRelease[] = [
  {
    version: "v5.2.0",
    title: "Version 5.2.0: BunnyBook Outlines & Topics, BunnyDeveloper Grouped Pages, Shell Redesign, and AI Generation Modes",
    content: [
      "BunnyBook: Added the Outlines module with 11 generation types, 7 generation modes, AI structure generation, batch item writing with a 3-wide parallel pool, and a guided Refine wizard (critique, merge, and iterative refine).",
      "BunnyBook: Added the Topics module — reusable, AI-generatable topics that can seed any number of outlines.",
      "BunnyBook: Added inline outline detail editing (title, type/mode, topic, author, item limits, instruction, summary) and HTML export reusing the Books export engine.",
      "BunnyBook: Deleting a book or outline now cascades and removes its chapters/items.",
      "BunnyBook: Added Outlines to the dashboard stats and the Outlines/Topics navigation; the Books list now excludes outlines.",
      "BunnyDeveloper: Split Schema, App Builder, API Design, Diagram, and Architecture into grouped list → detail pages, adding Diagram Groups (three levels) and Architecture Groups.",
      "BunnyDeveloper: Redesigned the shell with a dark dotted sidebar and a blue gradient header.",
      "BunnyDeveloper: Unified AI generation across all builders with create, append, update, and replace modes plus a target selector.",
      "Helix: Added doChatWithHistory for multi-turn chat completions and refreshed the DeepInfra model list.",
      "System: Pinned the Docker base image and expanded the Docker workflow documentation.",
    ],
    apps: [
      CatalogApp.BunnyBook,
      CatalogApp.BunnyDeveloper
    ],
    dates: [
      "2026-10-06",
      "2026-10-07",
      "2026-10-08"
    ]
  },
  {
    version: "v5.1.0",
    title: "Version 5.1.0",
    content: [
      "BunnyStudio: Improve Image Library and Download Mechanism",
      "BunnyBook: Added and Remove New Export HTML Template",
      "BunnyBook: Improve rendering and export markdown content",
      "BunnyBook: Fix manual numbering of chapter",
      "Add Docker Support"
    ],
    apps: [
      CatalogApp.BunnyStudio,
      CatalogApp.BunnyBook
    ],
    dates: [
      "2026-10-06"
    ]
  },
  {
    version: "v5.0.0",
    title: "Version 5.0.0: Bunny Developer Launch — Local-First Workspace for Schemas, Apps, APIs, Diagrams, Files, and Projects",
    content: [
      "Bunny Developer: Launched the new Bunny Developer module — a local-first (Dexie) developer decision workspace with project management, module shell, shared BD component kit, AI settings, and Helix-backed server actions.",
      "Bunny Developer: Added the Schema Builder with model/property/relation editing, schema groups, Prisma export, and a read-only Mermaid ERD viewer with zoom/pan and SVG/PNG/Mermaid export.",
      "Bunny Developer: Added the App Builder with Filament-style resources, forms, tables, relation manager (one-to-one, one-to-many, many-to-many attach/detach/reorder), and a standalone render route that runs generated CRUD apps.",
      "Bunny Developer: Added API Design with document and Postman-like mock layouts, API groups, faker-powered response mocking, AI generation, and HTML export.",
      "Bunny Developer: Added the Diagram Builder with type-specific node/edge editors, locked diagram types, raw Mermaid source override, live preview, AI generation, and .mmd/.md/.svg export.",
      "Bunny Developer: Added virtual File Management with a Google Drive-style manager, code and WYSIWYG editors, media viewer modal, bulk selection (move/copy/download/delete), and password-protected files with session unlock.",
      "Bunny Developer: Added JIRA-style Project Management with kanban boards, threaded task comments, board settings (sections and custom fields), and project-wide board settings.",
      "Bunny Developer: Added the Outline and Architecture builders with AI generation and Markdown/HTML export, plus the Agent Manager for handing work off to agents.",
      "Bunny Developer: Added the Bunny Developer agent (ai/agents) and a YAML task backlog (ai/tasks) for driving module work.",
      "Catalog: Added the Bunny Developer card to the application catalog.",
    ],
    apps: [
      CatalogApp.BunnyDeveloper,
      CatalogApp.Catalog
    ],
    dates: [
      "2026-09-28",
      "2026-09-29",
      "2026-10-01",
      "2026-10-02"
    ]
  },
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

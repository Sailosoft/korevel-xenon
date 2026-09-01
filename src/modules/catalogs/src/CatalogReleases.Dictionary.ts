// ---------------------------------------------------------------------------
// CatalogReleases.Dictionary.ts
// Data-only changelog for the catalog. Add a new entry every time you make
// changes to the app — keep this file for dictionary data only.
// ---------------------------------------------------------------------------
import { CatalogApp, type CatalogRelease } from "./CatalogReleases.Interface";

export const catalogReleases: CatalogRelease[] = [
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

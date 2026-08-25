// ---------------------------------------------------------------------------
// CatalogReleases.Dictionary.ts
// Data-only changelog for the catalog. Add a new entry every time you make
// changes to the app — keep this file for dictionary data only.
// ---------------------------------------------------------------------------
import { CatalogApp, type CatalogRelease } from "./CatalogReleases.Interface";

export const catalogReleases: CatalogRelease[] = [
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

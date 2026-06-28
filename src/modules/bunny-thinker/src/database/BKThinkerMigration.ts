// BKThinkerMigration.ts
//
// Database schema migrations for BKThinkerDatabase.
// Each `model.schema()` call maps to a sequential Dexie version for
// proper IndexedDB schema migration without data loss.

import type { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";

export function configureBKThinkerMigrations(
  model: IPhazeModelBuilder,
): void {
  // ── Version 1 — initial schema ──────────────────────────────────
  model.schema((config) => {
    // Thinkers — persona definitions for thought
    config.create("thinkers", (table) => {
      table.uuid();
      table.index("role");
      table.index("name");
    });

    // Thought Patterns — variable templates for thoughts
    config.create("thoughtPatterns", (table) => {
      table.uuid();
      table.index("name");
    });

    // Thought Associations — variable swapping to thought patterns
    config.create("thoughtAssociations", (table) => {
      table.uuid();
      table.index("patternId");
      table.index("name");
    });

    // Ideas — reusable prompts
    config.create("ideas", (table) => {
      table.uuid();
      table.index("name");
      table.index("tags");
    });

    // Craft Configs — output formatting configurations
    config.create("craftConfigs", (table) => {
      table.uuid();
      table.index("format");
    });

    // Thoughts — main prompt / idea as main thought
    config.create("thoughts", (table) => {
      table.uuid();
      table.index("name");
      table.index("patternId");
    });

    // Train of Thoughts — preplanned conversation steps
    config.create("trainOfThoughts", (table) => {
      table.uuid();
      table.index("thoughtId");
      table.index("order");
    });

    // Memory — output persistence
    config.create("memories", (table) => {
      table.uuid();
      table.index("thinkId");
      table.index("name");
    });

    // Memory Neurons — individual output pieces
    config.create("memoryNeurons", (table) => {
      table.uuid();
      table.index("memoryId");
      table.index("trainOfThoughtId");
    });

    // Think — workspace connecting all thoughts
    config.create("thinks", (table) => {
      table.uuid();
      table.index("slug");
      table.index("thoughtId");
      table.index("status");
    });

    // Thought‑Idea Mappings
    config.create("thoughtIdeas", (table) => {
      table.uuid();
      table.index("thoughtId");
      table.index("ideaId");
    });

    // Train‑of‑Thought‑Idea Mappings
    config.create("trainOfThoughtIdeas", (table) => {
      table.uuid();
      table.index("trainOfThoughtId");
      table.index("ideaId");
    });

    // Processes — end-to-end workflow binding association → thought → memory
    config.create("processes", (table) => {
      table.uuid();
      table.index("associationId");
      table.index("thoughtId");
      table.index("thinkId");
      table.index("status");
      table.index("name");
    });

    // AI Settings — singleton record for the user's preferred AI provider + model
    config.create("aiSettings", (table) => {
      table.uuid();
      table.index("provider");
    });
  });
}

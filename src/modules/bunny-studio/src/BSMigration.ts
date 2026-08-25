// BSMigration.ts
//
// Database schema migrations for BSDatabase.
// Each `model.schema()` call maps to a sequential Dexie version for
// proper IndexedDB schema migration without data loss.

import type { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { splitThoughtBlocks } from "./modules/chat/BSChat.Thought";

export function configureBSMigrations(model: IPhazeModelBuilder): void {
  // ── Version 1 — initial schema ────────────────────────────────────
  model.schema((config) => {
    // Chats — a conversation thread container
    config.create("chats", (table) => {
      table.uuid();
      table.index("title");
      table.index("createdDate");
      table.index("agentId");
      table.index("agentPoolId");
    });

    // Conversations — individual messages within a chat
    config.create("conversations", (table) => {
      table.uuid();
      table.index("chatId");
      table.index("type");
      table.index("agentId");
      table.index("createdDate");
    });

    // Agents — reusable AI personas
    config.create("agents", (table) => {
      table.uuid();
      table.index("name");
      table.index("agentPoolId");
    });

    // Agent Pools — groups of agents
    config.create("agentPools", (table) => {
      table.uuid();
      table.index("name");
    });

    // AI Settings — singleton record for the user's preferred AI provider + model
    config.create("aiSettings", (table) => {
      table.uuid();
      table.index("provider");
    });

    // Instruction Groups — groups of saved custom instructions (feature)
    config.create("instructionGroups", (table) => {
      table.uuid();
      table.index("name");
    });

    // Instructions — saved custom instructions prefilled into chat (feature)
    config.create("instructions", (table) => {
      table.uuid();
      table.index("title");
      table.index("instructionGroupId");
    });
  });

  // ── Version 2 — Chat Favorites + Categories ─────────────────────────
  model.schema((config) => {
    // Chat Categories — groups for saved chat favorites (feature)
    config.create("chatCategories", (table) => {
      table.uuid();
      table.index("name");
    });

    // Chat Favorites — a saved chat, optionally assigned to a category
    config.create("chatFavorites", (table) => {
      table.uuid();
      table.index("chatId");
      table.index("categoryId");
      table.index("createdDate");
    });
  });

  // ── Version 3 — Image Library (feature: Image Generator) ─────────────
  model.schema((config) => {
    // Generated AI images persisted as base64 data URLs
    config.create("imageLibrary", (table) => {
      table.uuid();
      table.index("createdDate");
      table.index("provider");
    });
  });

  // ── Version 4 — Video Library (feature: Video Generator) ─────────────
  model.schema((config) => {
    // Generated AI videos persisted as base64 data URLs
    config.create("videoLibrary", (table) => {
      table.uuid();
      table.index("createdDate");
      table.index("provider");
    });
  });

  // ── Version 5 — Speech Library (feature: Speech Generator) ────────────
  model.schema((config) => {
    // Generated AI speech audios persisted as base64 data URLs
    config.create("speechLibrary", (table) => {
      table.uuid();
      table.index("createdDate");
      table.index("provider");
    });
  });

  // ── Version 6 — Transcription Library (feature: Transcription) ────────
  model.schema((config) => {
    // Transcribed audio → text results persisted locally (with optional source
    // audio data URL for re-listening)
    config.create("transcriptionLibrary", (table) => {
      table.uuid();
      table.index("createdDate");
      table.index("provider");
    });
  });

  // ── Version 7 — Knowledge Base (feature: Knowledge Groups + Knowledges) ─
  model.schema((config) => {
    // Knowledge Groups — selectable in chat as the RAG "tool"; knowledges
    // are added to a group (optionally tagged with a category).
    config.create("knowledgeGroups", (table) => {
      table.uuid();
      table.index("name");
      table.index("category");
    });

    // Knowledges — individual sources (scanned website OR uploaded resource)
    // belonging to a knowledge group.
    config.create("knowledges", (table) => {
      table.uuid();
      table.index("knowledgeGroupId");
      table.index("createdDate");
    });

    // Orama vector index snapshots — one per knowledge group (keyed by the
    // group id), serialized so the in-memory index survives browser reloads.
    config.create("knowledgeIndexes", (table) => {
      table.uuid();
      table.index("updatedDate");
    });
  });

  // ── Version 8 — AI thought-process column (feature: thought response) ───
  // Assistant responses may carry a private <thought>…</thought> preamble.
  // It is stored in its own `thought` column so the main `content` column and
  // multi-turn history contain ONLY the actual output. (Dexie stores the field
  // on every record; indexing it makes it a first-class column in the schema.)
  model.schema((config) => {
    config.update(
      "conversations",
      (table) => {
        table.index("thought");
      },
      // Backfill legacy rows: any assistant message whose `content` still
      // contains <thought>…</thought> tags (persisted before this feature was
      // added) is split in place — the thought moves to its own column and
      // `content` keeps only the real answer. No regeneration needed.
      async (trans) => {
        const table = trans.table("conversations");
        await table
          .toCollection()
          .modify(
            (row: { type?: string; content?: string; thought?: string }) => {
              try {
                if (row.type === "assistant" && typeof row.content === "string") {
                  const split = splitThoughtBlocks(row.content);
                  if (split.thought && !row.thought) {
                    row.thought = split.thought;
                    row.content = split.content;
                  }
                }
              } catch {
                /* keep the original row if a single parse ever fails */
              }
            },
          );
      },
    );
  });
}

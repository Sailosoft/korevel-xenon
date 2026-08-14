// BSMigration.ts
//
// Database schema migrations for BSDatabase.
// Each `model.schema()` call maps to a sequential Dexie version for
// proper IndexedDB schema migration without data loss.

import type { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";

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
}

// BSDatabase.ts
//
// BSDatabase — IndexedDB persistence layer for Bunny AI Studio.
//
// Uses the PhazeDB abstraction over Dexie to manage local IndexedDB stores
// for all studio entities: Chats, Conversations, Agents, Agent Pools, and
// the singleton AI Settings table.
//
// Each table is backed by a typed repository (PhazeRepository) exposing
// CRUD + query operations with UUIDv7 support.

import PhazeDB from "@/src/modules/phaze/src/PhazeDB";
import type { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { configureBSMigrations } from "./BSMigration";
import type { BSChat } from "./modules/chat/BSChat.Types";
import type { BSConversation } from "./modules/chat/BSChat.Types";
import type { BSAgent } from "./modules/agents/BSAgent.Types";
import type { BSAgentPool } from "./modules/agent-pools/BSAgentPool.Types";
import type { BSInstructionGroup } from "./modules/instruction-groups/BSInstructionGroup.Types";
import type { BSInstruction } from "./modules/instructions/BSInstruction.Types";
import type { BSChatCategory } from "./modules/chat-category/BSChatCategory.Types";
import type { BSChatFavorite } from "./modules/chat-favorite/BSChatFavorite.Types";
import type { BSAISettings } from "./modules/ai-settings/BSAISettings.Types";
import type { BSImageAsset } from "./modules/image-generator/BSImageGenerator.Types";
import { BSImageRepository } from "./modules/image-generator/BSImageGenerator.Repository";
import type { BSVideoAsset } from "./modules/video-generator/BSVideoGenerator.Types";
import { BSVideoRepository } from "./modules/video-generator/BSVideoGenerator.Repository";
import { BSChatRepository } from "./modules/chat/BSChat.Repository";
import { BSAgentRepository } from "./modules/agents/BSAgent.Repository";
import { BSAgentPoolRepository } from "./modules/agent-pools/BSAgentPool.Repository";
import { BSInstructionGroupRepository } from "./modules/instruction-groups/BSInstructionGroup.Repository";
import { BSInstructionRepository } from "./modules/instructions/BSInstruction.Repository";
import { BSChatCategoryRepository } from "./modules/chat-category/BSChatCategory.Repository";
import { BSChatFavoriteRepository } from "./modules/chat-favorite/BSChatFavorite.Repository";

export class BSDatabase extends PhazeDB {
  // ── Chats ──────────────────────────────────────────────────────────
  public chats = this.table<BSChat, string>("chats");
  public chatsRepo = new BSChatRepository(this.chats);

  // ── Conversations ──────────────────────────────────────────────────
  public conversations = this.table<BSConversation, string>("conversations");
  public conversationsRepo = new PhazeRepository<BSConversation>(
    this.conversations,
  );

  // ── Agents ─────────────────────────────────────────────────────────
  public agents = this.table<BSAgent, string>("agents");
  public agentsRepo = new BSAgentRepository(this.agents);

  // ── Agent Pools ────────────────────────────────────────────────────
  public agentPools = this.table<BSAgentPool, string>("agentPools");
  public agentPoolsRepo = new BSAgentPoolRepository(this.agentPools);

  // ── AI Settings (singleton, key = "global") ────────────────────────
  public aiSettings = this.table<BSAISettings, string>("aiSettings");
  public aiSettingsRepo = new PhazeRepository<BSAISettings>(this.aiSettings);

  // ── Instruction Groups (feature: Custom Instructions) ──────────────
  public instructionGroups = this.table<BSInstructionGroup, string>(
    "instructionGroups",
  );
  public instructionGroupsRepo = new BSInstructionGroupRepository(
    this.instructionGroups,
  );

  // ── Instructions (feature: Custom Instructions) ────────────────────
  public instructions = this.table<BSInstruction, string>("instructions");
  public instructionsRepo = new BSInstructionRepository(this.instructions);

  // ── Chat Categories (feature: Chat Favorites) ──────────────────────
  public chatCategories = this.table<BSChatCategory, string>("chatCategories");
  public chatCategoriesRepo = new BSChatCategoryRepository(this.chatCategories);

  // ── Chat Favorites (feature: Chat Favorites) ───────────────────────
  public chatFavorites = this.table<BSChatFavorite, string>("chatFavorites");
  public chatFavoritesRepo = new BSChatFavoriteRepository(this.chatFavorites);

  // ── Image Library (feature: Image Generator) ───────────────────────
  public imageLibrary = this.table<BSImageAsset, string>("imageLibrary");
  public imageLibraryRepo = new BSImageRepository(this.imageLibrary);

  // ── Video Library (feature: Video Generator) ───────────────────────
  public videoLibrary = this.table<BSVideoAsset, string>("videoLibrary");
  public videoLibraryRepo = new BSVideoRepository(this.videoLibrary);

  constructor() {
    super();

    // Delete Chat cascade — when a chat is deleted, also remove its history and
    // any chat favorite referencing it (feature: Delete Chat → delete history).
    // Dexie supports table hooks; the "deleting" hook fires inside the same
    // transaction as the chat delete. This guarantees no orphaned favorite can
    // survive a chat delete, even if a delete path bypasses the UI guard.
    this.chats.hook("deleting", (pk) => {
      void this.conversations.where("chatId").equals(pk).delete();
      void this.chatFavorites.where("chatId").equals(pk).delete();
    });
  }

  protected dbName(): string {
    return "BunnyStudioDB";
  }

  protected onModelCreating(model: IPhazeModelBuilder): void {
    configureBSMigrations(model);
  }
}

export const bsDB = new BSDatabase();

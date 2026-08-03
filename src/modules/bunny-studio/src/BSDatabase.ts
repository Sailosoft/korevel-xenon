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
import type { HelixAISettings } from "@/src/modules/helix";
import { BSChatRepository } from "./modules/chat/BSChat.Repository";
import { BSAgentRepository } from "./modules/agents/BSAgent.Repository";
import { BSAgentPoolRepository } from "./modules/agent-pools/BSAgentPool.Repository";
import { BSInstructionGroupRepository } from "./modules/instruction-groups/BSInstructionGroup.Repository";
import { BSInstructionRepository } from "./modules/instructions/BSInstruction.Repository";

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
  public aiSettings = this.table<HelixAISettings, string>("aiSettings");
  public aiSettingsRepo = new PhazeRepository<HelixAISettings>(this.aiSettings);

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

  constructor() {
    super();

    // Delete Chat cascade — when a chat is deleted, also remove its history.
    // Dexie supports table hooks; the "deleting" hook fires inside the same
    // transaction as the chat delete (feature: Delete Chat → delete history).
    this.chats.hook("deleting", (pk) => {
      void this.conversations.where("chatId").equals(pk).delete();
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

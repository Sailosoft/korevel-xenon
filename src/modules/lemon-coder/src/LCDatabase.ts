// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — DexieDB Database
// ───────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type {
  LCProject,
  LCChatSession,
  LCChatMessage,
  LCContextStashItem,
} from "./LCInterface";
import type { HelixAISettings } from "@/src/modules/helix";

export class LCDatabase extends Dexie {
  projects!: Table<LCProject, string>;
  chatSessions!: Table<LCChatSession, string>;
  chatMessages!: Table<LCChatMessage, string>;
  contextStash!: Table<LCContextStashItem, string>;
  aiSettings!: Table<HelixAISettings, string>;

  constructor() {
    super("lemon-coder");

    this.version(2).stores({
      projects: "id, name, lastOpened",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
      aiSettings: "key, provider, model",
    });

    this.version(1).stores({
      projects: "id, name, lastOpened",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
    });
  }

  // ── Project helpers ──────────────────────────────────────────────────────

  async createProject(name: string, folderPath: string): Promise<LCProject> {
    const project: LCProject = {
      id: uuidv4(),
      name,
      folderPath,
      lastOpened: new Date(),
      createdAt: new Date(),
    };
    await this.projects.add(project);
    return project;
  }

  async getRecentProjects(): Promise<LCProject[]> {
    return this.projects
      .orderBy("lastOpened")
      .reverse()
      .limit(10)
      .toArray();
  }

  async getProject(id: string): Promise<LCProject | undefined> {
    return this.projects.get(id);
  }

  async updateLastOpened(id: string): Promise<void> {
    await this.projects.update(id, { lastOpened: new Date() });
  }

  // ── Chat Session helpers ─────────────────────────────────────────────────

  async createChatSession(
    projectId: string,
    title: string,
  ): Promise<LCChatSession> {
    const session: LCChatSession = {
      id: uuidv4(),
      projectId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.chatSessions.add(session);
    return session;
  }

  async addChatMessage(
    sessionId: string,
    message: Omit<LCChatMessage, "id" | "timestamp">,
  ): Promise<LCChatMessage> {
    const msg: LCChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };
    await this.chatMessages.add(msg);

    // Update session's updatedAt and messages reference
    const session = await this.chatSessions.get(sessionId);
    if (session) {
      session.messages.push(msg);
      session.updatedAt = new Date();
      await this.chatSessions.update(sessionId, {
        messages: session.messages,
        updatedAt: session.updatedAt,
      });
    }

    return msg;
  }

  async getChatSessions(projectId: string): Promise<LCChatSession[]> {
    return this.chatSessions
      .where("projectId")
      .equals(projectId)
      .reverse()
      .sortBy("updatedAt");
  }

  // ── Context Stash helpers ─────────────────────────────────────────────────

  async addToStash(item: Omit<LCContextStashItem, "id" | "addedAt">): Promise<LCContextStashItem> {
    const stashItem: LCContextStashItem = {
      ...item,
      id: uuidv4(),
      addedAt: new Date(),
    };
    await this.contextStash.add(stashItem);
    return stashItem;
  }

  async removeFromStash(id: string): Promise<void> {
    await this.contextStash.delete(id);
  }

  async getStashItems(): Promise<LCContextStashItem[]> {
    return this.contextStash.orderBy("addedAt").toArray();
  }

  async clearStash(): Promise<void> {
    await this.contextStash.clear();
  }
}

export const lcDB = new LCDatabase();

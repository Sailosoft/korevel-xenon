// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — DexieDB Database
// ───────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type {
  LCProject,
  LCProjectHandle,
  LCChatSession,
  LCChatMessage,
  LCContextStashItem,
} from "./LCInterface";
import type { HelixAISettings } from "@/src/modules/helix";

export class LCDatabase extends Dexie {
  projects!: Table<LCProject, string>;
  projectHandles!: Table<LCProjectHandle, string>;
  chatSessions!: Table<LCChatSession, string>;
  chatMessages!: Table<LCChatMessage, string>;
  contextStash!: Table<LCContextStashItem, string>;
  aiSettings!: Table<HelixAISettings, string>;

  constructor() {
    super("lemon-coder");

    this.version(3).stores({
      projects: "id, name, lastOpened",
      projectHandles: "projectId",
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

  // ── Project Handle helpers ─────────────────────────────────────────────────

  async saveProjectHandle(projectId: string, dirHandle: FileSystemDirectoryHandle): Promise<void> {
    const entry: LCProjectHandle = {
      projectId,
      dirHandle,
      lastVerified: new Date(),
    };
    await this.projectHandles.put(entry);
  }

  async getProjectHandle(projectId: string): Promise<LCProjectHandle | undefined> {
    return this.projectHandles.get(projectId);
  }

  async deleteProjectHandle(projectId: string): Promise<void> {
    await this.projectHandles.delete(projectId);
  }

  async getProject(id: string): Promise<LCProject | undefined> {
    return this.projects.get(id);
  }

  async updateLastOpened(id: string): Promise<void> {
    await this.projects.update(id, { lastOpened: new Date() });
  }

  async updateProjectName(id: string, name: string): Promise<void> {
    await this.projects.update(id, { name });
  }

  async getAllProjects(): Promise<LCProject[]> {
    return this.projects.orderBy("lastOpened").reverse().toArray();
  }

  async deleteProject(id: string): Promise<void> {
    // Delete the project handle
    await this.projectHandles.delete(id);

    // Delete all chat sessions for this project
    const sessions = await this.chatSessions
      .where("projectId")
      .equals(id)
      .toArray();
    const sessionIds = sessions.map((s) => s.id);

    // Collect all message IDs from those sessions
    const messageIds = sessions.flatMap((s) =>
      s.messages.map((m) => m.id),
    );

    // Delete chat messages
    if (messageIds.length > 0) {
      await this.chatMessages.bulkDelete(messageIds);
    }

    // Delete chat sessions
    if (sessionIds.length > 0) {
      await this.chatSessions.bulkDelete(sessionIds);
    }

    // Delete context stash items associated with this project
    // Since stash items don't have projectId, we'll keep them as is

    // Delete the project itself
    await this.projects.delete(id);
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    const session = await this.chatSessions.get(sessionId);
    if (session) {
      // Delete all messages in the session
      const messageIds = session.messages.map((m) => m.id);
      if (messageIds.length > 0) {
        await this.chatMessages.bulkDelete(messageIds);
      }
      // Delete the session
      await this.chatSessions.delete(sessionId);
    }
  }

  async clearAllChatSessions(projectId: string): Promise<void> {
    const sessions = await this.chatSessions
      .where("projectId")
      .equals(projectId)
      .toArray();

    const allMessageIds = sessions.flatMap((s) =>
      s.messages.map((m) => m.id),
    );
    const sessionIds = sessions.map((s) => s.id);

    if (allMessageIds.length > 0) {
      await this.chatMessages.bulkDelete(allMessageIds);
    }
    if (sessionIds.length > 0) {
      await this.chatSessions.bulkDelete(sessionIds);
    }
  }

  /**
   * Remove all recent projects and their associated data:
   * - Cached directory handles (projectHandles)
   * - Chat sessions for those projects
   * - Chat messages belonging to those sessions
   */
  async clearRecentProjects(): Promise<void> {
    // Get all project IDs to scope chat data deletion
    const allProjects = await this.projects.toArray();
    const projectIds = allProjects.map((p) => p.id);

    if (projectIds.length > 0) {
      // Collect all chat session IDs for these projects
      const sessions = await this.chatSessions
        .where("projectId")
        .anyOf(projectIds)
        .toArray();

      const sessionIds = sessions.map((s) => s.id);

      // Collect all message IDs from those sessions
      const messageIds = sessions.flatMap((s) =>
        s.messages.map((m) => m.id),
      );

      // Delete chat messages (bulk delete by primary key)
      if (messageIds.length > 0) {
        await this.chatMessages.bulkDelete(messageIds);
      }

      // Delete chat sessions for these projects
      if (sessionIds.length > 0) {
        await this.chatSessions.bulkDelete(sessionIds);
      }
    }

    // Clear cached directory handles
    await this.projectHandles.clear();
    // Clear all project entries
    await this.projects.clear();
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

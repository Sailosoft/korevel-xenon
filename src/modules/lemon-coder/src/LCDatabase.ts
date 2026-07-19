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
  LCDeepstash,
  LCDeepstashItem,
  LCFavoriteGroup,
  LCFavoriteItem,
  LCInstructionStashItem,
  LCSettingsEntry,
} from "./LCInterface";
import type { HelixAISettings } from "@/src/modules/helix";

export class LCDatabase extends Dexie {
  projects!: Table<LCProject, string>;
  projectHandles!: Table<LCProjectHandle, string>;
  chatSessions!: Table<LCChatSession, string>;
  chatMessages!: Table<LCChatMessage, string>;
  contextStash!: Table<LCContextStashItem, string>;
  aiSettings!: Table<HelixAISettings, string>;
  deepstashes!: Table<LCDeepstash, string>;
  deepstashItems!: Table<LCDeepstashItem, string>;
  favoriteGroups!: Table<LCFavoriteGroup, string>;
  favoriteItems!: Table<LCFavoriteItem, string>;
  instructionStash!: Table<LCInstructionStashItem, string>;
  appSettings!: Table<LCSettingsEntry, string>;

  constructor() {
    super("lemon-coder");

    // IMPORTANT: Version bumps MUST be sequential. Never remove old version definitions.
    // If you add a new table, create the NEXT version number with the new table included.
    // Existing databases will only create new tables when a higher version is declared.

    this.version(8).stores({
      projects: "id, name, lastOpened",
      projectHandles: "projectId",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
      aiSettings: "key, provider, model",
      deepstashes: "id, projectId, name, createdAt",
      deepstashItems: "id, deepstashId, path",
      favoriteGroups: "id, projectId, name, createdAt",
      favoriteItems: "id, groupId, projectId, path, addedAt",
      instructionStash: "id, projectId, name, addedAt",
      appSettings: "key",
    });

    this.version(6).stores({
      projects: "id, name, lastOpened",
      projectHandles: "projectId",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
      aiSettings: "key, provider, model",
      deepstashes: "id, projectId, name, createdAt",
      deepstashItems: "id, deepstashId, path",
      favoriteGroups: "id, projectId, name, createdAt",
      favoriteItems: "id, groupId, projectId, path, addedAt",
      instructionStash: "id, name, addedAt",
    });

    this.version(5).stores({
      projects: "id, name, lastOpened",
      projectHandles: "projectId",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
      aiSettings: "key, provider, model",
      deepstashes: "id, projectId, name, createdAt",
      deepstashItems: "id, deepstashId, path",
      favoriteGroups: "id, projectId, name, createdAt",
      favoriteItems: "id, groupId, projectId, path, addedAt",
    });

    this.version(4).stores({
      projects: "id, name, lastOpened",
      projectHandles: "projectId",
      chatSessions: "id, projectId, title, createdAt",
      chatMessages: "id, role, timestamp",
      contextStash: "id, path, addedAt",
      aiSettings: "key, provider, model",
      deepstashes: "id, projectId, name, createdAt",
      deepstashItems: "id, deepstashId, path",
    });

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

    // Delete all deepstashes and their items for this project
    const deepstashes = await this.deepstashes
      .where("projectId")
      .equals(id)
      .toArray();
    const deepstashIds = deepstashes.map((d) => d.id);

    for (const dsId of deepstashIds) {
      const items = await this.deepstashItems
        .where("deepstashId")
        .equals(dsId)
        .toArray();
      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        await this.deepstashItems.bulkDelete(itemIds);
      }
    }
    if (deepstashIds.length > 0) {
      await this.deepstashes.bulkDelete(deepstashIds);
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

  async updateChatSessionTitle(
    sessionId: string,
    title: string,
  ): Promise<void> {
    await this.chatSessions.update(sessionId, { title });
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

  // ── Deepstash helpers ─────────────────────────────────────────────────────

  /**
   * Save the current context stash items as a named deepstash snapshot.
   */
  async createDeepstash(
    projectId: string,
    name: string,
    items: LCContextStashItem[],
  ): Promise<LCDeepstash> {
    const deepstash: LCDeepstash = {
      id: uuidv4(),
      projectId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist the deepstash record
    await this.deepstashes.add(deepstash);

    // Persist all stash item copies as deepstash items
    if (items.length > 0) {
      const deepstashItemEntries: LCDeepstashItem[] = items.map((item) => ({
        id: uuidv4(),
        deepstashId: deepstash.id,
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        parentId: item.parentId,
        addedAt: item.addedAt,
      }));
      await this.deepstashItems.bulkAdd(deepstashItemEntries);
    }

    return deepstash;
  }

  /**
   * Get all deepstashes for a given project, most recent first.
   */
  async getDeepstashes(projectId: string): Promise<LCDeepstash[]> {
    return this.deepstashes
      .where("projectId")
      .equals(projectId)
      .reverse()
      .sortBy("createdAt");
  }

  /**
   * Get a single deepstash by id.
   */
  async getDeepstash(id: string): Promise<LCDeepstash | undefined> {
    return this.deepstashes.get(id);
  }

  /**
   * Get all items belonging to a deepstash.
   */
  async getDeepstashItems(deepstashId: string): Promise<LCDeepstashItem[]> {
    return this.deepstashItems
      .where("deepstashId")
      .equals(deepstashId)
      .toArray();
  }

  /**
   * Rename a deepstash.
   */
  async renameDeepstash(id: string, name: string): Promise<void> {
    await this.deepstashes.update(id, { name, updatedAt: new Date() });
  }

  /**
   * Delete a deepstash and all its items.
   */
  async deleteDeepstash(id: string): Promise<void> {
    // Remove all items belonging to this deepstash
    const items = await this.deepstashItems
      .where("deepstashId")
      .equals(id)
      .toArray();
    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      await this.deepstashItems.bulkDelete(itemIds);
    }
    // Remove the deepstash record
    await this.deepstashes.delete(id);
  }

  /**
   * Delete all deepstashes and their items for a given project.
   */
  async clearAllDeepstashes(projectId: string): Promise<void> {
    const deepstashes = await this.deepstashes
      .where("projectId")
      .equals(projectId)
      .toArray();
    const ids = deepstashes.map((d) => d.id);

    // Delete all items belonging to these deepstashes
    for (const dsId of ids) {
      const items = await this.deepstashItems
        .where("deepstashId")
        .equals(dsId)
        .toArray();
      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        await this.deepstashItems.bulkDelete(itemIds);
      }
    }

    // Delete all deepstash records
    if (ids.length > 0) {
      await this.deepstashes.bulkDelete(ids);
    }
  }

  // ── Favorite Groups helpers ─────────────────────────────────────────────────

  /**
   * Create a new favourite group.
   */
  async createFavoriteGroup(projectId: string, name: string): Promise<LCFavoriteGroup> {
    const group: LCFavoriteGroup = {
      id: uuidv4(),
      projectId,
      name,
      createdAt: new Date(),
    };
    await this.favoriteGroups.add(group);
    return group;
  }

  /**
   * Get all favourite groups for a project, oldest first.
   */
  async getFavoriteGroups(projectId: string): Promise<LCFavoriteGroup[]> {
    return this.favoriteGroups
      .where("projectId")
      .equals(projectId)
      .sortBy("createdAt");
  }

  /**
   * Rename a favourite group.
   */
  async renameFavoriteGroup(groupId: string, name: string): Promise<void> {
    await this.favoriteGroups.update(groupId, { name });
  }

  /**
   * Delete a favourite group and all its items.
   */
  async deleteFavoriteGroup(groupId: string): Promise<void> {
    // Remove all items belonging to this group
    const items = await this.favoriteItems
      .where("groupId")
      .equals(groupId)
      .toArray();
    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      await this.favoriteItems.bulkDelete(itemIds);
    }
    // Remove the group record
    await this.favoriteGroups.delete(groupId);
  }

  // ── Favorite Items helpers ─────────────────────────────────────────────────

  /**
   * Add a file to favourites. If it already exists in the same group, skip.
   */
  async addFavoriteItem(
    groupId: string,
    projectId: string,
    name: string,
    path: string,
  ): Promise<LCFavoriteItem | null> {
    // Check for duplicates within the same group
    const existing = await this.favoriteItems
      .where({ groupId, path })
      .first();
    if (existing) return null;

    const item: LCFavoriteItem = {
      id: uuidv4(),
      groupId,
      projectId,
      name,
      path,
      addedAt: new Date(),
    };
    await this.favoriteItems.add(item);
    return item;
  }

  /**
   * Remove a favourite item by id.
   */
  async removeFavoriteItem(id: string): Promise<void> {
    await this.favoriteItems.delete(id);
  }

  /**
   * Get all favourite items for a group, oldest first.
   */
  async getFavoriteItemsByGroup(groupId: string): Promise<LCFavoriteItem[]> {
    return this.favoriteItems
      .where("groupId")
      .equals(groupId)
      .sortBy("addedAt");
  }

  /**
   * Get all favourite items for a project, grouped by group id.
   */
  async getAllFavoriteItems(projectId: string): Promise<LCFavoriteItem[]> {
    return this.favoriteItems
      .where("projectId")
      .equals(projectId)
      .sortBy("addedAt");
  }

  /**
   * Move a favourite item to a different group.
   */
  async moveFavoriteItem(itemId: string, newGroupId: string): Promise<void> {
    await this.favoriteItems.update(itemId, { groupId: newGroupId });
  }

  // ── Instruction Stash helpers ──────────────────────────────────────────────

  /**
   * Add an instruction snippet to the instruction stash.
   */
  async addInstruction(projectId: string, name: string, content: string): Promise<LCInstructionStashItem> {
    const item: LCInstructionStashItem = {
      id: uuidv4(),
      projectId,
      name,
      content,
      addedAt: new Date(),
    };
    await this.instructionStash.add(item);
    return item;
  }

  /**
   * Get instruction stash items, most recent first.
   * If projectId is provided, only returns items scoped to that project.
   */
  async getInstructions(projectId?: string): Promise<LCInstructionStashItem[]> {
    if (projectId) {
      return this.instructionStash
        .where("projectId")
        .equals(projectId)
        .reverse()
        .sortBy("addedAt");
    }
    return this.instructionStash
      .orderBy("addedAt")
      .reverse()
      .toArray();
  }

  /**
   * Remove an instruction from the stash by id.
   */
  async removeInstruction(id: string): Promise<void> {
    await this.instructionStash.delete(id);
  }

  /**
   * Clear instruction stash items.
   * If projectId is provided, only clears instructions scoped to that project.
   * Otherwise, clears all instructions across all projects.
   */
  async clearInstructions(projectId?: string): Promise<void> {
    if (projectId) {
      const items = await this.instructionStash
        .where("projectId")
        .equals(projectId)
        .toArray();
      const ids = items.map((i) => i.id);
      if (ids.length > 0) {
        await this.instructionStash.bulkDelete(ids);
      }
    } else {
      await this.instructionStash.clear();
    }
  }

  // ── App Settings helpers ────────────────────────────────────────────────────

  /**
   * Get a single setting by key. Returns the stored entry or undefined.
   */
  async getSetting(key: string): Promise<LCSettingsEntry | undefined> {
    return this.appSettings.get(key);
  }

  /**
   * Get the string value of a setting by key, falling back to defaultValue.
   */
  async getSettingValue(key: string, defaultValue: string): Promise<string> {
    const entry = await this.appSettings.get(key);
    return entry?.value ?? defaultValue;
  }

  /**
   * Set a setting value. Creates or overwrites the entry.
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.appSettings.put({ key, value, updatedAt: new Date() });
  }

  /**
   * Get all settings as a flat key-value record.
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const entries = await this.appSettings.toArray();
    const result: Record<string, string> = {};
    for (const e of entries) {
      result[e.key] = e.value;
    }
    return result;
  }

  /**
   * Reset a single setting to its default (delete the stored entry).
   */
  async resetSetting(key: string): Promise<void> {
    await this.appSettings.delete(key);
  }
}

export const lcDB = new LCDatabase();

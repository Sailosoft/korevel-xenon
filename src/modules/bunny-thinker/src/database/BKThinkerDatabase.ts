// BKThinkerDatabase.ts
//
// BKThinkerDatabase — IndexedDB persistence layer for BunnyAI Thinker.
//
// Uses the PhazeDB abstraction over Dexie to manage local IndexedDB stores
// for all thinker entities: Thinkers, Thought Patterns, Thought Associations,
// Ideas, Craft Configs, Thoughts, Train of Thoughts, Memories, Thinks,
// Processes, and AI Settings.
//
// Each table is backed by a typed repository (PhazeRepository) exposing
// CRUD + query operations with GUIDv7 support.

import PhazeDB from "@/src/modules/phaze/src/PhazeDB";
import type { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { configureBKThinkerMigrations } from "./BKThinkerMigration";
import type { BKThinker } from "../thinker/BKThinker.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKCraftConfig } from "../craft/BKCraft.Types";
import type { BKThought } from "../thoughts/BKThoughts.Types";
import type { BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKMemory } from "../memory/BKMemory.Types";
import type { BKMemoryNeuron } from "../memory/BKMemory.Types";
import type { BKThink } from "../think/BKThink.Types";
import type { BKProcess } from "../process/BKProcess.Types";
import type { BKIdea, BKThoughtIdea, BKTrainOfThoughtIdea } from "../ideas/BKIdeas.Types";
import type { BKAISettings } from "../ai-settings/BKAISettings.Types";
import { BKThoughtPatternRepository } from "../thought-pattern/BKThoughtPattern.Repository";
import { BKThoughtAssociationRepository } from "../thought-association/BKThoughtAssociation.Repository";
import { BKIdeaRepository } from "../ideas/BKIdeas.Repository";
import { BKThoughtRepository, BKTrainOfThoughtRepository } from "../thoughts/BKThoughts.Repository";
import { BKMemoryRepository, BKMemoryNeuronRepository } from "../memory/BKMemory.Repository";
import { BKThinkRepository } from "../think/BKThink.Repository";
import { BKProcessRepository } from "../process/BKProcess.Repository";

export class BKThinkerDatabase extends PhazeDB {
  // ── Thinkers ──────────────────────────────────────────────────────
  public thinkers = this.table<BKThinker, string>("thinkers");
  public thinkersRepo = new PhazeRepository<BKThinker>(this.thinkers);

  // ── Thought Patterns ──────────────────────────────────────────────
  public thoughtPatterns = this.table<BKThoughtPattern, string>(
    "thoughtPatterns",
  );
  public thoughtPatternsRepo = new BKThoughtPatternRepository(
    this.thoughtPatterns,
  );

  // ── Thought Associations ──────────────────────────────────────────
  public thoughtAssociations = this.table<BKThoughtAssociation, string>(
    "thoughtAssociations",
  );
  public thoughtAssociationsRepo = new BKThoughtAssociationRepository(
    this.thoughtAssociations,
  );

  // ── Ideas ──────────────────────────────────────────────────────────
  public ideas = this.table<BKIdea, string>("ideas");
  public ideasRepo = new BKIdeaRepository(this.ideas);

  // ── Idea-Thought Mappings ─────────────────────────────────────────
  public thoughtIdeas = this.table<BKThoughtIdea, string>("thoughtIdeas");
  public thoughtIdeasRepo = new PhazeRepository<BKThoughtIdea>(this.thoughtIdeas);

  // ── Train-of-Thought-Idea Mappings ────────────────────────────────
  public trainOfThoughtIdeas = this.table<BKTrainOfThoughtIdea, string>("trainOfThoughtIdeas");
  public trainOfThoughtIdeasRepo = new PhazeRepository<BKTrainOfThoughtIdea>(this.trainOfThoughtIdeas);

  // ── Craft Configs ─────────────────────────────────────────────────
  public craftConfigs = this.table<BKCraftConfig, string>("craftConfigs");
  public craftConfigsRepo = new PhazeRepository<BKCraftConfig>(
    this.craftConfigs,
  );

  // ── Thoughts ──────────────────────────────────────────────────────
  public thoughts = this.table<BKThought, string>("thoughts");
  public thoughtsRepo = new BKThoughtRepository(this.thoughts);

  // ── Train of Thoughts ─────────────────────────────────────────────
  public trainOfThoughts = this.table<BKTrainOfThought, string>(
    "trainOfThoughts",
  );
  public trainOfThoughtsRepo = new BKTrainOfThoughtRepository(
    this.trainOfThoughts,
  );

  // ── Memories ──────────────────────────────────────────────────────
  public memories = this.table<BKMemory, string>("memories");
  public memoriesRepo = new BKMemoryRepository(this.memories);

  // ── Memory Neurons ────────────────────────────────────────────────
  public memoryNeurons = this.table<BKMemoryNeuron, string>("memoryNeurons");
  public memoryNeuronsRepo = new BKMemoryNeuronRepository(
    this.memoryNeurons,
  );

  // ── Processes ──────────────────────────────────────────────────
  public processes = this.table<BKProcess, string>("processes");
  public processesRepo = new BKProcessRepository(this.processes);

  // ── Thinks ────────────────────────────────────────────────────────
  public thinks = this.table<BKThink, string>("thinks");
  public thinksRepo = new BKThinkRepository(this.thinks);

  // ── AI Settings ───────────────────────────────────────────────────
  public aiSettings = this.table<BKAISettings, string>("aiSettings");
  public aiSettingsRepo = new PhazeRepository<BKAISettings>(this.aiSettings);

  protected dbName(): string {
    return "BKThinkerDB";
  }

  protected onModelCreating(model: IPhazeModelBuilder): void {
    configureBKThinkerMigrations(model);
  }
}

export const bkThinkerDB = new BKThinkerDatabase();

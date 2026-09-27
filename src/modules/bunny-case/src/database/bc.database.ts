// bc.database.ts
//
// DexieJS database for BunnyCase. Stores personas, cases, communication
// templates, training sessions + messages, the playbook library, simulator
// history, study handbooks and Helix AI settings.
// Per project rules we do NOT use live query — repositories read
// imperatively.

import Dexie from "dexie";
import type { HelixAISettings } from "@/src/modules/helix";
import type { BCCasePersona } from "../modules/persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../modules/case-base/bc.case.entity";
import type { BCCaseTemplate } from "../modules/template/bc.template.entity";
import type {
  BCCaseMessage,
  BCCaseSession,
} from "../modules/trainer/bc.trainer.entity";
import type { BCPlaybook } from "../modules/playbook-library/bc.playbook.entity";
import type { BCSimulatorRecord } from "../modules/simulator/bc.simulator.entity";
import type { BCStudy } from "../modules/study/bc.study.entity";

export class BCDatabase extends Dexie {
  personas!: Dexie.Table<BCCasePersona, number>;
  cases!: Dexie.Table<BCCaseScenario, number>;
  templates!: Dexie.Table<BCCaseTemplate, number>;
  sessions!: Dexie.Table<BCCaseSession, number>;
  messages!: Dexie.Table<BCCaseMessage, number>;
  playbooks!: Dexie.Table<BCPlaybook, number>;
  simulators!: Dexie.Table<BCSimulatorRecord, number>;
  studies!: Dexie.Table<BCStudy, number>;
  aiSettings!: Dexie.Table<HelixAISettings, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      personas: "++id, name, createdAt",
      cases: "++id, personaId, title, createdAt",
      templates: "++id, title, caseId, source, createdAt",
      sessions: "++id, caseId, personaId, mode, status, createdAt",
      messages: "++id, sessionId, role, createdAt",
      playbooks: "++id, title, tags, status, createdAt",
      aiSettings: "key, provider, model",
    });
    this.version(2).stores({
      // Simulator history — one record per generated ideal simulation.
      simulators: "++id, personaId, caseId, outcome, createdAt",
      // Agent persona architect — optional persona for the ideal agent.
      agentPersonas: "++id, name, createdAt",
      // Study — AI handbook / guide book generated from a case.
      studies: "++id, caseId, personaId, title, createdAt",
    });
    this.version(3).stores({
      // Cases are now just Title + Content — no persona link.
      cases: "++id, title, createdAt",
      // Personas carry a mode (all / person / trainer / main-actor).
      personas: "++id, name, mode, createdAt",
      // Agent personas are gone — "main actor" personas replace them.
      agentPersonas: null,
    });
  }
}

export const bcDatabase = new BCDatabase("BunnyCaseDatabase");

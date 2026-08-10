/**
 * BunnyCase — Conversational AI Training Ecosystem
 *
 * Public entry point for the module. Each feature lives in its own folder
 * under `src/modules/bunny-case/src/modules/{module}/` with an `index.ts`.
 */

// ── Document shell ─────────────────────────────────────────────────────────────
export {
  BCDocumentShell,
  BC_SHELL_CONFIG,
  BC_SHELF_NAV_ITEMS,
} from "./src/modules/document-shell";
export type {
  BCDocumentShellConfig,
  BCNavItem,
} from "./src/modules/document-shell";

// ── Database / container ───────────────────────────────────────────────────────
export { bcDatabase } from "./src/database/bc.database";
export { bcContainer } from "./src/container/bc.container";

// ── Dashboard ──────────────────────────────────────────────────────────────────
export { BCCaseDashboard } from "./src/modules/dashboard";

// ── Settings (AI Configuration) ────────────────────────────────────────────────
export { BCSettingsComponent, BCSettingsRepository } from "./src/modules/settings";

// ── Configure ─────────────────────────────────────────────────────────────────
export { BCPersonaComponent, bcPersonaModule } from "./src/modules/persona-architect";
export { BCCaseComponent, bcCaseModule } from "./src/modules/case-base";
export {
  BCAgentPersonaComponent,
  bcAgentPersonaModule,
  bcAgentPersonaGenerateProfile,
} from "./src/modules/agent-persona";

// ── Observe ───────────────────────────────────────────────────────────────────
export { BCSimulatorComponent, useBCSimulator } from "./src/modules/simulator";
export {
  BCSimulatorHistoryComponent,
  bcSimulatorHistoryModule,
} from "./src/modules/simulator-history";
export { BCTemplateComponent, bcTemplateModule } from "./src/modules/template";

// ── Learn ─────────────────────────────────────────────────────────────────────
export { BCStudyComponent, bcStudyModule, bcGenerateStudy } from "./src/modules/study";

// ── Interact ──────────────────────────────────────────────────────────────────
export {
  BCTrainerComponent,
  useBCTrainer,
  BCVoiceProvider,
  useBCVoice,
  useBCSpeechRecognition,
} from "./src/modules/trainer";
export { BCVoiceSettingsComponent } from "./src/modules/voice-settings";

// ── Validate ──────────────────────────────────────────────────────────────────
export { BCGauntletComponent, useBCGauntlet } from "./src/modules/gauntlet";
export {
  BCSessionHistoryComponent,
  bcSessionHistoryModule,
} from "./src/modules/session-history";

// ── Optimize ──────────────────────────────────────────────────────────────────
export { BCAnalyticsComponent, useBCAnalytics } from "./src/modules/analytics";
export { BCPlaybookComponent, bcPlaybookModule } from "./src/modules/playbook-library";

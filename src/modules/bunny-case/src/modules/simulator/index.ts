// simulator module — public exports

export { default as BCSimulatorComponent } from "./bc.simulator.component";
export { useBCSimulator } from "./bc.simulator.hooks";
export { bcSimulateConversation } from "./bc.simulator.server";
export type {
  BCSimulatorTurn,
  BCSimulationResult,
  BCSimulatorSpeaker,
  BCSimulatorRecord,
} from "./bc.simulator.entity";

// hot-seat module — public exports

export { default as BCHotSeatComponent } from "./bc.hot-seat.component";
export { useBCHotSeat } from "./bc.hot-seat.hooks";
export {
  bcHotSeatPersonaReply,
  bcHotSeatEvaluate,
} from "./bc.hot-seat.server";
export { bcHotSeatPrompts, bcResolveHotSeatPrompts } from "./bc.hot-seat.prompt";
export type { BCHotSeatPromptSet, BCHotSeatPromptEntry } from "./bc.hot-seat.prompt";
export type {
  BCHotSeatReply,
  BCHotSeatEvaluation,
} from "./bc.hot-seat.entity";

// trainer module — public exports

export { default as BCTrainerComponent } from "./bc.trainer.component";
export { useBCTrainer } from "./bc.trainer.hooks";
export {
  bcTrainerPersonaReply,
  bcTrainerCoachFeedback,
  bcTrainerTurnGuide,
  bcTrainerCritiqueDraft,
} from "./bc.trainer.server";
export { BCVoiceProvider, useBCVoice } from "./bc.trainer.voice";
export { useBCSpeechRecognition } from "./bc.trainer.input.stt.hooks";
export type {
  BCCaseSession,
  BCCaseMessage,
  BCMessageRole,
  BCSessionMode,
  BCSessionStatus,
  BCTrainerPersonaReply,
  BCTrainerFeedback,
  BCTrainerGuide,
  BCTrainerCritique,
} from "./bc.trainer.entity";

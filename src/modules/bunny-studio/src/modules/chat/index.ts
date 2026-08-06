// chat module — public exports

export { BSChatComponent } from "./BSChat.Component";
export { BSChatConversationView } from "./BSChat.ConversationView";
export { BSChatInput } from "./BSChat.Input";
export type { BSChatInputMode, BSChatInputProps } from "./BSChat.Input";
export { useBSChatInput } from "./BSChat.Input.Hooks";
export type {
  BSChatInputHookOptions,
  BSChatInputHookReturn,
  BSChatInputSendHandler,
} from "./BSChat.Input.Hooks";
export { useBSSpeechRecognition } from "./BSChat.Input.STT.Hooks";
export type {
  BSSpeechRecognitionOptions,
  BSSpeechRecognitionResult,
} from "./BSChat.Input.STT.Hooks";
export { BSChatInputSTTButton } from "./BSChat.Input.STTButton";
export type { BSChatInputSTTButtonProps } from "./BSChat.Input.STTButton";
export { BSChatSettingsPanel } from "./BSChat.SettingsPanel";
export type { BSChatSettingsPanelProps } from "./BSChat.SettingsPanel";
export { BSChatList } from "./BSChat.List";
export type { BSChatListProps } from "./BSChat.List";
export { useBSChat } from "./BSChat.Hooks";
export type {
  BSChatHookOptions,
  BSChatHookReturn,
  BSChatSendOptions,
} from "./BSChat.Hooks";
export { BSChatRepository, BSConversationHelper } from "./BSChat.Repository";
export type {
  BSChat,
  BSConversation,
  BSConversationType,
  BSChatWireMessage,
  BSChatStreamRequest,
} from "./BSChat.Types";
export {
  BSVoiceProvider,
  useBSVoice,
  stripMarkdownForSpeech,
} from "./BSChat.Voice";
export type { BSVoiceContextValue } from "./BSChat.Voice";

// chat module — public exports

export { BSChatComponent } from "./BSChat.Component";
export { BSChatConversationView } from "./BSChat.ConversationView";
export { BSChatInput } from "./BSChat.Input";
export type { BSChatInputMode, BSChatInputProps } from "./BSChat.Input";
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

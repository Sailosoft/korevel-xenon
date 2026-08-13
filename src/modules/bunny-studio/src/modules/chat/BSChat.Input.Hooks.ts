// BSChat.Input.Hooks — State + logic hook for the chat input.
//
// Extracted from BSChat.Input.tsx so the component stays a pure UI
// orchestrator. Encapsulates:
//  - Input mode (standard / instruction / codemirror).
//  - Auto-growing standard textarea (feature: "Textarea input is too big").
//  - Skill bubbles selection (feature: Agent skill).
//  - Code editor modal open + cover/window view state (feature: Code Editor
//    Open Modal).
//  - Custom instruction group filter + prefill (feature: Custom Instructions).
//
// Attachment logic (image base64 URL + text file upload) lives separately in
// BSChat.Input.Attachment.tsx. This hook receives the current attachments via
// the `getAttachments` / `clearAttachments` options so sending and `canSend`
// can include them without owning them.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { bsDB } from "../../BSDatabase";
import type { BSInstructionGroup } from "../instruction-groups/BSInstructionGroup.Types";
import type { BSInstruction } from "../instructions/BSInstruction.Types";
import type { BSChatInputAttachments } from "./BSChat.Input.Attachment";

// ─── Types ─────────────────────────────────────────────────────────────

export type BSChatInputMode = "standard" | "instruction" | "codemirror";

/** Signature of the callback fired when the user submits the input */
export type BSChatInputSendHandler = (
  content: string,
  instruction?: string,
  skills?: string[],
  attachments?: BSChatInputAttachments,
) => void;

export interface BSChatInputHookOptions {
  /** Called when the user submits content (and optional instruction + skills) */
  onSend: BSChatInputSendHandler;
  /** True while a stream is in progress — blocks sending */
  isStreaming?: boolean;
  /** Default input mode (used only as the initial state) */
  defaultMode?: BSChatInputMode;
  /**
   * Returns the current attachments (owned by useBSChatInputAttachments) so
   * the send flow can include them and canSend can enable attachment-only
   * sends.
   */
  getAttachments?: () => BSChatInputAttachments;
  /** Clears the attachments after a send (owned by useBSChatInputAttachments). */
  clearAttachments?: () => void;
}

export interface BSChatInputHookReturn {
  // Input mode
  mode: BSChatInputMode;
  setMode: (mode: BSChatInputMode) => void;
  // Text + instruction content
  text: string;
  setText: (value: string) => void;
  /** Append a suffix to the current text (used by speech-to-text input) */
  appendText: (suffix: string) => void;
  instruction: string;
  setInstruction: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  // Submit helpers
  canSend: boolean;
  handleSend: () => void;
  handleKeyDown: (e: ReactKeyboardEvent) => void;
  // Skill bubbles (feature: Agent skill)
  selectedSkills: string[];
  toggleSkill: (skill: string) => void;
  // Code editor modal (feature: Code Editor Open Modal)
  editorModalOpen: boolean;
  editorCoverView: boolean;
  openEditorModal: () => void;
  closeEditorModal: () => void;
  toggleEditorCoverView: () => void;
  // Custom instructions (feature)
  selectedGroupId: string;
  handleGroupChange: (value: string) => void;
  selectedInstructionId: string;
  instructionGroups: BSInstructionGroup[] | undefined;
  filteredInstructions: BSInstruction[];
  handleInstructionSelect: (id: string) => void;
  // Instruction editor (feature: long instruction text)
  instructionRef: RefObject<HTMLTextAreaElement | null>;
  instructionCoverView: boolean;
  instructionModalOpen: boolean;
  openInstructionModal: () => void;
  closeInstructionModal: () => void;
  toggleInstructionCoverView: () => void;
}

export const MAX_TEXTAREA_HEIGHT = 200; // px

/** Auto-grow cap for the custom instruction textarea (feature: long instruction text) */
export const MAX_INSTRUCTION_HEIGHT = 200; // px

// ─── Hook ──────────────────────────────────────────────────────────────

export function useBSChatInput({
  onSend,
  isStreaming = false,
  defaultMode = "standard",
  getAttachments,
  clearAttachments,
}: BSChatInputHookOptions): BSChatInputHookReturn {
  const [mode, setMode] = useState<BSChatInputMode>(defaultMode);
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const instructionRef = useRef<HTMLTextAreaElement | null>(null);

  // Skill bubbles (feature: Agent skill)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Code editor modal (feature: Code Editor Open Modal)
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorCoverView, setEditorCoverView] = useState(false);

  // Instruction editor modal (feature: long instruction text)
  const [instructionCoverView, setInstructionCoverView] = useState(false);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);

  // Custom Instructions (feature): group filter + instruction prefill
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedInstructionId, setSelectedInstructionId] =
    useState<string>("");

  const instructionGroups = useLiveQuery<BSInstructionGroup[]>(
    () =>
      bsDB.instructionGroupsRepo.query
        .getAll({ page: 0, pageSize: 0 })
        .then((r) => r.data),
    [],
  );

  const allInstructions = useLiveQuery<BSInstruction[]>(
    () =>
      bsDB.instructionsRepo.query
        .getAll({ page: 0, pageSize: 0 })
        .then((r) => r.data),
    [],
  );

  const filteredInstructions = useMemo<BSInstruction[]>(() => {
    if (!allInstructions) return [];
    if (selectedGroupId) {
      return allInstructions.filter(
        (i) => i.instructionGroupId === selectedGroupId,
      );
    }
    return allInstructions;
  }, [allInstructions, selectedGroupId]);

  // Auto-grow the standard textarea so it is compact when empty and expands
  // as the user types (feature: "Textarea input is too big").
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text, mode]);

  // Auto-grow the instruction textarea so long custom instructions are easy
  // to see and rewrite (feature: long instruction text).
  useEffect(() => {
    const el = instructionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INSTRUCTION_HEIGHT)}px`;
  }, [instruction, mode]);

  // Append a transcript (from speech-to-text) to whatever the user already
  // typed, without clobbering it (feature: STT / builtin web SpeechRecognition).
  const appendText = (suffix: string) => {
    const next = suffix.trim();
    if (!next) return;
    setText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${next}` : next;
    });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill],
    );
  };

  // Current attachments (owned by useBSChatInputAttachments) — used for the
  // send payload and to allow attachment-only sends.
  const attachments = getAttachments?.();
  const hasAttachments =
    (attachments?.images.length ?? 0) > 0 ||
    (attachments?.files.length ?? 0) > 0;

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !hasAttachments) || isStreaming) return;
    const instructionValue =
      mode === "instruction" ? instruction.trim() || undefined : undefined;
    onSend(trimmed, instructionValue, selectedSkills, attachments);
    setText("");
    setInstruction("");
    setSelectedSkills([]);
    setSelectedGroupId("");
    setSelectedInstructionId("");
    clearAttachments?.();
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    setSelectedInstructionId("");
  };

  const handleInstructionSelect = (id: string) => {
    setSelectedInstructionId(id);
    const inst = filteredInstructions.find((i) => i.id === id);
    if (inst) setInstruction(inst.content);
  };

  const openEditorModal = () => {
    setEditorCoverView(false);
    setEditorModalOpen(true);
  };

  const closeEditorModal = () => setEditorModalOpen(false);

  const toggleEditorCoverView = () => setEditorCoverView((v) => !v);

  const openInstructionModal = () => {
    setInstructionCoverView(false);
    setInstructionModalOpen(true);
  };

  const closeInstructionModal = () => setInstructionModalOpen(false);

  const toggleInstructionCoverView = () =>
    setInstructionCoverView((v) => !v);

  return {
    mode,
    setMode,
    text,
    setText,
    appendText,
    instruction,
    setInstruction,
    textareaRef,
    canSend: Boolean(text.trim()) || hasAttachments,
    handleSend,
    handleKeyDown,
    selectedSkills,
    toggleSkill,
    editorModalOpen,
    editorCoverView,
    openEditorModal,
    closeEditorModal,
    toggleEditorCoverView,
    selectedGroupId,
    handleGroupChange,
    selectedInstructionId,
    instructionGroups,
    filteredInstructions,
    handleInstructionSelect,
    instructionRef,
    instructionCoverView,
    instructionModalOpen,
    openInstructionModal,
    closeInstructionModal,
    toggleInstructionCoverView,
  };
}

export default useBSChatInput;

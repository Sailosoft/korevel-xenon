"use client";

// BDFilePasswordDialog — one dialog for all three password flows:
//   protect → enter + confirm a new password
//   unlock  → enter the password to unlock for the session
//   remove  → enter the password to clear protection
//
// Hashing is obfuscation only; the displayed copy states that limitation.

import { useState } from "react";
import { KeyRound, Lock, ShieldOff } from "lucide-react";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export type BDFilePasswordMode = "unlock" | "protect" | "remove";

export interface BDFilePasswordDialogProps {
  open: boolean;
  mode: BDFilePasswordMode;
  fileName?: string;
  error?: string;
  isLoading?: boolean;
  onSubmit: (password: string) => void | Promise<void>;
  onClose: () => void;
}

const COPY: Record<
  BDFilePasswordMode,
  { title: string; description: string; confirm: string; icon: typeof Lock }
> = {
  protect: {
    title: "Protect with password",
    description:
      "The file cannot be viewed, edited, or downloaded until the password is entered. This gates the UI only — it is not encryption.",
    confirm: "Protect file",
    icon: Lock,
  },
  unlock: {
    title: "Enter password",
    description: "This file is password protected.",
    confirm: "Unlock",
    icon: KeyRound,
  },
  remove: {
    title: "Remove password",
    description: "Enter the current password to remove protection.",
    confirm: "Remove password",
    icon: ShieldOff,
  },
};

export function BDFilePasswordDialog({
  open,
  mode,
  fileName,
  error,
  isLoading = false,
  onSubmit,
  onClose,
}: BDFilePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  // Reset the fields when the dialog opens or switches flow (render-time
  // adjustment — avoids setState-in-effect cascading renders).
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevMode, setPrevMode] = useState(mode);
  if (open !== prevOpen || mode !== prevMode) {
    setPrevOpen(open);
    setPrevMode(mode);
    if (open) {
      setPassword("");
      setConfirm("");
      setLocalError("");
    }
  }

  const copy = COPY[mode];
  const Icon = copy.icon;

  const submit = () => {
    if (!password) {
      setLocalError("Enter a password.");
      return;
    }
    if (mode === "protect" && password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError("");
    void onSubmit(password);
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={fileName}
      size="sm"
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton icon={Icon} isLoading={isLoading} onClick={submit}>
            {copy.confirm}
          </BDButton>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{copy.description}</p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        {mode === "protect" && (
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        )}
        {(localError || error) && (
          <p className="text-xs text-red-600">{localError || error}</p>
        )}
      </div>
    </BDModal>
  );
}

export default BDFilePasswordDialog;

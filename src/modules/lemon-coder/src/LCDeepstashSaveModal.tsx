// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCDeepstashSaveModal
// Push modal to save the current context stash as a deepstash.
// Supports three push modes:
//   - New:       create a brand-new deepstash with a name
//   - Override:  replace an existing deepstash entirely
//   - Overlap:   merge into an existing deepstash (keep existing items, add new)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Modal } from "@heroui/react";
import { Input } from "@/src/shadcnui/components/ui/input";
import { Label } from "@/src/shadcnui/components/ui/label";
import {
  Layers,
  Save,
  RefreshCw,
  Plus,
  FileText,
  Folder,
} from "lucide-react";
import { useState } from "react";
import type { LCDeepstash } from "./LCInterface";

export type LCDeepstashPushMode = "new" | "override" | "overlap";

export interface LCDeepstashPushAction {
  mode: LCDeepstashPushMode;
  /** For "new" — the name of the new deepstash */
  name?: string;
  /** For "override" / "overlap" — the id of the target deepstash */
  deepstashId?: string;
}

export interface LCDeepstashSaveModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing deepstashes for the current project */
  deepstashes: LCDeepstash[];
  /** Existing deepstash names (for duplicate detection) */
  existingNames: string[];
  onSave: (action: LCDeepstashPushAction) => void;
}

export default function LCDeepstashSaveModal({
  isOpen,
  onOpenChange,
  deepstashes,
  existingNames,
  onSave,
}: LCDeepstashSaveModalProps) {
  const [mode, setMode] = useState<LCDeepstashPushMode>("new");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (mode === "new") {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Name is required.");
        return;
      }
      if (existingNames.includes(trimmed)) {
        setError("A deepstash with this name already exists.");
        return;
      }
      onSave({ mode: "new", name: trimmed });
    } else if (mode === "override" || mode === "overlap") {
      if (!selectedId) {
        setError("Select a deepstash to continue.");
        return;
      }
      onSave({ mode, deepstashId: selectedId });
    }
    reset();
  };

  const reset = () => {
    setName("");
    setSelectedId(null);
    setError("");
    setMode("new");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
        <Modal.Dialog className="sm:max-w-[400px] bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <Save className="w-5 h-5 text-[#e5c07b]" />
              Push to Deepstash
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              {/* Mode tabs */}
              <div className="flex gap-1 bg-[#2a2a2a] rounded-lg p-0.5">
                {(["new", "override", "overlap"] as LCDeepstashPushMode[]).map((m) => (
                  <button
                    key={m}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-colors capitalize ${
                      mode === m
                        ? "bg-[#e5c07b] text-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                    onClick={() => {
                      setMode(m);
                      setError("");
                    }}
                  >
                    {m === "new" && <Plus className="w-3 h-3" />}
                    {m === "override" && <RefreshCw className="w-3 h-3" />}
                    {m === "overlap" && <Layers className="w-3 h-3" />}
                    {m}
                  </button>
                ))}
              </div>

              {/* Mode content */}
              {mode === "new" ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-gray-300">Deepstash Name</Label>
                  <Input
                    autoFocus
                    placeholder="e.g. Refactoring checkpoint..."
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    className="bg-[#333] border-[#555] text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400">
                    Creates a new deepstash with the current context stash.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-gray-300">
                    {mode === "override"
                      ? "Select deepstash to replace"
                      : "Select deepstash to merge into"}
                  </Label>
                  {deepstashes.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">
                      No deepstashes yet. Create one first with the "New" option.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {deepstashes.map((ds) => (
                        <div
                          key={ds.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                            selectedId === ds.id
                              ? "bg-[#e5c07b]/20 border border-[#e5c07b]/40"
                              : "hover:bg-[#333] border border-transparent"
                          }`}
                          onClick={() => {
                            setSelectedId(ds.id);
                            setError("");
                          }}
                        >
                          <Layers className="w-3 h-3 text-[#e5c07b] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-white truncate">{ds.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {formatDate(ds.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    {mode === "override"
                      ? "Replaces all items in the selected deepstash with the current stash."
                      : "Keeps existing items in the deepstash and adds new ones from the current stash."}
                  </p>
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              slot="close"
              variant="ghost"
              className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
            >
              Cancel
            </Button>
            <Button
              slot="close"
              onPress={handleSave}
              isDisabled={mode === "override" || mode === "overlap" ? !selectedId : !name.trim()}
              className="bg-[#e5c07b] text-black hover:bg-[#d1a85e] text-xs disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {mode === "new"
                ? "Create Deepstash"
                : mode === "override"
                  ? "Override Deepstash"
                  : "Overlap Deepstash"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCDeepstashPopModal
// Modal to select a saved deepstash and choose how to apply it:
// - "Override" — replace the entire current context stash with deepstash items
// - "Overlap" — keep matching items, add new ones (skip duplicates)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Modal } from "@heroui/react";
import {
  Layers,
  Download,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { LCDeepstash } from "./LCInterface";
import type { LCDeepstashMergeStrategy } from "./LCInterface";

export interface LCDeepstashPopModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deepstashes: LCDeepstash[];
  currentStashPaths: string[];
  onApply: (deepstash: LCDeepstash, strategy: LCDeepstashMergeStrategy) => void;
  onDeleteDeepstash: (id: string) => void;
}

export default function LCDeepstashPopModal({
  isOpen,
  onOpenChange,
  deepstashes,
  currentStashPaths,
  onApply,
  onDeleteDeepstash,
}: LCDeepstashPopModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<LCDeepstashMergeStrategy>("override");

  const selected = deepstashes.find((d) => d.id === selectedId);

  const handleApply = () => {
    if (!selected) return;
    onApply(selected, strategy);
    setSelectedId(null);
    setStrategy("override");
  };

  const handleClose = () => {
    setSelectedId(null);
    setStrategy("override");
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
        <Modal.Dialog className="sm:max-w-[420px] bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <Layers className="w-5 h-5 text-[#e5c07b]" />
              Apply Deepstash
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {deepstashes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Layers className="w-10 h-10 text-[#555] mb-3" />
                <p className="text-sm text-gray-400">No deepstashes saved yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Save your current context stash as a deepstash first.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Deepstash list */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {deepstashes.map((ds) => (
                    <div
                      key={ds.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded cursor-pointer text-xs transition-colors ${
                        selectedId === ds.id
                          ? "bg-[#e5c07b]/20 border border-[#e5c07b]/40"
                          : "hover:bg-[#333] border border-transparent"
                      }`}
                      onClick={() => setSelectedId(ds.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Layers className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white truncate">{ds.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {formatDate(ds.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDeleteDeepstash(ds.id);
                        }}
                        className="w-5 h-5 min-w-0 text-red-400 hover:bg-red-400/10 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Merge strategy selection */}
                {selected && (
                  <div className="flex flex-col gap-2 border-t border-[#333] pt-3">
                    <p className="text-xs text-gray-400">
                      How to merge &ldquo;{selected.name}&rdquo;?
                    </p>
                    <div className="flex gap-2">
                      <button
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs border transition-colors ${
                          strategy === "override"
                            ? "bg-[#e5c07b]/20 border-[#e5c07b]/40 text-white"
                            : "border-[#333] text-gray-400 hover:bg-[#333]"
                        }`}
                        onClick={() => setStrategy("override")}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Override
                      </button>
                      <button
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs border transition-colors ${
                          strategy === "overlap"
                            ? "bg-[#e5c07b]/20 border-[#e5c07b]/40 text-white"
                            : "border-[#333] text-gray-400 hover:bg-[#333]"
                        }`}
                        onClick={() => setStrategy("overlap")}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Overlap
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {strategy === "override"
                        ? "Replace the current context stash entirely with this deepstash."
                        : "Keep existing items and add new ones from the deepstash (skips duplicates)."}
                    </p>
                  </div>
                )}
              </div>
            )}
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
              isDisabled={!selected}
              onPress={handleApply}
              className="bg-[#e5c07b] text-black hover:bg-[#d1a85e] text-xs disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              {strategy === "override" ? "Override" : "Overlap"} Stash
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

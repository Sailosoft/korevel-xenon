"use client";

// BDSpecViewModal — read-only preview of a spec document's content, with the
// same export actions as the editor (markdown / HTML / open / copy).

import { Copy, Download, Globe } from "lucide-react";
import type { BDSpecRecord } from "../../BDDomain.Types";
import { toSpecHtml, toSpecMarkdown } from "./BDSpecExport";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDMarkdownView from "../../components/BDMarkdownView";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadText, openTextTab } from "../../BDDownload";

export interface BDSpecViewModalProps {
  open: boolean;
  onClose: () => void;
  record: BDSpecRecord | null;
}

export function BDSpecViewModal({ open, onClose, record }: BDSpecViewModalProps) {
  const { toast } = useBDToast();

  const handleCopy = async () => {
    if (!record) return;
    const ok = await copyText(toSpecMarkdown(record));
    toast({
      title: ok ? "Spec.md copied" : "Copy failed",
      status: ok ? "success" : "error",
    });
  };

  return (
    <BDModal
      open={open && record !== null}
      onClose={onClose}
      title={record?.name ?? "Document"}
      description="Read-only preview of the document content."
      size="xl"
      footer={
        <>
          <BDButton
            variant="secondary"
            icon={Globe}
            onClick={() => record && openTextTab(toSpecHtml(record))}
          >
            Open
          </BDButton>
          <BDButton
            variant="secondary"
            icon={Download}
            onClick={() =>
              record &&
              downloadText(`${record.slug}.md`, toSpecMarkdown(record), "text/markdown")
            }
          >
            Markdown
          </BDButton>
          <BDButton
            variant="secondary"
            icon={Download}
            onClick={() =>
              record &&
              downloadText(`${record.slug}.html`, toSpecHtml(record), "text/html")
            }
          >
            HTML
          </BDButton>
          <BDButton variant="secondary" icon={Copy} onClick={handleCopy}>
            Copy
          </BDButton>
        </>
      }
    >
      {record && (
        <div className="rounded-lg border border-slate-200 p-4">
          <BDMarkdownView content={toSpecMarkdown(record)} />
        </div>
      )}
    </BDModal>
  );
}

export default BDSpecViewModal;

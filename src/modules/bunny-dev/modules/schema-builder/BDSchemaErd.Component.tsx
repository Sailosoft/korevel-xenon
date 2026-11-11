"use client";

// BDSchemaErd.Component — read-only ERD viewer for one schema group.
//
// Renders the group's models as a Mermaid `erDiagram` through BDDiagramView.
// Zoom is relative to a fit-to-viewport baseline: **100% always fits the whole
// diagram inside the content box** (the baseline is computed from the painted
// SVG itself — scale-free — so it is exact for both tiny and huge diagrams),
// zoom in/out steps ±25%, and Fit recomputes the baseline. Grab-to-pan moves
// the diagram; exports go out as SVG / PNG / Mermaid source or persist the
// record to the Diagram Builder.
//
// The scaled diagram sits in a sized spacer (so scrollbars cover the whole
// zoomed area); grabbing pans by dragging the scroll position, which the
// browser clamps at the diagram edges.

import { useMemo, useRef, useState } from "react";
import { Copy, Database, Download, FileCode2, Save } from "lucide-react";
import type { BDSchemaGroup, BDSchemaModel } from "../../BDDomain.Types";
import { bdDiagramRepository } from "../diagram-builder/BDDiagram.Repository";
import {
  svgToPngBlob,
  toDiagramSvg,
} from "../diagram-builder/BDDiagramExport";
import { buildErdDiagramRecord, toErdMermaid } from "./BDErdExport";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import BDDiagramCanvas, {
  type BDDiagramCanvasHandle,
} from "../../components/BDDiagramCanvas";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadBlob, downloadText } from "../../BDDownload";

export interface BDSchemaErdComponentProps {
  open: boolean;
  onClose: () => void;
  /** Group shown in the title; `null` while none is active. */
  group: BDSchemaGroup | null;
  /** Models of that group. */
  models: BDSchemaModel[];
}

export function BDSchemaErdComponent({
  open,
  onClose,
  group,
  models,
}: BDSchemaErdComponentProps) {
  const { toast } = useBDToast();
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<BDDiagramCanvasHandle>(null);

  const source = useMemo(() => toErdMermaid(models), [models]);
  const hasModels = models.length > 0;

  const baseName = `${(group?.name ?? "schema")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "schema"}-erd`;

  const handleClose = () => {
    canvasRef.current?.fit();
    onClose();
  };

  const handleSave = async () => {
    if (!group || !hasModels) return;
    setSaving(true);
    try {
      await bdDiagramRepository.create(buildErdDiagramRecord(group, models));
      toast({ title: "Saved to Diagram Builder", status: "success" });
    } catch (err) {
      toast({
        title: "Could not save diagram",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(source);
    toast({
      title: ok ? "Copied to clipboard" : "Copy failed",
      status: ok ? "success" : "error",
    });
  };

  const handleSvg = () => {
    const svg = toDiagramSvg(canvasRef.current?.getPreviewNode() ?? null);
    if (!svg) {
      toast({ title: "Nothing to export yet", status: "warning" });
      return;
    }
    downloadText(`${baseName}.svg`, svg, "image/svg+xml");
  };

  const handlePng = async () => {
    const svg = toDiagramSvg(canvasRef.current?.getPreviewNode() ?? null);
    if (!svg) {
      toast({ title: "Nothing to export yet", status: "warning" });
      return;
    }
    try {
      const size = canvasRef.current?.getNaturalSize();
      const blob = await svgToPngBlob(svg, size ?? undefined);
      downloadBlob(`${baseName}.png`, blob);
    } catch (err) {
      toast({
        title: "PNG export failed",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    }
  };

  return (
    <BDModal
      open={open}
      onClose={handleClose}
      title={`ERD${group ? ` — ${group.name}` : ""}`}
      description={
        group?.description ||
        "Entity-relationship diagram for this schema group's models."
      }
      size="xl"
      bodyScroll={false}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <BDButton
            size="sm"
            icon={Save}
            onClick={handleSave}
            isLoading={saving}
            disabled={!hasModels}
          >
            Save to Diagram Builder
          </BDButton>
          <div className="flex items-center gap-2">
            <BDButton
              size="sm"
              variant="secondary"
              icon={Copy}
              onClick={handleCopy}
              disabled={!hasModels}
            >
              Copy
            </BDButton>
            <BDButton
              size="sm"
              variant="secondary"
              icon={FileCode2}
              onClick={() => downloadText(`${baseName}.mmd`, source)}
              disabled={!hasModels}
            >
              .mmd
            </BDButton>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={handleSvg}
              disabled={!hasModels}
            >
              SVG
            </BDButton>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={() => void handlePng()}
              disabled={!hasModels}
            >
              PNG
            </BDButton>
          </div>
        </div>
      }
    >
      {hasModels ? (
        <BDDiagramCanvas
          ref={canvasRef}
          chart={source}
          className="h-[70vh] min-h-[320px]"
          surfaceClassName=""
        />
      ) : (
        <BDEmptyState
          icon={Database}
          title="No models to diagram"
          description="Add at least one model to this group to generate its ERD."
        />
      )}
    </BDModal>
  );
}

export default BDSchemaErdComponent;

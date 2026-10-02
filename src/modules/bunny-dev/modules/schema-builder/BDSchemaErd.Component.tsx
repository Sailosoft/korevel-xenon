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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Database,
  Download,
  FileCode2,
  Maximize2,
  Save,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { BDSchemaGroup, BDSchemaModel } from "../../BDDomain.Types";
import { bdDiagramRepository } from "../diagram-builder/BDDiagram.Repository";
import { toDiagramSvg } from "../diagram-builder/BDDiagramExport";
import { buildErdDiagramRecord, toErdMermaid } from "./BDErdExport";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import BDDiagramView from "../../components/BDDiagramView";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadBlob, downloadText } from "../../BDDownload";

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
/**
 * Fit may shrink well below the user zoom floor — a huge diagram must still
 * fit the content box entirely at 100%.
 */
const MIN_FIT_SCALE = 0.02;
/** Height budget for fit — must mirror the scroller's `max-h-[65vh]` class. */
const VIEWPORT_HEIGHT_BUDGET = 0.65;
/** Mirrors the scroller's `min-h-[320px]` class (min beats max in CSS). */
const MIN_SCROLLER_HEIGHT = 320;

const clampZoom = (value: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

const clampFit = (value: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_FIT_SCALE, Math.round(value * 1000) / 1000));

export interface BDSchemaErdComponentProps {
  open: boolean;
  onClose: () => void;
  /** Group shown in the title; `null` while none is active. */
  group: BDSchemaGroup | null;
  /** Models of that group. */
  models: BDSchemaModel[];
}

/** Rasterize SVG markup to a PNG blob (2× scale, white background). */
async function svgToPng(
  svg: string,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<Blob> {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const numeric = (value: string | null): number => {
    if (!value) return NaN;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const viewBox = (root.getAttribute("viewBox") ?? "")
    .split(/[\s,]+/)
    .map((part) => parseFloat(part))
    .filter((part) => Number.isFinite(part));

  const width =
    numeric(root.getAttribute("width")) || viewBox[2] || fallbackWidth || 800;
  const height =
    numeric(root.getAttribute("height")) || viewBox[3] || fallbackHeight || 600;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load the SVG"));
      el.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("PNG encoding failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BDSchemaErdComponent({
  open,
  onClose,
  group,
  models,
}: BDSchemaErdComponentProps) {
  const { toast } = useBDToast();
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [fitScale, setFitScale] = useState(DEFAULT_ZOOM);
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Mirrors the committed scale so painted rects can be unscaled. */
  const effectiveScaleRef = useRef(DEFAULT_ZOOM);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  const source = useMemo(() => toErdMermaid(models), [models]);
  const hasModels = models.length > 0;
  /** Actual diagram scale — `zoom` is relative to this fit baseline (100%). */
  const effectiveScale = fitScale * zoom;

  const baseName = `${(group?.name ?? "schema")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "schema"}-erd`;

  /**
   * Scale that fits the whole diagram inside the content box — exact for big
   * diagrams (may go far below 1) and upscaled for small ones. Width budget is
   * the scroller's inner width; height budget mirrors its `max-h-[65vh]`
   * class (`VIEWPORT_HEIGHT_BUDGET`).
   */
  const computeFitScale = useCallback(
    (width: number, height: number): number | null => {
      const scroller = scrollRef.current;
      if (!scroller || width <= 0 || height <= 0) return null;
      const availWidth = scroller.clientWidth;
      const availHeight = Math.max(
        window.innerHeight * VIEWPORT_HEIGHT_BUDGET,
        MIN_SCROLLER_HEIGHT,
      );
      if (availWidth <= 0 || availHeight <= 0) return null;
      return clampFit(Math.min(availWidth / width, availHeight / height));
    },
    [],
  );

  /**
   * Natural (untransformed) size of the painted SVG — the authoritative
   * basis for fit. Wrapper layout can disagree with what Mermaid actually
   * paints (padding, `max-width` caps), so measure the SVG itself and divide
   * out the committed scale.
   */
  const readSvgNatural = useCallback((): {
    width: number;
    height: number;
  } | null => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = effectiveScaleRef.current || DEFAULT_ZOOM;
    const width = rect.width / scale;
    const height = rect.height / scale;
    return width > 0 && height > 0 ? { width, height } : null;
  }, []);

  // Mirror the committed scale before any measuring effect in the same commit
  // (effects run in declaration order).
  useEffect(() => {
    effectiveScaleRef.current = effectiveScale;
  }, [effectiveScale]);

  // Start every open from the top-left at 100% (fit); other state resets
  // happen in handleClose (event handlers, not effects).
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
  }, [open]);

  // Track the diagram's natural size for the spacer (`natural × fit × zoom`)
  // and keep the fit baseline exact — measured from the painted SVG once it
  // has replaced the "Rendering…" placeholder.
  useEffect(() => {
    const el = previewRef.current;
    if (!open || !hasModels || !el) return;
    const measure = () => {
      const svgNatural = readSvgNatural();
      if (!svgNatural) {
        // Placeholder only — keep its layout size until the SVG lands.
        setNatural({ width: el.offsetWidth, height: el.offsetHeight });
        return;
      }
      // Include the diagram frame (padding + border) in the scrollable size.
      const root = el.querySelector("svg")?.parentElement;
      const style = root ? getComputedStyle(root) : null;
      const px = (value: string | null) => (value ? parseFloat(value) || 0 : 0);
      const extraX = style
        ? px(style.paddingLeft) +
          px(style.paddingRight) +
          px(style.borderLeftWidth) +
          px(style.borderRightWidth)
        : 0;
      const extraY = style
        ? px(style.paddingTop) +
          px(style.paddingBottom) +
          px(style.borderTopWidth) +
          px(style.borderBottomWidth)
        : 0;
      setNatural({
        width: svgNatural.width + extraX,
        height: svgNatural.height + extraY,
      });
      const scale = computeFitScale(svgNatural.width, svgNatural.height);
      if (scale) setFitScale((prev) => (prev === scale ? prev : scale));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasModels, source, computeFitScale, readSvgNatural]);

  // Keep the fit baseline current when the window resizes while open.
  useEffect(() => {
    if (!open || !hasModels) return;
    const handleResize = () => {
      const size = readSvgNatural();
      if (!size) return;
      const scale = computeFitScale(size.width, size.height);
      if (scale) setFitScale((prev) => (prev === scale ? prev : scale));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, hasModels, computeFitScale, readSvgNatural]);

  const handleClose = () => {
    setZoom(DEFAULT_ZOOM);
    setFitScale(DEFAULT_ZOOM);
    setDragging(false);
    dragRef.current = null;
    setNatural({ width: 0, height: 0 });
    onClose();
  };

  const zoomIn = () => setZoom((value) => clampZoom(value + ZOOM_STEP));
  const zoomOut = () => setZoom((value) => clampZoom(value - ZOOM_STEP));

  // Back to 100%: re-measure the fit baseline, then scroll to the start.
  const fitView = () => {
    const size = readSvgNatural();
    if (size) {
      const scale = computeFitScale(size.width, size.height);
      if (scale) setFitScale(scale);
    }
    setZoom(DEFAULT_ZOOM);
    const scroller = scrollRef.current;
    if (scroller) {
      scroller.scrollLeft = 0;
      scroller.scrollTop = 0;
    }
  };

  // Grab-to-pan: drag moves the scroll position (browser clamps at the edges).
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasModels) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inScrollbar =
      event.clientX - rect.left >= el.clientWidth ||
      event.clientY - rect.top >= el.clientHeight;
    if (inScrollbar) return; // let the native scrollbar handle the drag

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    setDragging(true);
    el.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;
    el.scrollLeft = drag.left - (event.clientX - drag.x);
    el.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (scrollRef.current?.hasPointerCapture(event.pointerId)) {
      scrollRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handleLostCapture = () => {
    dragRef.current = null;
    setDragging(false);
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
    const svg = toDiagramSvg(previewRef.current);
    if (!svg) {
      toast({ title: "Nothing to export yet", status: "warning" });
      return;
    }
    downloadText(`${baseName}.svg`, svg, "image/svg+xml");
  };

  const handlePng = async () => {
    const svg = toDiagramSvg(previewRef.current);
    if (!svg) {
      toast({ title: "Nothing to export yet", status: "warning" });
      return;
    }
    try {
      const blob = await svgToPng(
        svg,
        natural.width || 800,
        natural.height || 600,
      );
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
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <BDButton
                size="sm"
                variant="ghost"
                icon={ZoomOut}
                onClick={zoomOut}
                aria-label="Zoom out"
                title="Zoom out"
              />
              <span
                className="w-12 text-center text-xs font-medium text-slate-500"
                title="100% = fit to the viewer"
              >
                {Math.round(zoom * 100)}%
              </span>
              <BDButton
                size="sm"
                variant="ghost"
                icon={ZoomIn}
                onClick={zoomIn}
                aria-label="Zoom in"
                title="Zoom in"
              />
              <BDButton
                size="sm"
                variant="ghost"
                icon={Maximize2}
                onClick={fitView}
                aria-label="Fit to view"
                title="Fit to view (100%)"
              >
                Fit
              </BDButton>
            </div>
            <p className="text-xs text-slate-400">Drag to pan</p>
          </div>

          <div
            ref={scrollRef}
            className={`bd-scroll flex max-h-[65vh] min-h-[320px] select-none overflow-auto rounded-lg border border-slate-200 bg-white [align-items:safe_center] [justify-content:safe_center] ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={handleLostCapture}
          >
            <div
              className="shrink-0"
              style={{
                width: natural.width ? natural.width * effectiveScale : undefined,
                height: natural.height
                  ? natural.height * effectiveScale
                  : undefined,
              }}
            >
              <div
                ref={previewRef}
                className="w-max"
                style={{
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: "top left",
                }}
              >
                <BDDiagramView chart={source} />
              </div>
            </div>
          </div>
        </>
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

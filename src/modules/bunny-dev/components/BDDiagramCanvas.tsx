"use client";

// BDDiagramCanvas — interactive Mermaid viewer (fit-to-viewport + pan/zoom).
//
// Wraps BDDiagramView in a scrollable viewport. Zoom is relative to a
// fit-to-viewport baseline: **100% always fits the whole diagram inside the
// content box** (the baseline is computed from the painted SVG itself —
// scale-free — so it is exact for both tiny and huge diagrams), zoom in/out
// steps ±25%, and Fit recomputes the baseline. Grab-to-pan moves the diagram.
//
// The scaled diagram sits in a sized spacer (so scrollbars cover the whole
// zoomed area); grabbing pans by dragging the scroll position, which the
// browser clamps at the diagram edges.
//
// The caller owns the height of the root column (e.g. `min-h-0 flex-1` inside a
// flex pane, or `h-full` inside a modal body). The scroller must therefore have
// a definite height for the fit baseline to be measured from `clientHeight`.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@heroui/react";
import BDDiagramView from "./BDDiagramView";
import BDButton from "./BDButton";

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
/**
 * Fit may shrink well below the user zoom floor — a huge diagram must still
 * fit the content box entirely at 100%.
 */
const MIN_FIT_SCALE = 0.02;

const clampZoom = (value: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

const clampFit = (value: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_FIT_SCALE, Math.round(value * 1000) / 1000));

export interface BDDiagramCanvasHandle {
  /** Unscaled node containing the rendered SVG (for `toDiagramSvg` export). */
  getPreviewNode(): HTMLElement | null;
  /** Natural (untransformed) diagram size in px, or null if not measured. */
  getNaturalSize(): { width: number; height: number } | null;
  /** Recompute the fit baseline, reset zoom to 100%, and scroll to origin. */
  fit(): void;
}

export interface BDDiagramCanvasProps {
  chart: string;
  /** Applied to the root column; the caller owns the height. */
  className?: string;
  /** Applied to BDDiagramView (default `bd-diagram-surface`). */
  surfaceClassName?: string;
  /** Show the zoom/fit toolbar. Defaults to true. */
  showToolbar?: boolean;
}

export const BDDiagramCanvas = forwardRef<
  BDDiagramCanvasHandle,
  BDDiagramCanvasProps
>(function BDDiagramCanvas(
  {
    chart,
    className,
    surfaceClassName = "bd-diagram-surface",
    showToolbar = true,
  },
  ref,
) {
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

  /** Actual diagram scale — `zoom` is relative to this fit baseline (100%). */
  const effectiveScale = fitScale * zoom;

  /**
   * Scale that fits the whole diagram inside the content box — exact for big
   * diagrams (may go far below 1) and upscaled for small ones. Budget is the
   * scroller's inner box; the caller guarantees a definite height.
   */
  const computeFitScale = useCallback(
    (width: number, height: number): number | null => {
      const scroller = scrollRef.current;
      if (!scroller || width <= 0 || height <= 0) return null;
      const availWidth = scroller.clientWidth;
      const availHeight = scroller.clientHeight;
      if (availWidth <= 0 || availHeight <= 0) return null;
      return clampFit(Math.min(availWidth / width, availHeight / height));
    },
    [],
  );

  /**
   * Natural (untransformed) size of the painted SVG — the authoritative basis
   * for fit. Wrapper layout can disagree with what Mermaid actually paints
   * (padding, `max-width` caps), so measure the SVG itself and divide out the
   * committed scale.
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

  // A new chart restarts at 100% (fit) from the top-left.
  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
    setFitScale(DEFAULT_ZOOM);
    setNatural({ width: 0, height: 0 });
    dragRef.current = null;
    setDragging(false);
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
  }, [chart]);

  // Track the diagram's natural size for the spacer (`natural × fit × zoom`)
  // and keep the fit baseline exact — measured from the painted SVG once it has
  // replaced the "Rendering…" placeholder.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
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
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [chart, computeFitScale, readSvgNatural]);

  const fitView = useCallback(() => {
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
  }, [computeFitScale, readSvgNatural]);

  useImperativeHandle(
    ref,
    () => ({
      getPreviewNode: () => previewRef.current,
      getNaturalSize: () => readSvgNatural(),
      fit: fitView,
    }),
    [fitView, readSvgNatural],
  );

  const zoomIn = () => setZoom((value) => clampZoom(value + ZOOM_STEP));
  const zoomOut = () => setZoom((value) => clampZoom(value - ZOOM_STEP));

  // Grab-to-pan: drag moves the scroll position (browser clamps at the edges).
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
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

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2">
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
      )}
      <div
        ref={scrollRef}
        className={cn(
          "bd-scroll flex min-h-0 flex-1 select-none overflow-auto rounded-lg border border-slate-200 bg-white [align-items:safe_center] [justify-content:safe_center]",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
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
            <BDDiagramView chart={chart} className={surfaceClassName} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default BDDiagramCanvas;

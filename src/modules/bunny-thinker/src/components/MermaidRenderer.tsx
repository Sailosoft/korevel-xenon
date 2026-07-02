"use client";

// MermaidRenderer.tsx
//
// A thin React wrapper around the modern mermaid library (v11+).
// Renders mermaid diagram source into an SVG/HTML element with
// pan (drag to move canvas), zoom in, zoom out, and fit-to-view.

import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ── Initialize mermaid once at module level ───────────────────────────────

let initialized = false;
function ensureInit() {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
    initialized = true;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface MermaidRendererProps {
  /** Mermaid diagram source code */
  chart: string;
  /** Optional CSS class name */
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// ── Component ─────────────────────────────────────────────────────────────

export default function MermaidRenderer({
  chart,
  className = "",
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  // ── Pan / Zoom state ────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Reset pan/zoom when the chart changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [chart]);

  // ── Mermaid render ──────────────────────────────────────────────────

  useEffect(() => {
    ensureInit();

    const id = ++renderIdRef.current;
    const renderId = `mermaid-${id}`;

    mermaid
      .render(renderId, chart)
      .then(({ svg }) => {
        if (id === renderIdRef.current) {
          setSvgContent(svg);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (id === renderIdRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setSvgContent(null);
        }
      });
  }, [chart]);

  // ── Pan handlers ────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: pan.x, y: pan.y };
    e.preventDefault();
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Zoom handlers ───────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const fitToView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  // ── Error state ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={`text-red-500 text-xs font-mono p-2 bg-red-50 rounded ${className}`}>
        <p className="font-semibold mb-1">Mermaid render error:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  // ── Rendered SVG with pan/zoom wrapper ──────────────────────────────

  if (svgContent) {
    return (
      <div className={`relative ${className}`}>
        {/* Toolbar */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <span className="text-[11px] font-mono text-gray-500 min-w-[36px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onClick={fitToView}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Reset view"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Pan / zoom viewport */}
        <div
          ref={containerRef}
          className="overflow-hidden border border-gray-200 rounded-lg bg-white cursor-grab active:cursor-grabbing"
          style={{ minHeight: 320, maxHeight: 600 }}
          onWheel={handleWheel}
        >
          <div
            ref={viewportRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isDragging.current ? "none" : "transform 0.1s ease",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`mermaid-renderer border border-gray-200 rounded-lg bg-white ${className}`}
      style={{ minHeight: 120 }}
    >
      <div className="flex items-center justify-center h-full py-8 text-gray-400 text-sm animate-pulse">
        Rendering diagram...
      </div>
    </div>
  );
}

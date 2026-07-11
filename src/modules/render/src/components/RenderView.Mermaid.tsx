"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Mermaid View Component
//
// Renders Mermaid diagram definitions into SVG using the mermaid library.
// Supports pan (drag), zoom in/out, and fit-to-view controls.
// ───────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ── Initialize mermaid once at module level ───────────────────────────────

let initialized = false;
function ensureInit() {
  if (typeof window === "undefined") return;
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

export default function MermaidRenderer({ chart, className = "" }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  // Pan / Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Touch state (mobile)
  const touchStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const lastTouchDistance = useRef(0);

  // Reset pan/zoom when the chart changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [chart]);

  // Mermaid render
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

  // Pan handlers
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

  // Zoom handlers
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

  // ── Error state ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`rm-mermaid-error ${className}`} style={{ color: "#e06c75", fontSize: "0.75rem", fontFamily: "monospace", padding: "0.5rem", background: "#3b1a1a", borderRadius: "8px" }}>
        <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Mermaid render error:</p>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{error}</pre>
      </div>
    );
  }

  // ── Rendered SVG with pan/zoom wrapper ──────────────────────────
  if (svgContent) {
    return (
      <div className={`rm-mermaid-wrapper ${className}`} style={{ position: "relative", width: "100%" }}>
        {/* Toolbar */}
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(4px)",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "0.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            style={{
              padding: "0.25rem",
              color: zoom >= MAX_ZOOM ? "#d1d5db" : "#4b5563",
              border: "none",
              background: "transparent",
              borderRadius: "4px",
              cursor: zoom >= MAX_ZOOM ? "not-allowed" : "pointer",
            }}
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <span
            style={{
              fontSize: "0.65rem",
              fontFamily: "monospace",
              color: "#6b7280",
              minWidth: "36px",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            style={{
              padding: "0.25rem",
              color: zoom <= MIN_ZOOM ? "#d1d5db" : "#4b5563",
              border: "none",
              background: "transparent",
              borderRadius: "4px",
              cursor: zoom <= MIN_ZOOM ? "not-allowed" : "pointer",
            }}
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <div style={{ width: "1px", height: "1rem", background: "#e5e7eb", margin: "0 0.125rem" }} />
          <button
            type="button"
            onClick={fitToView}
            style={{
              padding: "0.25rem",
              color: "#4b5563",
              border: "none",
              background: "transparent",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            title="Reset view"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Pan/zoom viewport */}
        <div
          ref={containerRef}
          style={{
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: isDragging.current ? "grabbing" : "grab",
            minHeight: 320,
            maxHeight: 600,
          }}
          onWheel={handleWheel}
        >
          <div
            ref={viewportRef}
            style={{
              touchAction: "none",
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

  // Loading state
  return (
    <div
      ref={containerRef}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#ffffff",
        minHeight: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        fontSize: "0.85rem",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
      className={className}
    >
      Rendering diagram...
    </div>
  );
}

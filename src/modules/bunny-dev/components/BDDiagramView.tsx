"use client";

// BDDiagramView — renders Mermaid source to SVG with a clean error surface.
//
// Pan/zoom is intentionally left to the Diagram Builder editor; this view is
// the read-only renderer used by previews, outlines, and architecture sections.

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "@heroui/react";

export interface BDDiagramViewProps {
  chart: string;
  className?: string;
}

let initialized = false;
function ensureInit() {
  if (typeof window === "undefined") return;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      suppressErrorRendering: true,
    });
    initialized = true;
  }
}

export function BDDiagramView({ chart, className }: BDDiagramViewProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    ensureInit();
    const id = ++renderIdRef.current;
    const renderId = `bd-mermaid-${id}`;

    void (async () => {
      try {
        const parseResult = await mermaid.parse(chart, {
          suppressErrors: true,
        });
        if (id !== renderIdRef.current) return;

        if (parseResult === false) {
          setError("Invalid Mermaid diagram definition.");
          setSvg(null);
          return;
        }

        const { svg: output } = await mermaid.render(renderId, chart);
        if (id !== renderIdRef.current) return;

        const hasSyntaxError =
          output.includes('class="error-text"') ||
          output.includes("Syntax error in text");

        if (hasSyntaxError) {
          setError("Syntax error in diagram definition.");
          setSvg(null);
        } else {
          setSvg(output);
          setError(null);
        }
      } catch (err) {
        if (id === renderIdRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setSvg(null);
        }
      }
    })();
  }, [chart]);

  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg bg-red-50 p-3 text-xs text-red-600",
          className,
        )}
      >
        <p className="font-semibold">Diagram render error</p>
        <pre className="mt-1 whitespace-pre-wrap font-mono">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400",
          className,
        )}
      >
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bd-scroll overflow-auto rounded-lg border border-slate-200 bg-white p-4",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default BDDiagramView;

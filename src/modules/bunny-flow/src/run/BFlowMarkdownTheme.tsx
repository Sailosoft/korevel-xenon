// ───────────────────────────────────────────────────────────────────────────────
// BFlow — Shared Markdown Theme for RenderView
//
// A light, HeroUI-compatible markdown theme used by all Bunny Flow modals that
// render step/report output.  The palette is intentionally neutral so it blends
// into the existing BFlow surfaces (modals, cards, panels) without clashing
// with their default-100/default-200 backgrounds.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useRef, useCallback } from "react";
import type { Components } from "react-markdown";
import type { RenderTableColors } from "@/src/modules/render";

export const bflowTableColors: RenderTableColors = {
  headerBackground: "#f3f4f6",
  headerColor: "#111827",
  border: "#e5e7eb",
  cellColor: "#4b5563",
  rowAlternateBackground: "#fafafa",
};

const bflowMarkdownComponentsBase: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} style={{
      fontSize: "1.35rem",
      fontWeight: 700,
      color: "#111827",
      marginTop: "1.25rem",
      marginBottom: "0.75rem",
      paddingBottom: "0.25rem",
      borderBottom: "1px solid #e5e7eb",
    }}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} style={{ fontSize: "1.15rem", fontWeight: 700, color: "#111827", marginTop: "1rem", marginBottom: "0.5rem" }}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1f2937", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p {...props} style={{ margin: "0.5rem 0", color: "#4b5563", lineHeight: 1.7 }}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} style={{ listStyle: "disc", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#4b5563" }}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} style={{ listStyle: "decimal", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#4b5563" }}>{children}</ol>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code {...props} style={{
        background: "#f3f4f6",
        color: "#be123c",
        padding: "0.125rem 0.375rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}>
        {children}
      </code>
    ) : (
      <code {...props} style={{
        display: "block",
        background: "#fafafa",
        color: "#1f2937",
        padding: "0.75rem",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        overflowX: "auto",
        margin: "0.75rem 0",
        border: "1px solid #e5e7eb",
      }}>
        {children}
      </code>
    );
  },
};

function BFlowPreWithCopy({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (preRef.current) {
      const text = preRef.current.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard write failed — silently ignore
      }
    }
  }, []);

  return (
    <div style={{ position: "relative", margin: "0.75rem 0" }}>
      <button
        onClick={handleCopy}
        title="Copy code block"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          zIndex: 1,
          background: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderRadius: "4px",
          color: copied ? "#16a34a" : "#6b7280",
          padding: "0.2rem 0.5rem",
          fontSize: "0.7rem",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          cursor: "pointer",
          opacity: 0.6,
          transition: "opacity 0.15s, color 0.15s",
          lineHeight: 1.4,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre
        ref={preRef}
        {...props}
        style={{ background: "transparent", padding: 0, margin: 0, overflowX: "auto" }}
      >
        {children}
      </pre>
    </div>
  );
}

export const bflowMarkdownComponents: Components = {
  ...bflowMarkdownComponentsBase,
  pre: BFlowPreWithCopy,
  blockquote: ({ children, ...props }) => (
    <blockquote {...props} style={{
      borderLeft: "4px solid #a855f7",
      paddingLeft: "1rem",
      margin: "0.75rem 0",
      fontStyle: "italic",
      color: "#6b7280",
    }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }) => (
    <a href={href} {...props} style={{ color: "#7c3aed", textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: (props) => <hr {...props} style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "1rem 0" }} />,
  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
      <table {...props} style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th {...props} style={{
      border: "1px solid #e5e7eb",
      background: "#f3f4f6",
      color: "#111827",
      padding: "0.375rem 0.75rem",
      fontWeight: 600,
      textAlign: "left",
    }}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} style={{ border: "1px solid #e5e7eb", padding: "0.375rem 0.75rem", color: "#4b5563" }}>{children}</td>
  ),
};

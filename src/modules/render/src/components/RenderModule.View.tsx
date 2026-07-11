"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — React View Component
//
// The primary React component for rendering content in interactive views.
// It auto-selects the appropriate rendering strategy based on the format.
//
// Supports all built-in formats:
//   - markdown  → Renders with react-markdown (or fallback HTML)
//   - mermaid   → Renders with MermaidRenderer component
//   - csv       → Renders as an HTML table
//   - tailwind  → Renders in a sandboxed iframe with Tailwind CDN
//   - html      → Renders in a sandboxed iframe via blob URL
//   - plain     → Renders as plain, monospaced text
//   - json      → Renders as syntax-highlighted code
//
// Extensibility: new formats can be added by:
//   1. Creating a RenderAdapter implementation
//   2. Registering it with RenderRegistry
//   3. Adding a rendering case in the switch below (if React rendering differs)
// ───────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidRenderer from "./RenderView.Mermaid";
import type { RenderViewProps } from "../RenderModule.Types";

// ── Styles ──────────────────────────────────────────────────────────────────

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 120,
  color: "#858585",
  fontSize: "0.8rem",
  animation: "pulse 1.5s ease-in-out infinite",
};

const emptyStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
  color: "#858585",
  fontSize: "0.8rem",
};

const scrollableStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "#555 transparent",
};

// ── HTML Iframe Component ───────────────────────────────────────────────────

function HtmlIframeView({ content }: { content: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([content], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [content]);

  return (
    <div className="rm-html-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.25rem 0.75rem",
          background: "#1e2d1e",
          borderBottom: "1px solid #333333",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#98c379", fontSize: "0.6rem" }}>{"\u25CF"}</span>
        <span style={{ fontSize: "0.7rem", color: "#858585" }}>
          HTML preview &mdash; rendered in an isolated iframe
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {url ? (
          <iframe
            src={url}
            style={{ width: "100%", height: "100%", border: 0 }}
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div style={emptyStyle}>Preparing preview...</div>
        )}
      </div>
    </div>
  );
}

// ── Tailwind Iframe Component ───────────────────────────────────────────────

function TailwindIframeView({ content }: { content: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const doc = [
      `<!DOCTYPE html>`,
      `<html lang="en">`,
      `<head>`,
      `  <meta charset="UTF-8" />`,
      `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
      `  <script src="https://cdn.tailwindcss.com"></script>`,
      `</head>`,
      `<body>${content}</body>`,
      `</html>`,
    ].join("\n");

    const blob = new Blob([doc], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [content]);

  return (
    <div className="rm-tailwind-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.25rem 0.75rem",
          background: "#1e2d1e",
          borderBottom: "1px solid #333333",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#61afef", fontSize: "0.6rem" }}>{"\u25CF"}</span>
        <span style={{ fontSize: "0.7rem", color: "#858585" }}>
          Tailwind preview &mdash; rendered with Tailwind CDN
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {url ? (
          <iframe
            src={url}
            style={{ width: "100%", height: "100%", border: 0 }}
            title="Tailwind Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div style={emptyStyle}>Preparing Tailwind preview...</div>
        )}
      </div>
    </div>
  );
}

// ── Markdown View ───────────────────────────────────────────────────────────

import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} style={{
      fontSize: "1.25rem",
      fontWeight: 700,
      color: "#e5c07b",
      marginTop: "1.5rem",
      marginBottom: "0.75rem",
      paddingBottom: "0.25rem",
      borderBottom: "1px solid #333333",
    }}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e5c07b", marginTop: "1.25rem", marginBottom: "0.5rem" }}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} style={{ fontSize: "1rem", fontWeight: 600, color: "#d4d4d4", marginTop: "1rem", marginBottom: "0.25rem" }}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} style={{ fontSize: "0.9rem", fontWeight: 600, color: "#d4d4d4", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p {...props} style={{ margin: "0.5rem 0", color: "#d4d4d4", lineHeight: 1.7 }}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} style={{ listStyle: "disc", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#d4d4d4" }}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} style={{ listStyle: "decimal", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#d4d4d4" }}>{children}</ol>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code {...props} style={{
        background: "#2d2d2d",
        color: "#e06c75",
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
        background: "#1a1a1a",
        color: "#abb2bf",
        padding: "0.75rem",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        overflowX: "auto",
        margin: "0.75rem 0",
        border: "1px solid #333333",
      }}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre {...props} style={{ background: "transparent", padding: 0, margin: 0, overflowX: "auto" }}>{children}</pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote {...props} style={{
      borderLeft: "4px solid #e5c07b",
      paddingLeft: "1rem",
      margin: "0.75rem 0",
      fontStyle: "italic",
      color: "#858585",
    }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }) => (
    <a href={href} {...props} style={{ color: "#61afef", textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: (props) => <hr {...props} style={{ border: "none", borderTop: "1px solid #333333", margin: "1rem 0" }} />,
  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
      <table {...props} style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th {...props} style={{
      border: "1px solid #333333",
      background: "#2d2d2d",
      color: "#e5c07b",
      padding: "0.375rem 0.75rem",
      fontWeight: 600,
      textAlign: "left",
    }}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} style={{ border: "1px solid #333333", padding: "0.375rem 0.75rem", color: "#d4d4d4" }}>{children}</td>
  ),
};

// ── JSON View ───────────────────────────────────────────────────────────────

function JsonView({ content }: { content: string }) {
  let formatted: string;
  let valid = true;
  let error: string | undefined;

  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch (err) {
    valid = false;
    error = err instanceof Error ? err.message : String(err);
    formatted = content;
  }

  const highlighted = formatted
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span style="color:#e06c75;">$1</span><span style="color:#858585;">:</span>',
    )
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span style="color:#98c379;">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#56b6c2;">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:#858585;">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color:#d19a66;">$1</span>');

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {!valid && error && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "#3b1a1a",
            color: "#e06c75",
            fontSize: "0.75rem",
            borderBottom: "1px solid #5c2a2a",
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          Invalid JSON: {error}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "1rem",
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
          fontSize: "0.8rem",
          lineHeight: 1.6,
          overflow: "auto",
          flex: 1,
        }}
      >
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ── CSV View ────────────────────────────────────────────────────────────────

function CsvView({ content }: { content: string }) {
  const { headers, rows } = useMemo(() => {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };

    const hdrs = parseCsvLine(lines[0]);
    const rws = lines.slice(1).map((line) => parseCsvLine(line));
    return { headers: hdrs, rows: rws };
  }, [content]);

  if (headers.length === 0) {
    return <div style={emptyStyle}>No data</div>;
  }

  return (
    <div style={{ overflow: "auto", padding: "0.5rem", flex: 1 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.85rem",
        }}
      >
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                style={{
                  background: "#2d2d2d",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: 600,
                  border: "1px solid #444444",
                  color: "#e5c07b",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : "#1a1a1a" }}>
              {Array.from({ length: Math.max(row.length, headers.length) }).map((_, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "0.4rem 0.75rem",
                    border: "1px solid #444444",
                    color: "#d4d4d4",
                  }}
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Main RenderView Component ───────────────────────────────────────────────

/**
 * RenderView — the primary React component for rendering content.
 *
 * Automatically selects the rendering strategy based on the `format` prop.
 *
 * @example
 * ```tsx
 * <RenderView format="markdown" content="# Hello World" />
 * <RenderView format="mermaid" content="graph TD; A-->B;" />
 * <RenderView format="csv" content="Name,Age\nAlice,30" />
 * ```
 */
export default function RenderView({
  format,
  content,
  className = "",
  options,
  fallback,
}: RenderViewProps) {
  if (!content?.trim()) {
    return fallback ?? <div style={emptyStyle}>No content to render</div>;
  }

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    ...(options?.maxHeight ? { maxHeight: options.maxHeight } : {}),
  };

  const renderContent = () => {
    switch (format) {
      // ── Markdown ────────────────────────────────────────────────
      case "markdown":
        return (
          <div style={scrollableStyle} className={className}>
            <div style={{ padding: "1.5rem", color: "#d4d4d4", fontSize: "0.85rem", lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        );

      // ── Mermaid ─────────────────────────────────────────────────
      case "mermaid":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "1rem",
              overflow: "auto",
              flex: 1,
            }}
            className={className}
          >
            <MermaidRenderer chart={content} />
          </div>
        );

      // ── CSV ─────────────────────────────────────────────────────
      case "csv":
        return <CsvView content={content} />;

      // ── HTML ────────────────────────────────────────────────────
      case "html":
        return <HtmlIframeView content={content} />;

      // ── Tailwind ────────────────────────────────────────────────
      case "tailwind":
        return <TailwindIframeView content={content} />;

      // ── Plain Text ──────────────────────────────────────────────
      case "plain":
        return (
          <pre
            style={{
              margin: 0,
              padding: "1rem",
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
              fontSize: "0.85rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "auto",
              flex: 1,
            }}
            className={className}
          >
            {content}
          </pre>
        );

      // ── JSON ────────────────────────────────────────────────────
      case "json":
        return <JsonView content={content} />;

      // ── Unknown format ──────────────────────────────────────────
      default:
        return (
          fallback ?? (
            <div style={emptyStyle}>
              No renderer available for format &ldquo;{format}&rdquo;
            </div>
          )
        );
    }
  };

  return <div style={containerStyle} className={className}>{renderContent()}</div>;
}

// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Flowchart Text Model
//
// A line-oriented parser/serializer for mermaid flowchart/graph source that
// preserves unknown statements verbatim. Used by the Visual and Layout edit
// panes of the Mermaid display-mode editor.
//
//   • Node definitions:  A[label]  A(label)  A{label}  A([label])  A[[label]]
//                        A[(label)]  A((label))  A>label]
//   • Edges:  A --> B   A -->|label| B   A -- text --> B   A --- B
//             A -.-> B   A ==> B   (supports chained: A --> B --> C)
//   • Everything else (classDef, style, click, linkStyle, direction, %% 
//     comments, subgraph lines…) is preserved verbatim.
//
// Mutations edit source lines in place rather than regenerating the file, so
// fidelity is kept for anything the parser does not understand.
// ───────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShapeKind =
  | "rect" //  A[...]
  | "round" // A(...)
  | "diamond" // A{...}
  | "stadium" // A([...])
  | "subroutine" // A[[...]]
  | "cylinder" // A[(...)]
  | "circle" // A((...))
  | "async" // A>...]
  | "plain"; // A

/** A parsed node token found somewhere in a line. */
export interface FlowNodeToken {
  kind: "node";
  id: string;
  shape: ShapeKind;
  label: string;
  start: number;
  end: number;
  raw: string;
}

/** A parsed edge-arrow token. */
export interface FlowEdgeToken {
  kind: "edge";
  from: string;
  to: string;
  arrowType: "solid" | "dotted" | "thick" | "link" | "text";
  label: string | null;
  start: number;
  end: number;
  raw: string;
}

export type FlowToken = FlowNodeToken | FlowEdgeToken;

/** One parsed line of the document. */
export interface FlowLine {
  index: number; // index within the document lines array
  raw: string;
  kind: "node" | "chain" | "other";
  tokens: FlowToken[];
  isDefinition?: boolean;
}

/** Layout metadata persisted as a `%% lc-layout:{json}` comment line. */
export interface FlowLayoutData {
  v: number;
  positions: Record<string, [number, number]>;
}

export interface FlowNodeInfo {
  id: string;
  shape: ShapeKind;
  label: string;
  lineIndex: number;
  tokenIndex: number;
}

export interface FlowEdgeInfo {
  from: string;
  to: string;
  arrowType: "solid" | "dotted" | "thick" | "link" | "text";
  label: string | null;
  lineIndex: number;
  tokenIndex: number; // token index of the *edge* in the chain
}

export interface FlowDocument {
  lines: string[];
  eol: "\n" | "\r\n";
  headerDirection: "TB" | "TD" | "BT" | "LR" | "RL" | null;
  isFlowchart: boolean;
  nodes: Map<string, FlowNodeInfo>;
  nodesOrdered: string[];
  edges: FlowEdgeInfo[];
  parsed: FlowLine[];
  layout: FlowLayoutData | null;
  layoutLineIndex: number | null;
}

export interface MutationResult {
  doc: FlowDocument;
  content: string;
  removedNodes: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const LAYOUT_MARKER = "lc-layout:";

const SHAPE_OPENERS: ReadonlyArray<{
  open: string;
  close: string;
  shape: ShapeKind;
}> = [
  { open: "[[", close: "]]", shape: "subroutine" },
  { open: "[(", close: ")]", shape: "cylinder" },
  { open: "((", close: "))", shape: "circle" },
  { open: "([", close: "])", shape: "stadium" },
  { open: "{", close: "}", shape: "diamond" },
  { open: "[", close: "]", shape: "rect" },
  { open: "(", close: ")", shape: "round" },
  { open: ">", close: "]", shape: "async" },
];

const ID_RE = /[A-Za-z0-9_][\w\-.]*/;

// ── Low-level token readers ──────────────────────────────────────────────────

/**
 * Match a node id + optional shape at `pos` inside `text`.
 * Returns the matched token or null.
 */
export function readNodeToken(text: string, pos: number): FlowNodeToken | null {
  const slice = text.slice(pos);
  const idMatch = slice.match(ID_RE);
  if (!idMatch || idMatch.index !== 0) return null;
  const id = idMatch[0];
  let cursor = pos + id.length;

  let shape: ShapeKind = "plain";
  let label = id;

  // Leading whitespace between id and shape (e.g. "A [label]") is tolerated.
  let wsStart = cursor;
  while (wsStart < text.length && /\s/.test(text[wsStart])) wsStart++;

  for (const s of SHAPE_OPENERS) {
    if (!text.startsWith(s.open, wsStart)) continue;
    const innerStart = wsStart + s.open.length;
    const innerEnd = findClosing(text, innerStart, s.close);
    if (innerEnd >= 0) {
      shape = s.shape;
      label = stripQuotes(text.slice(innerStart, innerEnd).trim());
      cursor = innerEnd + s.close.length;
      break;
    }
  }

  return {
    kind: "node",
    id,
    shape,
    label,
    start: pos,
    end: cursor,
    raw: text.slice(pos, cursor),
  };
}

/** Find the position of `close` after `from`, skipping quoted segments. */
function findClosing(text: string, from: number, close: string): number {
  let i = from;
  let quote: string | null = null;
  const closeFirst = close[0];
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\" && text[i + 1] === quote) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === closeFirst && text.startsWith(close, i)) return i;
    i++;
  }
  return -1;
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' || first === "'" || first === "`") && last === first) {
      return s.slice(1, -1);
    }
  }
  return s;
}

const EDGE_RES: ReadonlyArray<{
  re: RegExp;
  type: "solid" | "dotted" | "thick" | "link" | "text";
}> = [
  { re: /^-->/, type: "solid" },
  { re: /^--\s+([^>]+?)\s*-->/, type: "text" },
  { re: /^---/, type: "link" },
  { re: /^-.->/, type: "dotted" },
  { re: /^-\.-/, type: "dotted" },
  { re: /^==>/, type: "thick" },
  { re: /^==\s+([^>]+?)\s*==>/, type: "thick" },
  { re: /^===/, type: "thick" },
];

/** Match an edge/arrow token at `pos`, returning raw + type + label, or null. */
function readEdgeToken(
  text: string,
  pos: number,
): { raw: string; type: FlowEdgeToken["arrowType"]; label: string | null } | null {
  const slice = text.slice(pos);
  for (const e of EDGE_RES) {
    const m = slice.match(e.re);
    if (m && m.index === 0) {
      let label: string | null = null;
      let end = pos + m[0].length;
      if (e.type === "text") {
        label = stripQuotes(m[1].trim());
      } else {
        // Inline pipe label: -->|x|
        const pipe = slice.match(
          /^-->\s*\|([^|]*)\||^[-.]-->\s*\|([^|]*)\||^[-.]->\s*\|([^|]*)\||^=>\s*\|([^|]*)\|/,
        );
        if (pipe) {
          const inner = pipe[1] ?? pipe[2] ?? pipe[3] ?? pipe[4];
          if (inner !== undefined) {
            label = stripQuotes(inner.trim());
            end += pipe[0].length - m[0].length;
          }
        }
      }
      // Fallback: trailing pipe-label for solid/dotted/thick arrows whose
      // opening pattern may vary (e.g. "---", "-.->"). The main regex above
      // is authoritative; this covers the remaining spacing variants.
      if (label === null) {
        const rest = text.slice(end);
        const pipeMatch = rest.match(/^(\s*)\|([^|]*)\|/);
        if (pipeMatch) {
          label = stripQuotes(pipeMatch[2].trim());
          end += pipeMatch[0].length;
        }
      }
      return { raw: text.slice(pos, end), type: e.type, label };
    }
  }
  return null;
}

// ── Document parse ───────────────────────────────────────────────────────────

/**
 * Parse mermaid source into a FlowDocument. Unknown statements are preserved
 * in `lines` and marked `kind: "other"`.
 */
export function parseFlowDoc(content: string): FlowDocument {
  const eol: "\n" | "\r\n" = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const nodes = new Map<string, FlowNodeInfo>();
  const nodesOrdered: string[] = [];
  const edges: FlowEdgeInfo[] = [];
  const parsed: FlowLine[] = [];

  let headerDirection: "TB" | "TD" | "BT" | "LR" | "RL" | null = null;
  let isFlowchart = false;
  let layout: FlowLayoutData | null = null;
  let layoutLineIndex: number | null = null;

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      parsed.push({ index: li, raw: rawLine, kind: "other", tokens: [] });
      continue;
    }

    // Layout metadata line.
    const layoutMatch = rawLine.match(/^\s*%%\s*lc-layout:\s*(\{.*\})\s*$/);
    if (layoutMatch) {
      try {
        const parsedLayout = JSON.parse(layoutMatch[1]) as FlowLayoutData;
        if (parsedLayout && typeof parsedLayout.positions === "object") {
          layout = parsedLayout;
          layoutLineIndex = li;
          parsed.push({ index: li, raw: rawLine, kind: "other", tokens: [] });
          continue;
        }
      } catch {
        // Invalid JSON — fall through to normal comment handling below.
      }
    }

    // Header detection: `flowchart|graph <DIR>`.
    const headMatch = trimmed.match(
      /^(flowchart|graph)\s+((TB|TD|BT|LR|RL))?$/i,
    );
    if (headMatch) {
      isFlowchart = true;
      headerDirection = (headMatch[2] as "TB" | "TD" | "BT" | "LR" | "RL") ?? null;
      parsed.push({ index: li, raw: rawLine, kind: "other", tokens: [] });
      continue;
    }

    // Words that are never part of a node/edge chain.
    const otherKeyword =
      /^\s*(classDef|style\b|click\b|linkStyle\b|direction\b|subgraph\b|end\b|accTitle|accDescr|%%|#)/.test(
        trimmed,
      );
    if (otherKeyword) {
      parsed.push({ index: li, raw: rawLine, kind: "other", tokens: [] });
      continue;
    }

    const tokens = tokenizeLine(rawLine);
    if (!tokens) {
      parsed.push({ index: li, raw: rawLine, kind: "other", tokens: [] });
      continue;
    }

    const nodeTokens = tokens.filter(
      (t): t is FlowNodeToken => t.kind === "node",
    );
    const edgeTokens = tokens.filter(
      (t): t is FlowEdgeToken => t.kind === "edge",
    );

    for (const nt of nodeTokens) {
      const existing = nodes.get(nt.id);
      if (!existing) {
        nodesOrdered.push(nt.id);
        nodes.set(nt.id, {
          id: nt.id,
          shape: nt.shape,
          label: nt.label,
          lineIndex: li,
          tokenIndex: tokens.indexOf(nt),
        });
      } else if (nt.shape !== "plain") {
        existing.shape = nt.shape;
        existing.label = nt.label;
      }
    }

    if (edgeTokens.length > 0) {
      for (const et of edgeTokens) {
        edges.push({
          from: et.from,
          to: et.to,
          arrowType: et.arrowType,
          label: et.label,
          lineIndex: li,
          tokenIndex: tokens.indexOf(et),
        });
      }
      parsed.push({ index: li, raw: rawLine, kind: "chain", tokens });
    } else {
      parsed.push({
        index: li,
        raw: rawLine,
        kind: "node",
        tokens,
        isDefinition: nodeTokens.length === 1,
      });
    }
  }

  return {
    lines,
    eol,
    headerDirection,
    isFlowchart,
    nodes,
    nodesOrdered,
    edges,
    parsed,
    layout,
    layoutLineIndex,
  };
}

/**
 * Tokenize one source line into alternating node/edge tokens.
 * Returns null when the line cannot be fully parsed (it is preserved).
 */
export function tokenizeLine(rawLine: string): FlowToken[] | null {
  const text = rawLine.trimEnd();
  const tokens: FlowToken[] = [];
  let pos = 0;

  const skipWs = () => {
    while (pos < text.length && /\s/.test(text[pos])) pos++;
  };
  skipWs();
  if (pos >= text.length) return null;

  // Read a node, then an optional edge + node, repeatedly.
  const readNode = () => {
    const nt = readNodeToken(text, pos);
    if (!nt) return false;
    pos = nt.end;
    if (text.startsWith(":::", pos)) {
      const cls = text.slice(pos).match(/^:::[A-Za-z0-9_]*(?=\s|$)/);
      if (cls) pos += cls[0].length;
    }
    tokens.push(nt);
    return true;
  };

  if (!readNode()) return null;
  skipWs();

  while (pos < text.length) {
    const et = readEdgeToken(text, pos);
    if (et === null) return null;
    const edgeStart = pos;
    tokens.push({
      kind: "edge",
      from: (tokens[tokens.length - 1] as FlowNodeToken).id,
      to: "",
      arrowType: et.type,
      label: et.label,
      start: edgeStart,
      end: edgeStart + et.raw.length,
      raw: et.raw,
    });
    pos += et.raw.length;
    skipWs();
    const toStart = pos;
    if (!readNode()) return null;
    const toTok = tokens[tokens.length - 1] as FlowNodeToken;
    (tokens[tokens.length - 2] as FlowEdgeToken).to = toTok.id;
    (tokens[tokens.length - 2] as FlowEdgeToken).end = toTok.end;
    void toStart;
    skipWs();
  }

  return tokens;
}

// ── Serialization helpers ────────────────────────────────────────────────────

export function serializeFlowDoc(doc: FlowDocument): string {
  return doc.lines.join(doc.eol);
}

function rebuildTokenText(tokens: FlowToken[]): string {
  return tokens
    .filter((t) => t.raw)
    .map((t) => {
      const r = t.raw.trim();
      return r;
    })
    .join(" ");
}

/**
 * Cut tokens at a set of token indices, returning rebuilt lines.
 * Removing a node also cuts its directly-adjacent edges; removing an edge
 * simply splits the chain (its endpoint nodes stay, as separate segments).
 */
function cutTokens(
  tokens: FlowToken[],
  removed: ReadonlySet<number>,
): string[] {
  const segments: FlowToken[][] = [];
  let seg: FlowToken[] = [];

  const flush = () => {
    if (seg.length > 0) segments.push([...seg]);
    seg = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (removed.has(i)) {
      if (t.kind === "node") {
        // Drop a trailing edge in seg that points at this node.
        const last = seg[seg.length - 1];
        if (last && last.kind === "edge" && (last.to === t.id || last.from === t.id)) {
          seg.pop();
        }
        flush();
        // Skip a directly-following edge that leaves this node.
        const nxt = i + 1 < tokens.length ? tokens[i + 1] : null;
        if (nxt && nxt.kind === "edge" && (nxt.from === t.id || nxt.to === t.id)) {
          i++;
        }
      } else {
        // Edge removed — split the chain here; keep endpoint nodes.
        flush();
      }
      continue;
    }
    seg.push(t);
  }
  flush();

  return segments
    .map((segTokens) => {
      // Fold adjacent edge+edge (should not happen) by dropping duplicates.
      const result: FlowToken[] = [];
      for (const tok of segTokens) {
        const prev = result[result.length - 1];
        if (tok.kind === "edge" && prev && prev.kind === "edge") continue;
        result.push(tok);
      }
      return rebuildTokenText(result);
    })
    .filter((s) => s.length > 0);
}

// ── Mutations ────────────────────────────────────────────────────────────────

function replacedDoc(doc: FlowDocument, lines: string[]): MutationResult {
  const ndoc = parseFlowDoc(lines.join(doc.eol));
  return { doc: ndoc, content: lines.join(doc.eol), removedNodes: [] };
}

/** Insert/refresh the `%% lc-layout` line. Locates it by pattern so line
 *  indices that shifted during mutation do not matter. */
function applyLayout(doc: FlowDocument, lines: string[]): string[] {
  const out = [...lines];
  const hasPositions =
    doc.layout !== null && Object.keys(doc.layout.positions).length > 0;
  const existingIdx = out.findIndex((l) =>
    /^\s*%%\s*lc-layout:\s*\{/.test(l),
  );
  if (existingIdx >= 0) {
    if (hasPositions && doc.layout) {
      out[existingIdx] = buildLayoutLine(doc.layout);
    } else {
      out.splice(existingIdx, 1);
    }
  } else if (hasPositions && doc.layout) {
    out.push(buildLayoutLine(doc.layout));
  }
  return out;
}

export function buildLayoutLine(layout: FlowLayoutData): string {
  return `%% ${LAYOUT_MARKER}${JSON.stringify(layout)}`;
}

/**
 * Set a node's label by rewriting the node token in place. If the node is
 * currently plain, it becomes `id[label]`.
 */
export function setNodeLabel(doc: FlowDocument, id: string, label: string): MutationResult {
  const info = doc.nodes.get(id);
  if (!info) return { doc, content: serializeFlowDoc(doc), removedNodes: [] };

  const lines = [...doc.lines];
  const lineRaw = lines[info.lineIndex];
  if (lineRaw === undefined) {
    return { doc, content: serializeFlowDoc(doc), removedNodes: [] };
  }
  const tokens = tokenizeLine(lineRaw);
  const nt = tokens?.find(
    (t): t is FlowNodeToken => t.kind === "node" && t.id === id,
  );
  if (nt) {
    const shapeText =
      nt.shape === "plain"
        ? `[${escapeLabelText(label)}]`
        : shapeWrap(nt.shape, escapeLabelText(label));
    const newToken = `${nt.id}${shapeText}`;
    const newLine = lineRaw.slice(0, nt.start) + newToken + lineRaw.slice(nt.end);
    lines[info.lineIndex] = newLine;
    return replacedDoc(doc, lines);
  }
  return { doc, content: serializeFlowDoc(doc), removedNodes: [] };
}

export function escapeLabelText(label: string): string {
  if (/[[\](){}<>|#",]/.test(label)) {
    return `"${label.replace(/"/g, "#quot;")}"`;
  }
  return label;
}

export function shapeWrap(shape: ShapeKind, label: string): string {
  switch (shape) {
    case "rect":
      return `[${label}]`;
    case "round":
      return `(${label})`;
    case "diamond":
      return `{${label}}`;
    case "stadium":
      return `([${label}])`;
    case "subroutine":
      return `[[${label}]]`;
    case "cylinder":
      return `[(${label})]`;
    case "circle":
      return `((${label}))`;
    case "async":
      return `>${label}]`;
    default:
      return label;
  }
}

/** Add a new node definition line at the end of the document. */
export function addNode(
  doc: FlowDocument,
  id: string,
  label: string,
  shape: ShapeKind = "rect",
): MutationResult {
  if (doc.nodes.has(id)) return setNodeLabel(doc, id, label);
  const lines = [...doc.lines];
  const shapeText = shape === "plain" ? "" : shapeWrap(shape, escapeLabelText(label));
  const newLine = `${id}${shapeText}`;
  lines.push(newLine);
  return replacedDoc(doc, applyLayout(doc, lines));
}

/** Delete a node: remove definition lines and every edge that references it. */
export function deleteNode(doc: FlowDocument, id: string): MutationResult {
  const lines = [...doc.lines];
  const toDrop = new Set<number>();
  // Track index shifts from splices (replacing one line with several).
  let shift = 0;

  // Iterate in reverse so earlier line indices stay valid while we splice.
  for (let pi = doc.parsed.length - 1; pi >= 0; pi--) {
    const line = doc.parsed[pi];
    if (line.kind === "other") continue;
    const currentIdx = line.index + shift;
    const currentRaw = lines[currentIdx] ?? line.raw;
    const tokens = tokenizeLine(currentRaw);

    if (line.kind === "node") {
      const onlyThis =
        tokens !== null &&
        tokens.every(
          (t): t is FlowNodeToken => t.kind === "node" && t.id === id,
        );
      if (onlyThis) {
        toDrop.add(currentIdx);
      }
      continue;
    }

    if (!tokens) continue;
    const removedIdx: number[] = [];
    tokens.forEach((t, i) => {
      if (t.kind === "node" && t.id === id) removedIdx.push(i);
      if (t.kind === "edge" && (t.from === id || t.to === id)) removedIdx.push(i);
    });
    if (removedIdx.length === 0) continue;

    const rebuilt = cutTokens(tokens, new Set(removedIdx));
    if (rebuilt.length === 1) {
      lines[currentIdx] = rebuilt[0];
    } else if (rebuilt.length === 0) {
      toDrop.add(currentIdx);
    } else {
      // Replace one line with several — the extra lines shift later indices.
      lines.splice(currentIdx, 1, ...rebuilt);
      shift += rebuilt.length - 1;
    }
  }

  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!toDrop.has(i)) kept.push(lines[i]);
  }

  // Remove layout position for the deleted node and rewrite the layout line.
  let layout =
    doc.layout !== null
      ? { ...doc.layout, positions: { ...doc.layout.positions } }
      : null;
  if (layout && layout.positions[id]) {
    const next = { ...layout.positions };
    delete next[id];
    layout = { ...layout, positions: next };
  }

  const withLayoutLines = applyLayout(
    { ...doc, layout },
    kept,
  );

  const ndoc = parseFlowDoc(withLayoutLines.join(doc.eol));
  return {
    doc: { ...ndoc, layout },
    content: withLayoutLines.join(doc.eol),
    removedNodes: [id],
  };
}

/** Add an edge `from --> to` (optionally `-->|label|`) as a new line. */
export function addEdge(
  doc: FlowDocument,
  from: string,
  to: string,
  label: string | null = null,
): MutationResult {
  const lines = [...doc.lines];
  const arrow = label ? `-->|${escapeLabelText(label)}|` : "-->";
  const newLine = `${from} ${arrow} ${to}`;
  lines.push(newLine);
  return replacedDoc(doc, applyLayout(doc, lines));
}

export function deleteEdge(
  doc: FlowDocument,
  edge: FlowEdgeInfo,
): MutationResult {
  const lines = [...doc.lines];
  const lineRaw = lines[edge.lineIndex];
  if (lineRaw === undefined) {
    return { doc, content: serializeFlowDoc(doc), removedNodes: [] };
  }
  const tokens = tokenizeLine(lineRaw);
  if (!tokens) return { doc, content: serializeFlowDoc(doc), removedNodes: [] };

  const idx = tokens.findIndex(
    (t, i): t is FlowEdgeToken =>
      i === edge.tokenIndex && t.kind === "edge", // token index match
  );
  if (idx < 0) return { doc, content: serializeFlowDoc(doc), removedNodes: [] };

  const rebuilt = cutTokens(tokens, new Set([idx]));
  if (rebuilt.length === 0) {
    const cleaner = lines.filter((_, i) => i !== edge.lineIndex);
    return replacedDoc(doc, applyLayout(doc, cleaner));
  }
  if (rebuilt.length === 1) {
    lines[edge.lineIndex] = rebuilt[0];
  } else {
    lines.splice(edge.lineIndex, 1, ...rebuilt);
  }
  return replacedDoc(doc, applyLayout(doc, lines));
}

/** Set an edge label, rewriting the arrow token in place. */
export function setEdgeLabel(
  doc: FlowDocument,
  edge: FlowEdgeInfo,
  label: string,
): MutationResult {
  const lineRaw = doc.lines[edge.lineIndex];
  if (lineRaw === undefined) {
    return { doc, content: serializeFlowDoc(doc), removedNodes: [] };
  }
  const tokens = tokenizeLine(lineRaw);
  const et = tokens?.find(
    (t, i): t is FlowEdgeToken =>
      i === edge.tokenIndex && t.kind === "edge",
  );
  if (!et) return { doc, content: serializeFlowDoc(doc), removedNodes: [] };

  // Rebuild the arrow text: preserve the arrow family, attach |label|.
  const family = arrowFamily(et.raw);
  const newArrow = label
    ? `${family}|${escapeLabelText(label)}|`
    : family;

  const lines = [...doc.lines];
  lines[edge.lineIndex] =
    lineRaw.slice(0, et.start) + newArrow + lineRaw.slice(et.end);
  return replacedDoc(doc, applyLayout(doc, lines));
}

function arrowFamily(raw: string): string {
  if (/^\s*==/.test(raw)) return "==>";
  if (/^\s*-\./.test(raw)) return "-.->";
  if (/^\s*---/.test(raw)) return "---";
  return "-->";
}

/** Set layout positions, mutating (or creating) the `%% lc-layout` line. */
export function setPositions(
  doc: FlowDocument,
  positions: Record<string, [number, number]>,
): MutationResult {
  const layout: FlowLayoutData = { v: 1, positions };
  const lines = [...doc.lines];
  let done = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*%%\s*lc-layout:\s*\{/.test(lines[i])) {
      if (Object.keys(positions).length === 0) lines.splice(i, 1);
      else lines[i] = buildLayoutLine(layout);
      done = true;
      break;
    }
  }
  if (!done && Object.keys(positions).length > 0) {
    lines.push(buildLayoutLine(layout));
  }

  const ndoc = parseFlowDoc(lines.join(doc.eol));
  return { doc: ndoc, content: lines.join(doc.eol), removedNodes: [] };
}

/** Strip the `%% lc-layout` line from content before passing to mermaid. */
export function stripLayoutLine(content: string): string {
  return content
    .split("\n")
    .filter((l) => !/^\s*%%\s*lc-layout:\s*\{/.test(l))
    .join("\n");
}

// ── Templates / diagram types ────────────────────────────────────────────────

export type DiagramType =
  | "flowchart"
  | "sequenceDiagram"
  | "classDiagram"
  | "stateDiagram"
  | "erDiagram"
  | "gantt"
  | "pie"
  | "journey"
  | "mindmap"
  | "timeline";

export const DIAGRAM_TYPES: ReadonlyArray<{ key: DiagramType; label: string }> = [
  { key: "flowchart", label: "Flowchart" },
  { key: "sequenceDiagram", label: "Sequence" },
  { key: "classDiagram", label: "Class" },
  { key: "stateDiagram", label: "State" },
  { key: "erDiagram", label: "ER" },
  { key: "gantt", label: "Gantt" },
  { key: "journey", label: "Journey" },
  { key: "pie", label: "Pie" },
  { key: "mindmap", label: "Mindmap" },
  { key: "timeline", label: "Timeline" },
];

export const DIAGRAM_TEMPLATES: Record<DiagramType, string> = {
  flowchart: `flowchart TD
  A[Start] --> B{Decide}
  B -->|Yes| C[Proceed]
  B -->|No| D[Stop]
  C --> E[End]
  D --> E`,
  sequenceDiagram: `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice`,
  classDiagram: `classDiagram
  class Animal
  class Dog
  Animal <|-- Dog
  Animal : +String name
  Animal : +speak()`,
  stateDiagram: `stateDiagram-v2
  [*] --> Idle
  Idle --> Working
  Working --> Done
  Done --> [*]`,
  erDiagram: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains`,
  gantt: `gantt
  dateFormat YYYY-MM-DD
  title Example Gantt
  section Init
  Task A : a1, 2026-01-01, 7d
  Task B : b1, 2026-01-08, 5d`,
  journey: `journey
  title My journey
  section Go
    Wake up : 5 : Me
    Work : 3 : Me, Work`,
  pie: `pie title Pets
  "Dogs" : 42
  "Cats" : 58`,
  mindmap: `mindmap
  root((Project))
    Branch two
      Subbranch two
    Branch three
      Subbranch three`,
  timeline: `timeline
  title History
  2020 : Event A
  2021 : Event B`,
};

/** Detect the diagram type from the first meaningful keyword. */
export function detectDiagramType(content: string): DiagramType {
  const cleaned = stripLayoutLine(content).split("\n");
  for (const raw of cleaned) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    const first = line.match(/^([a-zA-Z-]+)/)?.[1] ?? "";
    if (/^(flowchart|graph)$/.test(first)) return "flowchart";
    if (first === "stateDiagram-v2") return "stateDiagram";
    if (DIAGRAM_TYPES.some((d) => d.key === first)) return first as DiagramType;
    break;
  }
  return "flowchart";
}

/** Stable key for an edge (for selection). */
export function edgeKey(edge: FlowEdgeInfo): string {
  return `${edge.from}~${edge.to}~${edge.lineIndex}~${edge.tokenIndex}`;
}

/** Generate a unique node id like N1, N2… */
export function nextNodeId(doc: FlowDocument): string {
  let n = 1;
  while (doc.nodes.has(`N${n}`)) n++;
  return `N${n}`;
}

// ── Auto-arrange (BFS layered by direction) ─────────────────────────────────

/**
 * Compute default node positions when no layout metadata exists.
 * Uses BFS depth from roots, along the document direction.
 */
export function autoArrange(
  doc: FlowDocument,
  width: number = 260,
  height: number = 120,
): Record<string, [number, number]> {
  const positions: Record<string, [number, number]> = {};
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of doc.nodesOrdered) {
    incoming.set(id, 0);
    adjacency.set(id, []);
  }
  for (const e of doc.edges) {
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
    const adj = adjacency.get(e.from) ?? [];
    adj.push(e.to);
    adjacency.set(e.from, adj);
  }

  const dir = doc.headerDirection ?? "TB";
  const vertical = dir === "TB" || dir === "TD" || dir === "BT";

  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const id of doc.nodesOrdered) {
    if ((incoming.get(id) ?? 0) === 0) {
      depth.set(id, 0);
      queue.push(id);
    }
  }
  if (queue.length === 0 && doc.nodesOrdered.length > 0) {
    depth.set(doc.nodesOrdered[0], 0);
    queue.push(doc.nodesOrdered[0]);
  }

  const visited = new Set<string>(queue);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = depth.get(cur) ?? 0;
    for (const next of adjacency.get(cur) ?? []) {
      const nd = (depth.get(next) ?? 0);
      depth.set(next, Math.max(nd, d + 1));
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Unvisited (disconnected) nodes land in layer 0.
  const layers = new Map<number, string[]>();
  for (const id of doc.nodesOrdered) {
    const d = visited.has(id) ? (depth.get(id) ?? 0) : 0;
    const list = layers.get(d) ?? [];
    list.push(id);
    layers.set(d, list);
  }

  const sortedLayers = [...layers.entries()].sort((a, b) => {
    if (dir === "BT" || dir === "RL") return b[0] - a[0];
    return a[0] - b[0];
  });

  const padX = 24;
  const padY = 24;
  sortedLayers.forEach(([, ids], layerIdx) => {
    const count = ids.length;
    ids.forEach((id, i) => {
      if (vertical) {
        const x = padX + (count > 1 ? i * (width + 160) : 0);
        const y = padY + layerIdx * height;
        positions[id] = [Math.round(x), Math.round(y)];
      } else {
        const x = padX + layerIdx * width;
        const y = padY + (count > 1 ? i * (height + 110) : 0);
        positions[id] = [Math.round(x), Math.round(y)];
      }
    });
  });

  return positions;
}
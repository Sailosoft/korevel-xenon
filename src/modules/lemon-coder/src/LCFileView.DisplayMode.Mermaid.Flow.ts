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

  // Non-flowchart diagrams: build a generic element model as plain rect nodes
  // plus generic relations (messages / connections) so the custom canvas editor
  // renders and edits every diagram type.
  if (!isFlowchart) {
    for (const el of scanGenericElements(content)) {
      if (!nodes.has(el.id)) {
        nodesOrdered.push(el.id);
        nodes.set(el.id, {
          id: el.id,
          shape: "rect",
          label: el.label,
          lineIndex: el.lineIndex,
          tokenIndex: 0,
        });
      }
    }
    for (const rel of scanGenericRelations(content)) {
      edges.push({
        from: rel.from,
        to: rel.to,
        arrowType: "solid",
        label: rel.label,
        lineIndex: rel.lineIndex,
        tokenIndex: 0,
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

// ── Generic (non-flowchart) element scan ────────────────────────────────────

export interface GenericElement {
  id: string;
  label: string;
  lineIndex: number;
}

export interface GenericRelation {
  from: string;
  to: string;
  label: string | null;
  lineIndex: number;
}

// ── Gantt model ──────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

export interface GanttTask {
  id: string;
  label: string;
  section?: string;
  start: Date;
  end: Date;
  days: number;
  milestone: boolean;
}

const JOURNEY_TASK_RE = /^([^:]+?)\s*:\s*(\d+)\s*(:\s*(.*))?$/i;

/**
 * Rewrite a journey task: set a new status level (score) and/or move it to a
 * new position within its own section. Non-task lines (comments, etc.) inside
 * the section are preserved in place.
 */
export function updateJourneyTask(
  content: string,
  taskName: string,
  newScore: number,
  toIndex: number,
): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ start: number; end: number }> = [];
  let secStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^section\s+/i.test(t)) {
      if (secStart >= 0) {
        sections.push({ start: secStart, end: i });
      }
      secStart = i;
    }
  }
  if (secStart >= 0) sections.push({ start: secStart, end: lines.length });

  let targetLine = -1;
  let targetSection = -1;
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    for (let i = sec.start + 1; i < sec.end; i++) {
      const m = lines[i].match(JOURNEY_TASK_RE);
      if (m && m[1].trim() === taskName) {
        targetLine = i;
        targetSection = s;
        break;
      }
    }
    if (targetLine >= 0) break;
  }
  if (targetLine < 0 || targetSection < 0) return content;

  const sec = sections[targetSection];
  // Slot model: everything between the header and the next header/EOF.
  const slotCount = sec.end - sec.start - 1;
  const slotIsTask: boolean[] = [];
  const slotNames: string[] = [];
  for (let i = sec.start + 1; i < sec.end; i++) {
    const m = lines[i].match(JOURNEY_TASK_RE);
    slotIsTask.push(Boolean(m));
    slotNames.push(m ? m[1].trim() : "");
  }

  const taskSlots = slotIsTask
    .map((isTask, i) => (isTask ? i : -1))
    .filter((i) => i >= 0);
  const currentK = taskSlots.indexOf(targetLine - sec.start - 1);
  if (currentK < 0) return content;
  const ordered = taskSlots.map((slot) => slotNames[slot]);
  const name = ordered.splice(currentK, 1)[0];
  const newK = Math.max(0, Math.min(taskSlots.length - 1, toIndex));
  ordered.splice(newK, 0, name);

  // Rebuild the section's slots, preserving non-task lines in place.
  const rebuilt: string[] = [];
  let taskPtr = 0;
  for (let slot = 0; slot < slotCount; slot++) {
    const line = lines[sec.start + 1 + slot];
    if (!slotIsTask[slot]) {
      rebuilt.push(line);
      continue;
    }
    const orderName = ordered[taskPtr++];
    const m = lines[sec.start + 1 + slot].match(JOURNEY_TASK_RE);
    const people = m && m[4] !== undefined ? m[4].trim() : "";
    const isTarget = orderName === name;
    const score = isTarget
      ? Math.min(5, Math.max(1, newScore))
      : m
        ? parseInt(m[2], 10)
        : 5;
    rebuilt.push(
      people ? `${orderName}: ${score}: ${people}` : `${orderName}: ${score}`,
    );
  }

  const out = [
    ...lines.slice(0, sec.start + 1),
    ...rebuilt,
    ...lines.slice(sec.end),
  ];
  return out.join("\n");
}

/**
 * Rewrite a gantt task: set a new start date and day count. Rewrites the task
 * line as `Label : id, YYYY-MM-DD, <days>d` while preserving the task label.
 */
export function updateGanttTask(
  content: string,
  taskName: string,
  startIso: string,
  days: number,
): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const dateLike =
    /^(\d{4})-(\d{1,2})-(\d{1,2})$|^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const durationLike = /^(\d+)\s*(d|w|M|y|h)$/i;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (/^(gantt|dateFormat|title|accTitle|accDescr|section)\b/i.test(t)) continue;
    const tl = t.match(/^([^:]+?)\s*:\s*([^:]*)$/);
    if (!tl || tl[1].trim() !== taskName) continue;
    const rest = tl[2].split(",").map((s) => s.trim()).filter(Boolean);
    let id = "";
    for (const tok of rest) {
      const low = tok.toLowerCase();
      if (/^(done|active|crit|idle|milestone)$/.test(low)) continue;
      if (/^(after|on|until)\s+/i.test(tok)) continue;
      if (dateLike.test(tok)) continue;
      if (durationLike.test(tok)) continue;
      id = tok.replace(/["']/g, "");
      break;
    }
    const clean = (iso: string) => {
      const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) {
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
      return iso;
    };
    const newLine = `${tl[1].trim()} : ${id || taskName.replace(/\s+/g, "_")}, ${clean(startIso)}, ${Math.max(1, Math.round(days))}d`;
    lines[i] = newLine;
    break;
  }
  return lines.join("\n");
}

function parseDateToken(token: string): Date | null {
  const t = token.trim();
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const us = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (us) return new Date(Date.UTC(+us[3], +us[1] - 1, +us[2]));
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return new Date(Date.UTC(+slash[3], +slash[1] - 1, +slash[2]));
  return null;
}

function parseDuration(token: string): number | null {
  const m = token.trim().match(/^(\d+)\s*(d|w|M|y|h)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case "d":
      return n;
    case "w":
      return n * 7;
    case "M":
      return n * 30;
    case "y":
      return n * 365;
    case "h":
      return Math.max(1, Math.round(n / 24));
    default:
      return n;
  }
}

interface RawGanttTask {
  id: string;
  label: string;
  section?: string;
  startToken: string | null;
  afterId: string | null;
  endToken: string | null;
  untilId: string | null;
  dur: number | null;
  milestone: boolean;
  start: Date | null;
  end: Date | null;
}

/** Parse mermaid gantt source lines into dated tasks (best effort). */
export function parseGantt(content: string): GanttTask[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let section: string | undefined;
  const raws: RawGanttTask[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    const sec = t.match(/^section\s+(.+)$/i);
    if (sec) {
      section = sec[1].trim();
      continue;
    }
    if (/^dateFormat\b/i.test(t) || /^gantt\b/i.test(t) || /^title\b/i.test(t) || /^accTitle\b/i.test(t) || /^accDescr\b/i.test(t)) {
      continue;
    }
    const taskLine = t.match(/^([^:]+?)\s*:\s*([^:]*)$/);
    if (!taskLine) continue;
    const label = taskLine[1].trim();
    const rest = taskLine[2].split(",").map((s) => s.trim()).filter(Boolean);

    let id = "";
    let startToken: string | null = null;
    let afterId: string | null = null;
    let endToken: string | null = null;
    let untilId: string | null = null;
    let dur: number | null = null;
    let milestone = false;

    let dateSeen = 0;
    for (let i = 0; i < rest.length; i++) {
      const tok = rest[i];
      const low = tok.toLowerCase();
      if (/^(done|active|crit|idle)$/.test(low)) continue;
      if (low === "milestone") {
        milestone = true;
        continue;
      }
      const ref = tok.match(/^(?:after|on)\s+([A-Za-z0-9_\-]+)$/i);
      if (ref) {
        afterId = ref[1];
        continue;
      }
      const unt = tok.match(/^until\s+([A-Za-z0-9_\-]+)$/i);
      if (unt) {
        untilId = unt[1];
        continue;
      }
      const d = parseDateToken(tok);
      if (d) {
        if (dateSeen === 0) {
          startToken = tok;
          dateSeen = 1;
        } else {
          endToken = tok;
        }
        continue;
      }
      const durTok = parseDuration(tok);
      if (durTok !== null) {
        dur = durTok;
        continue;
      }
      if (!id) {
        id = tok.replace(/["']/g, "");
      }
    }

    raws.push({
      id: id || label.replace(/\s+/g, "_"),
      label,
      section,
      startToken,
      afterId,
      endToken,
      untilId,
      dur,
      milestone,
      start: null,
      end: null,
    });
  }

  const byId = new Map<string, RawGanttTask>();
  raws.forEach((r) => byId.set(r.id, r));

  for (let pass = 0; pass < 5; pass++) {
    let progress = false;
    for (const r of raws) {
      if (r.start) continue;
      let s: Date | null = null;
      if (r.startToken) {
        s = parseDateToken(r.startToken);
      } else if (r.afterId) {
        const ref = byId.get(r.afterId);
        if (ref && ref.end) {
          s = new Date(ref.end.getTime() + DAY_MS / 2);
        }
      }
      if (!s) continue;
      r.start = s;
      let e: Date | null = null;
      if (r.endToken) {
        e = parseDateToken(r.endToken);
      } else if (r.untilId) {
        const ref = byId.get(r.untilId);
        if (ref && ref.end) e = ref.end;
      }
      if (e && e.getTime() < s.getTime()) e = s;
      if (r.dur !== null) {
        e = new Date(
          s.getTime() +
            Math.max(0, Math.round(r.dur) - (r.dur >= 1 ? 1 : 0)) * DAY_MS,
        );
        if (r.dur === 0) e = s;
      }
      r.end = e ?? s;
      progress = true;
    }
    if (!progress) break;
  }

  const out: GanttTask[] = [];
  for (const r of raws) {
    if (!r.start || !r.end) continue;
    const days = Math.round((r.end.getTime() - r.start.getTime()) / DAY_MS) + 1;
    out.push({
      id: r.id,
      label: r.label,
      section: r.section,
      start: r.start,
      end: r.end,
      days: r.milestone ? 0 : Math.max(1, days),
      milestone: r.milestone,
    });
  }
  return out;
}

/**
 * Best-effort scan of relationships for non-flowchart diagram types so the
 * custom canvas editor draws connections: sequence messages, class relations,
 * state transitions and ER relations.
 */
export function scanGenericRelations(content: string): GenericRelation[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const type = detectDiagramType(content);
  const out: GenericRelation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (GENERIC_HEADER_SKIP_RE.test(t)) continue;
    let m: RegExpMatchArray | null = null;

    if (type === "sequenceDiagram") {
      m = t.match(
        /^([A-Za-z0-9_\-]+)\s*[-–—]*-{0,1}\s*[>xo)]+\s*([A-Za-z0-9_\-]+)\s*:\s*(.*)$/i,
      );
      if (m) {
        out.push({
          from: m[1],
          to: m[2],
          label: m[3]?.trim() || null,
          lineIndex: i,
        });
      }
    } else if (type === "classDiagram") {
      m = t.match(
        /^([A-Za-z0-9_]+)\s*(?:<\|?[*o]*|\|?[*o]*)\s*(?:-{2,}|\.{2,})\s*(\|?>?[*o]*|\|?[*o]*)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/i,
      );
      if (m) {
        out.push({
          from: m[1],
          to: m[3],
          label: m[4]?.trim() || null,
          lineIndex: i,
        });
      }
    } else if (type === "stateDiagram") {
      m = t.match(
        /^([A-Za-z0-9_\-.*\[\]]+)\s*(?:--(?:>|-)\s*|-->)\s*([A-Za-z0-9_\-.*\[\]]+)(?:\s*[:|]\s*(.*))?$/i,
      );
      if (m && m[1] !== "[*]" && m[2] !== "[*]") {
        out.push({
          from: m[1],
          to: m[2],
          label: m[3]?.trim() || null,
          lineIndex: i,
        });
      }
    } else if (type === "erDiagram") {
      m = t.match(
        /^([A-Za-z0-9_]+)\s*(?:\|\||\|\{|[}{o\|]+|\.\.)+\s*(?:--|\.\.)\s*(?:[}{o\|]+|\|\||\.\.)+\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/i,
      );
      if (m) {
        out.push({
          from: m[1],
          to: m[2],
          label: m[3]?.trim() || null,
          lineIndex: i,
        });
      }
    }
  }
  return out;
}

const GENERIC_HEADER_SKIP_RE =
  /^(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|flowchart|graph|title|accTitle|accDescr|dateFormat|section|direction|linkStyle|style|classDef|subgraph|end)\b/i;

/**
 * Best-effort scan of element declarations for non-flowchart diagram types so
 * the custom canvas editor can render and edit every diagram kind. Identifiers
 * are keyed by the token that appears in the diagram source.
 */
export function scanGenericElements(content: string): GenericElement[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const type = detectDiagramType(content);
  const out: GenericElement[] = [];
  const seen = new Set<string>();

  const add = (id: string | null, label: string | null, lineIndex: number) => {
    if (!id) return;
    const clean = id.replace(/["'`]/g, "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push({ id: clean, label: label || clean, lineIndex });
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (GENERIC_HEADER_SKIP_RE.test(t)) continue;

    let id: string | null = null;
    let label: string | null = null;

    // sequenceDiagram: participant/actor ID [as Label]
    const part = t.match(
      /^(?:participant|actor)\s+([A-Za-z0-9_\-]+)(?:\s+as\s+(.+))?$/i,
    );
    if (part) {
      id = part[1];
      label = (part[2] ?? part[1]).trim();
      add(id, label, i);
      continue;
    }

    // sequenceDiagram: messages imply their participants.
    if (type === "sequenceDiagram" && /^\s*[A-Za-z0-9_\-]+\s*-[-x)>o{]*\s*[>xo)]+\s*[A-Za-z0-9_\-]+\s*:/i.test(t)) {
      const m = t.match(
        /^([A-Za-z0-9_\-]+)\s*[-–—]*-{0,1}\s*[>xo)]+\s*([A-Za-z0-9_\-]+)\s*:/i,
      );
      if (m) {
        add(m[1], m[1], i);
        add(m[2], m[2], i);
      }
      continue;
    }

    // classDiagram: class NAME
    const cls = t.match(/^class\s+([A-Za-z0-9_\-]+)/i);
    if (cls) {
      add(cls[1], cls[1], i);
      continue;
    }

    // classDiagram: relations imply their classes.
    if (type === "classDiagram") {
      const rel = t.match(
        /^([A-Za-z0-9_]+)\s*(?:<\|?[*o]*|\|?[*o]*)\s*(?:-{2,}|\.{2,})\s*(\|?>?[*o]*|\|?[*o]*)\s*([A-Za-z0-9_]+)/i,
      );
      if (rel) {
        add(rel[1], rel[1], i);
        add(rel[3], rel[3], i);
        continue;
      }
    }

    // stateDiagram: state "Label" as NAME | state NAME
    const st = t.match(/^state\s+(?:"([^"]+)"\s+as\s+)?([A-Za-z0-9_\-]+)/i);
    if (st) {
      add(st[2], st[1] ?? st[2], i);
      continue;
    }

    // stateDiagram: transitions imply both states.
    if (/-->|\s--[a-z]*\s/i.test(t)) {
      const ids = t.match(
        /^([A-Za-z0-9_\-.*\[\]]+)\s*(?:--(?:>|-)\s*|-->)\s*([A-Za-z0-9_\-.*\[\]]+)/,
      );
      if (ids) {
        if (ids[1] !== "[*]") add(ids[1], ids[1], i);
        if (ids[2] !== "[*]") add(ids[2], ids[2], i);
        continue;
      }
    }

    // erDiagram: ENTITY { ... }
    if (type === "erDiagram") {
      const er = t.match(/^([A-Z][A-Z0-9_\-]*)\s*\{/);
      if (er) {
        add(er[1], er[1], i);
        continue;
      }
      // erDiagram: relations imply their entities.
      const erRel = t.match(
        /^([A-Za-z0-9_]+)\s*(?:\|\||\|\{|[}{o\|]+|\.\.)+\s*(?:--|\.\.)\s*(?:[}{o\|]+|\|\||\.\.)+\s*([A-Za-z0-9_]+)/i,
      );
      if (erRel) {
        add(erRel[1], erRel[1], i);
        add(erRel[2], erRel[2], i);
        continue;
      }
    }

    if (type === "pie") {
      const pie = t.match(/^"?([^:"']+)"?\s*:/);
      if (pie) {
        add(pie[1].trim(), pie[1].trim(), i);
        continue;
      }
    } else if (type === "gantt") {
      const gt = t.match(/^([A-Za-z0-9_ \-']+?)\s*:\s*([A-Za-z0-9_\-]+)/);
      if (gt && !/^(done|active|crit|after|milestone)/i.test(gt[2])) {
        add(gt[1].trim(), gt[1].trim(), i);
        continue;
      }
    } else if (type === "journey") {
      const jr = t.match(/^([A-Za-z0-9_ \-']+?)\s*:/);
      if (jr) {
        add(jr[1].trim(), jr[1].trim(), i);
        continue;
      }
    } else if (type === "timeline") {
      const tl = t.match(/^[0-9]{4}\s*:\s*(.+)$/);
      if (tl) {
        add(tl[1].trim(), tl[1].trim(), i);
        continue;
      }
    } else if (type === "mindmap") {
      if (raw.trim().length > 0) {
        add(t, t, i);
        continue;
      }
    }
  }
  return out;
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

// ── Generic (non-flowchart) element editing ─────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Best-effort declaration templates per diagram type (N = new name). */
const GENERIC_ADD_TEMPLATES: Partial<Record<DiagramType, string>> = {
  sequenceDiagram: "participant N",
  classDiagram: "class N",
  stateDiagram: "state N",
  erDiagram: "N { }",
  mindmap: "  N",
  gantt: "N : n, 2026-01-01, 1d",
  pie: '"N" : 1',
  journey: "  N : 1 : Me",
  timeline: "2027 : N",
};

/** Append a new element declaration for a non-flowchart diagram type. */
export function addGenericElement(
  content: string,
  diagramType: DiagramType,
): string {
  const tpl = GENERIC_ADD_TEMPLATES[diagramType];
  if (!tpl) return content;
  let n = 1;
  let name = "N" + n;
  while (content.includes(name)) {
    n += 1;
    name = "N" + n;
  }
  const line = tpl.replace("N", name);
  return content.replace(/\r?\n$/, "") + "\n" + line + "\n";
}

/** Replace the first standalone occurrence of a label/identifier in the source,
 *  preserving surrounding quotes when the token is quoted. */
export function renameTextToken(
  content: string,
  from: string,
  to: string,
): string {
  if (!from || from === to) return content;
  const idx = content.indexOf(from);
  if (idx < 0) return content;
  const before = idx > 0 ? content[idx - 1] : "";
  const after =
    idx + from.length < content.length ? content[idx + from.length] : "";
  const insideQuotes =
    (before === '"' && after === '"') || (before === "'" && after === "'");
  if (insideQuotes) {
    return content.slice(0, idx) + to + content.slice(idx + from.length);
  }
  return content.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`), to);
}

const DIAGRAM_HEADER_RE =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline)\b/i;

/** Remove the first non-header line that mentions a label/identifier. */
export function deleteTextTokenLine(content: string, token: string): string {
  if (!token) return content;
  const re = new RegExp(`\\b${escapeRegExp(token)}\\b`);
  const lines = content.split(/\r?\n/);
  let target = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("#")) continue;
    if (DIAGRAM_HEADER_RE.test(trimmed)) continue;
    if (re.test(trimmed)) {
      target = i;
      break;
    }
  }
  if (target < 0) return content;
  lines.splice(target, 1);
  return lines.join("\n");
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
  const perRow = 6;
  sortedLayers.forEach(([, ids], layerIdx) => {
    const count = ids.length;
    ids.forEach((id, i) => {
      if (vertical) {
        const row = Math.floor(i / perRow);
        const x =
          padX +
          (count > 1 ? (i % perRow) * (width + 160) : 0);
        const y = padY + layerIdx * height + row * height;
        positions[id] = [Math.round(x), Math.round(y)];
      } else {
        const row = Math.floor(i / perRow);
        const x = padX + layerIdx * width + row * width;
        const y =
          padY + (count > 1 ? (i % perRow) * (height + 110) : 0);
        positions[id] = [Math.round(x), Math.round(y)];
      }
    });
  });

  return positions;
}
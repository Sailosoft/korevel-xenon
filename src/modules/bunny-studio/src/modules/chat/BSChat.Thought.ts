// BSChat.Thought — Thought-process parsing helpers.
//
// AI responses may include a private reasoning preamble wrapped in
// <thought> … </thought> tags (e.g. "thought" reasoning streams). These
// helpers split that preamble away from the actual answer so the chat bubble
// can show it in a collapsible "Thought process" panel, while persistence and
// multi-turn forwarding keep ONLY the real output (rules: thought is never
// persisted into the main content column, and is never sent back to the AI).
//
// The splitter is streaming-safe: an unclosed <thought> tag (still being
// written) is treated as thought so the UI can animate "thinking…" until the
// closing tag arrives and the real output starts streaming.

const THOUGHT_OPEN = "<thought>";
const THOUGHT_CLOSE = "</thought>";

export interface BSThoughtSplit {
  /** Everything written inside <thought>…</thought> blocks (concatenated). */
  thought: string;
  /** The actual answer with every thought block stripped out. */
  content: string;
}

/**
 * Split a raw (possibly still-streaming) AI response into its thought
 * preamble and its actual output. Handles multiple thought blocks and an
 * unclosed trailing block.
 */
export function splitThoughtBlocks(raw: string): BSThoughtSplit {
  if (!raw) return { thought: "", content: "" };

  const thoughts: string[] = [];

  // 1) Collect every complete <thought>…</thought> block.
  const closed = /<thought>([\s\S]*?)<\/thought>/gi;
  let m: RegExpExecArray | null;
  while ((m = closed.exec(raw)) !== null) {
    thoughts.push(m[1].replace(/^\n+|\n+$/g, ""));
  }

  // 2) Detect an unclosed <thought> that is still streaming — it starts after
  //    the last closing tag and runs to the end of the buffer.
  const lastClose = raw.lastIndexOf(THOUGHT_CLOSE);
  const unclosedStart = raw.indexOf(
    THOUGHT_OPEN,
    lastClose === -1 ? 0 : lastClose + THOUGHT_CLOSE.length,
  );
  if (unclosedStart !== -1) {
    thoughts.push(raw.slice(unclosedStart + THOUGHT_OPEN.length).replace(/^\n+/, ""));
  }

  // 3) The actual output is the raw text with every thought block removed —
  //    both the closed blocks and any trailing unclosed one.
  const content = raw
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    // Strip any trailing (possibly still-streaming) opening tag — a full
    // `<thought>` or a partial `<thought` — so the tag itself never leaks into
    // the actual output while it is being written.
    .replace(/<thought[\s\S]*$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    thought: thoughts.join("\n\n").trim(),
    content,
  };
}

/**
 * Strip thought blocks from a persisted assistant message. Used when building
 * multi-turn history so thoughts are NEVER forwarded to the AI (rule 1), and
 * as a safety net for legacy rows that may have tags embedded in `content`.
 */
export function stripThoughtTags(content: string): string {
  return splitThoughtBlocks(content).content;
}

# Architecture Plan (tasks 10–11)

Module: `src/modules/bunny-dev/modules/architecture`.
Source: `tasks.yaml` lines 63–74.

## Goal

1. AI generation produces highly informative, well-structured sections (~300–500 words each); the editor uses WYSIWYG instead of a plain textarea.
2. Add "View" and "Export to HTML" producing a well-designed Tailwind-styled HTML document from markdown.

## Key files

- Domain: `BDArchitecture.Domain.ts` (`BDArchitectureSection` 65–75)
- Types: `BDArchitecture.Types.ts` (`BDArchitectureDraft` 139–156)
- AI: `BDArchitectureBuilder.Server.ts` (`ARCHITECTURE_DSL` 27–73, `bdGenerateArchitecture` 113–144, prompts 123–128)
- UI: `BDArchitecture.Component.tsx` (section textarea 251–261, doc WYSIWYG 146–150, summary textarea 113–119), `BDArchitectureBuilder.Component.tsx` (apply 175–196, export 354–367)
- Export: `BDArchitectureExport.ts` (`toArchitectureMarkdown` 6–20, stub `toArchitectureHtml` 22–35)
- Reuse: `components/BDWysiwygEditor.tsx`, `components/BDMarkdownView.tsx`, `BDDownload.ts` (`openTextTab` 39–46), `modules/outline/BDOutlineExport.ts` (marked pattern 3, 47–67), `modules/bunny-flow/src/export/BFlowExport.TailwindService.ts` (Tailwind HTML reference)

---

## T1 — Meaningful AI content + WYSIWYG editor

### AI generation

1. `BDArchitectureBuilder.Server.ts` `ARCHITECTURE_DSL` section schema (27–73): strengthen the `content` description to require 300–500 words per section, with a defined internal structure (short lead paragraph, sub-points/lists, trade-offs/decisions, and a table where useful). Add an optional per-section `summary` if not present.
2. Prompts (123–128): update `system`/`user` to instruct:
   - 300–500 words per section, information-dense, no filler.
   - Well-defined section hierarchy (levels 1–3) appropriate to `documentType`.
   - For variant/multiple documents, keep each self-contained.
3. Verify the Helix call's max output tokens (`bdGenerateStructured` in `agent-manager/BDGeneration.Server.ts` 60–87). If a max-token cap is set, raise it enough to fit multi-section, 300–500-word content; otherwise long sections may truncate.
4. Normalizers (`normalizeSection` 79–89, `normalizeArchitecture` 91–111): preserve full content (do not truncate); keep `undefined` only for truly empty content.
5. Apply path (`BDArchitectureBuilder.Component.tsx` `applyArtifact` 175–196) already stores content via `createSection`; confirm no length clamps.

### WYSIWYG editor

6. Replace the section `<textarea>` (`BDArchitecture.Component.tsx` 251–261) with `BDWysiwygEditor` (already imported at line 17) bound to `section.content` via `updateSection(index, { content })`.
7. Add an Edit/Preview toggle per section using `BDMarkdownView`, mirroring `BDOutlineEditor.Component.tsx` 75–110.
8. Convert the summary `<textarea>` (113–119) to `BDWysiwygEditor` as well (or at minimum keep as-is if it is metadata; requirement targets content editing — recommend WYSIWYG for summary too).
9. The document-level `content` already uses WYSIWYG (146–150); leave it.

Acceptance: AI-generated sections are ~300–500 words and structured; section content is edited with WYSIWYG with a markdown preview.

## T2 — View and Export to HTML

Current `toArchitectureHtml` (`BDArchitectureExport.ts` 22–35) escapes raw markdown into `<pre>` — replace it.

1. Rewrite `toArchitectureHtml(record)` to:
   - Build markdown with `toArchitectureMarkdown` (6–20).
   - Convert with `marked.parse(...)` (dependency `marked`; precedent `BDOutlineExport.ts` 47–67).
   - Emit a standalone HTML doc with a `<head>` that loads Tailwind + typography plugin, mirroring the reference `BFlowExport.TailwindService.ts` (CDN script `https://cdn.tailwindcss.com?plugins=typography`, a small `tailwind.config`, and a `REPORT_HEAD` style block for prose/surfaces).
   - Render the parsed HTML inside a styled article/panel; include the document title, type/status/version metadata, and print-friendly styles.
2. Add a "View" action in `BDArchitectureBuilder.Component.tsx` (near the export buttons 354–367) using `openTextTab(toArchitectureHtml(draft))`, matching the outline module (`BDOutlineBuilder.Component.tsx` 347–354).
3. Keep the existing "HTML" download button (354–367) but it now downloads the improved document; verify the `downloadText(..., "text/html")` mime.
4. Consider offline fallback: the Tailwind CDN requires network. If offline HTML is required, inline a prebuilt CSS instead (note as optional; CDN is acceptable for the requested "good Tailwind output").

Acceptance: "View" opens a styled HTML document in a new tab; "HTML" downloads the same; both render headings, lists, tables, and code nicely.

---

## Risks

- Raising token budgets may exceed provider limits; validate with a long document.
- `marked` output should be reviewed for XSS only if untrusted input is ever rendered; current content is local/self-authored.
- Tailwind CDN requires internet; document the fallback.

## Validation

- `bun run build` and `npm run lint` pass.
- Generate an architecture doc; confirm 300–500-word sections and structure; edit sections in WYSIWYG.
- Export HTML and View; verify styling (typography, tables, headings) and print layout.

// BKMemory.Template.ts
//
// HTML template constants and builders for BKThought export.
// Single Responsibility: Pure template markup — no data processing logic.
// Theme: Purple-accent design system matching Bunny Thinker's UI.

import { RenderEngine } from "@/src/modules/render/src/RenderModule.Engine";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";

// ─── CDN Head Injections ─────────────────────────────────────────────────────

/** Head injections needed by specific render formats (CDN scripts etc.). */
export const FORMAT_HEAD_INJECTIONS: Partial<Record<RenderFormat, string>> = {
  mermaid: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  mindmap: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  markdown: `<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>`,
  tailwind: `<script src="https://cdn.tailwindcss.com?plugins=typography"></script>`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * HTML-escape a string so it displays as source code in the browser.
 */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * Replace common LaTeX math expressions with Unicode equivalents.
 * This handles expressions like $\rightarrow$, $\alpha$, etc. that marked can't render.
 */
function replaceLatexMath(text: string): string {
  const latexMap: Record<string, string> = {
    "\\rightarrow": "\u2192",
    "\\leftarrow": "\u2190",
    "\\Rightarrow": "\u21d2",
    "\\Leftarrow": "\u21d0",
    "\\mapsto": "\u21a6",
    "\\implies": "\u27f9",
    "\\iff": "\u27fa",
    "\\to": "\u2192",
    "\\gets": "\u2190",
    "\\alpha": "\u03b1",
    "\\beta": "\u03b2",
    "\\gamma": "\u03b3",
    "\\delta": "\u03b4",
    "\\epsilon": "\u03b5",
    "\\zeta": "\u03b6",
    "\\eta": "\u03b7",
    "\\theta": "\u03b8",
    "\\iota": "\u03b9",
    "\\kappa": "\u03ba",
    "\\lambda": "\u03bb",
    "\\mu": "\u03bc",
    "\\nu": "\u03bd",
    "\\xi": "\u03be",
    "\\pi": "\u03c0",
    "\\rho": "\u03c1",
    "\\sigma": "\u03c3",
    "\\tau": "\u03c4",
    "\\upsilon": "\u03c5",
    "\\phi": "\u03c6",
    "\\chi": "\u03c7",
    "\\psi": "\u03c8",
    "\\omega": "\u03c9",
    "\\infty": "\u221e",
    "\\sum": "\u2211",
    "\\prod": "\u220f",
    "\\int": "\u222b",
    "\\partial": "\u2202",
    "\\nabla": "\u2207",
    "\\approx": "\u2248",
    "\\neq": "\u2260",
    "\\leq": "\u2264",
    "\\geq": "\u2265",
    "\\subset": "\u2282",
    "\\supset": "\u2283",
    "\\subseteq": "\u2286",
    "\\supseteq": "\u2287",
    "\\cup": "\u222a",
    "\\cap": "\u2229",
    "\\in": "\u2208",
    "\\notin": "\u2209",
    "\\emptyset": "\u2205",
    "\\forall": "\u2200",
    "\\exists": "\u2203",
    "\\cdot": "\u22c5",
    "\\times": "\u00d7",
    "\\div": "\u00f7",
    "\\pm": "\u00b1",
    "\\circ": "\u2218",
    "\\bullet": "\u2219",
    "\\rangle": "\u27e9",
    "\\langle": "\u27e8",
    "\\lbrace": "{",
    "\\rbrace": "}",
    "\\lvert": "|",
    "\\rvert": "|",
  };
  // Replace $\command$ inline math
  let result = text.replace(/\$([^$]+)\$/g, (_match, expr: string) => {
    let resolved = expr.trim();
    for (const [cmd, unicode] of Object.entries(latexMap)) {
      resolved = resolved.replace(new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), unicode);
    }
    return resolved;
  });
  // Also replace $$command$$ display math
  result = result.replace(/\$\$([^$]+)\$\$/g, (_match, expr: string) => {
    let resolved = expr.trim();
    for (const [cmd, unicode] of Object.entries(latexMap)) {
      resolved = resolved.replace(new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), unicode);
    }
    return resolved;
  });
  return result;
}

/**
 * Clean display names by stripping common prefixes like "Neuron:", "Thought:", "Run:".
 */
export function cleanDisplayName(name: string): string {
  let clean = name;
  clean = clean.replace(/^(?:Neuron|Thought|Run):?\s*(?:Neuron)?\s*\d*\s*[-–—]\s*/i, "");
  clean = clean.replace(/^(?:Neuron|Thought|Run):?\s*/i, "");
  clean = clean.replace(/^Neuron\s*\d+\s*[-–—]\s*/i, "");
  return clean.trim() || name;
}

/**
 * Parse CSV text into headers and rows (used for tailwind table rendering).
 */
function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
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

/**
 * Render CSV as a Tailwind-styled HTML table.
 */
function csvToTailwindTable(raw: string): string {
  const { headers, rows } = parseCsv(raw);
  if (headers.length === 0) {
    return '<div class="text-slate-400 text-sm italic px-4 py-6 text-center">No data</div>';
  }
  const parts: string[] = [];
  parts.push('<div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">');
  parts.push('<table class="w-full text-sm">');
  parts.push('<thead>');
  parts.push('<tr class="bg-gradient-to-r from-violet-50 to-indigo-50/50">');
  for (const header of headers) {
    parts.push(`<th class="px-4 py-3 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider border-b border-slate-200">${htmlEscape(header)}</th>`);
  }
  parts.push('</tr></thead>');
  parts.push('<tbody>');
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rowClass = ri % 2 === 0
      ? "bg-white transition-colors hover:bg-violet-50/40"
      : "bg-slate-50/50 transition-colors hover:bg-violet-50/40";
    parts.push(`<tr class="${rowClass}">`);
    for (let ci = 0; ci < Math.max(row.length, headers.length); ci++) {
      parts.push(`<td class="px-4 py-2.5 text-slate-700 border-b border-slate-100">${htmlEscape(row[ci] ?? "")}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody></table></div>');
  return parts.join("\n");
}

/**
 * Check if markdown content is primarily an image list (URLs or markdown images per line).
 * If so, returns the extracted image info; otherwise null.
 */
function detectImageList(content: string): Array<{ src: string; alt: string }> | null {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const images: Array<{ src: string; alt: string }> = [];
  let imageCount = 0;

  for (const line of lines) {
    // Markdown image syntax: ![alt](url)
    const mdMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (mdMatch) {
      images.push({ src: mdMatch[2], alt: mdMatch[1] || "Image" });
      imageCount++;
      continue;
    }
    // Plain URL that looks like an image
    if (line.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i)) {
      images.push({ src: line, alt: "Image" });
      imageCount++;
      continue;
    }
    // HTML img tag
    const htmlMatch = line.match(/^<img[^>]+src=["']([^"']+)["']/);
    if (htmlMatch) {
      const altMatch = line.match(/alt=["']([^"']+)["']/);
      images.push({ src: htmlMatch[1], alt: altMatch ? altMatch[1] : "Image" });
      imageCount++;
      continue;
    }
  }

  // Only treat as image list if >50% of lines are images
  return imageCount > 0 && imageCount >= lines.length * 0.5 ? images : null;
}

// ─── Template Parameter Interfaces ──────────────────────────────────────────

export interface BKThoughtSectionParams {
  name: string;
  format: string;
  content: string;
  index: number;
  associationValue?: string;
  patternName?: string;
}

export interface BKThoughtDocumentParams {
  title: string;
  thoughtName: string;
  description: string | null;
  itemCount: number;
  createdAt: string | null;
  sections: string;
  sidebarLinks: string;
  mainIndexHtml: string;
  headInjections: string;
  accent: string;
  accentLight: string;
  accentSoft: string;
}

// ─── Template Class ─────────────────────────────────────────────────────────

export class BKMemoryTemplate {
  /**
   * Render a single thought section to an HTML fragment.
   */
  static thoughtSection(params: BKThoughtSectionParams): string {
    const { name, format, content, index, associationValue, patternName } = params;
    const CODE_LIKE_FORMATS = new Set(["codeblock", "plain", "json"]);
    const slug = `thought-item-${index}`;
    const displayName = cleanDisplayName(name);

    let bodyContent: string;
    let actionButtons: string = "";

    if (CODE_LIKE_FORMATS.has(format)) {
      // ── Code-like formats: pre/code block ───────────────────────────
      if (format === "plain") {
        // Use inline styles to bypass all CSS specificity chains
        bodyContent = [
          `<pre style="background:#ffffff;padding:1rem;border-radius:12px;overflow-x:auto;font-size:0.875rem;font-family:'JetBrains Mono','Fira Code',monospace;line-height:1.7;color:#000000;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">`,
          `<code style="background:transparent;padding:0;border:none;color:#000000;font-size:inherit;">${htmlEscape(content)}</code>`,
          `</pre>`,
        ].join("\n");
      } else {
        bodyContent = [
          `<pre class="bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed text-slate-800 border border-slate-200/60">`,
          `<code>${htmlEscape(content)}</code>`,
          `</pre>`,
        ].join("\n");
      }

    } else if (format === "markdown") {
      // ── Markdown (or image list disguised as markdown) ────────────
      const imageList = detectImageList(content);
      if (imageList) {
        // Render as image gallery in 2-column grid
        const imgs = imageList.map((img) => {
          return `<div class="flex flex-col items-center">
            <img src="${htmlEscape(img.src)}" alt="${htmlEscape(img.alt)}" class="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200" loading="lazy" />
            <p class="mt-1.5 text-xs text-slate-400 italic truncate w-full text-center">${htmlEscape(img.alt)}</p>
          </div>`;
        }).join("\n");
        bodyContent = `<div class="grid grid-cols-2 gap-4">${imgs}</div>`;
      } else {
        // Pre-process LaTeX math expressions to Unicode before storage
        const latexProcessed = replaceLatexMath(content);
        const escapedContent = htmlEscape(latexProcessed);
        bodyContent = [
          `<pre id="rm-md-src-${index}" style="display:none" aria-hidden="true">${escapedContent}</pre>`,
          `<div id="rm-md-output-${index}" class="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-violet-600 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:shadow-lg relative"></div>`,
          `<script>`,
          `(function(){`,
          `  var srcEl=document.getElementById("rm-md-src-${index}");`,
          `  var out=document.getElementById("rm-md-output-${index}");`,
          `  if(!srcEl||!out)return;`,
          `  var src=srcEl.textContent||srcEl.innerText||"";`,
          `  try{`,
          `    if(typeof marked!=="undefined"&&marked.parse){`,
          `      out.innerHTML=marked.parse(src);`,
          `      out.querySelectorAll("pre").forEach(function(pre){`,
          `        var w=document.createElement("div");`,
          `        w.className="relative group";`,
          `        pre.parentNode.insertBefore(w,pre);`,
          `        w.appendChild(pre);`,
          `        var b=document.createElement("button");`,
          `        b.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';`,
          `        b.className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/50 backdrop-blur-sm";`,
          `        b.onclick=function(){`,
          `          var code=pre.querySelector("code");`,
          `          var txt=code?code.textContent:pre.textContent;`,
          `          if(navigator.clipboard){`,
          `            navigator.clipboard.writeText(txt).then(function(){`,
          `              var orig=b.innerHTML;`,
          `              b.innerHTML="\\u2713 Copied!";`,
          `              b.className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-900/80 rounded-lg border border-emerald-700/50";`,
          `              setTimeout(function(){`,
          `                b.innerHTML=orig;`,
          `                b.className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/50 backdrop-blur-sm";`,
          `              },2000);`,
          `            });`,
          `          }`,
          `        };`,
          `        w.appendChild(b);`,
          `      });`,
          `    }else{`,
          `      out.innerHTML="<pre class=\\"bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm\\">"+src.replace(/</g,"<")+"</pre>";`,
          `    }`,
          `  }catch(e){`,
          `    out.innerHTML="<pre class=\\"bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm\\">"+src.replace(/</g,"<")+"</pre>";`,
          `  }`,
          `})();`,
          `</script>`,
        ].join("\n");
      }

    } else if (format === "mermaid") {
      // ── Mermaid diagram with zoom + drag/pan ─────────────────────
      const diagramMatch = content.match(/```mermaid\n?([\s\S]*?)```/);
      const diagram = diagramMatch ? diagramMatch[1].trim() : content.trim();
      bodyContent = [
        `<div class="bg-white border border-slate-200 rounded-xl p-4 my-2 shadow-sm">`,
        `  <div class="mermaid-container flex justify-center overflow-hidden relative" style="max-height:600px;cursor:grab" id="mermaid-container-${index}">`,
        `    <div class="mermaid-zoom-wrapper" id="mermaid-wrap-${index}" style="transform-origin:center;transform:scale(1) translate(0px,0px);transition:none">`,
        `      <pre class="mermaid bg-transparent" style="pointer-events:none">`,
        `${htmlEscape(diagram)}`,
        `      </pre>`,
        `    </div>`,
        `  </div>`,
        `  <div class="flex justify-center gap-2 mt-3 no-print">`,
        `    <button onclick="mermaidZoom(${index},-0.25)" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer">Zoom Out</button>`,
        `    <button onclick="mermaidZoom(${index},0.25)" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer">Zoom In</button>`,
        `    <button onclick="mermaidReset(${index})" class="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer">Reset</button>`,
        `  </div>`,
        `</div>`,
      ].join("\n");

    } else if (format === "csv") {
      // ── CSV as Tailwind-styled table ───────────────────────────────
      bodyContent = csvToTailwindTable(content);

    } else if (format === "html") {
      // ── Raw HTML with "Open in new tab" button ─────────────────────
      bodyContent = [
        `<div class="bg-white border border-slate-200 rounded-xl p-4 my-2">`,
        `  ${content}`,
        `</div>`,
      ].join("\n");
      actionButtons = [
        `<div class="flex gap-2 mt-3">`,
        `  <button onclick="openBlob(${index},'html')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 transition-colors cursor-pointer">`,
        `    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
        `    Open in new tab`,
        `  </button>`,
        `</div>`,
      ].join("\n");

    } else if (format === "tailwind") {
      // ── Tailwind HTML + "Open Tailwind preview" button ─────────────
      bodyContent = [
        `<div class="bg-white border border-slate-200 rounded-xl p-4 my-2">`,
        `  ${content}`,
        `</div>`,
      ].join("\n");
      actionButtons = [
        `<div class="flex gap-2 mt-3">`,
        `  <button onclick="openBlob(${index},'tailwind')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 transition-colors cursor-pointer">`,
        `    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
        `    Open Tailwind preview`,
        `  </button>`,
        `</div>`,
      ].join("\n");

    } else if (format === "image") {
      // ── Image wrapped in <img> with tailwind classes ───────────────
      let imgSrc = content.trim();
      let imgAlt = "Image";
      const mdMatch = imgSrc.match(/!\[(.*?)\]\((.*?)\)/);
      if (mdMatch) { imgAlt = mdMatch[1] || "Image"; imgSrc = mdMatch[2]; }
      const htmlMatch = imgSrc.match(/<img[^>]+src=["']([^"']+)["']/);
      if (htmlMatch) {
        imgSrc = htmlMatch[1];
        const altMatch = imgSrc.match(/alt=["']([^"']+)["']/);
        if (altMatch) imgAlt = altMatch[1];
      }
      bodyContent = [
        `<div class="flex flex-col items-center my-4">`,
        `  <img src="${htmlEscape(imgSrc)}" alt="${htmlEscape(imgAlt)}" class="max-w-full h-auto rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200" loading="lazy" />`,
        `  <p class="mt-2 text-xs text-slate-400 italic">${htmlEscape(imgAlt)}</p>`,
        `</div>`,
      ].join("\n");

    } else {
      // ── Fallback: use RenderEngine for unknown formats ─────────────
      try {
        const result = RenderEngine.renderHtml(format as RenderFormat, content);
        bodyContent = result.html.html;
      } catch {
        bodyContent = [
          `<pre class="bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono text-slate-600 border border-slate-200">`,
          `<code>${htmlEscape(content)}</code>`,
          `</pre>`,
        ].join("\n");
      }
    }

    return [
      `<div class="thought-section" id="${slug}">`,
      `  <div class="thought-header">`,
      `    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
      `    ${htmlEscape(displayName)}`,
      `    <span class="thought-format">${htmlEscape(format)}</span>`,
      `  </div>`,
      associationValue ? [
        `  <div class="association-card">`,
        `    <div class="association-label">Association</div>`,
        `    <div class="association-value">${htmlEscape(associationValue)}</div>`,
        `  </div>`,
      ].join("\n") : patternName ? [
        `  <div class="association-card">`,
        `    <div class="association-label">Thought Pattern</div>`,
        `    <div class="association-value">${htmlEscape(patternName)}</div>`,
        `  </div>`,
      ].join("\n") : "",
      `  ${bodyContent}`,
      `  ${actionButtons}`,
      `  <a href="#toc" class="back-to-index">&uarr; Back to index</a>`,
      `</div>`,
    ].filter(Boolean).join("\n");
  }

  /**
   * Full standalone HTML document shell.
   */
  static thoughtDocument(params: BKThoughtDocumentParams): string {
    const { title, thoughtName, description, itemCount, createdAt,
      sections, sidebarLinks, mainIndexHtml, headInjections,
      accent, accentLight, accentSoft } = params;

    const cleanTitle = cleanDisplayName(title);
    const cleanThoughtName = cleanDisplayName(thoughtName);

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${htmlEscape(cleanTitle)}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
    ${headInjections}
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        :root {
          --accent: ${accent};
          --accent-light: ${accentLight};
          --accent-soft: ${accentSoft};
          --bg-page: #f4f6f9;
          --bg-card: #ffffff;
          --bg-card-hover: #fafbfc;
          --bg-surface: #f8f9fb;
          --bg-code: #f1f5f9;
          --bg-accent-soft: #f5f3ff;
          --border-subtle: #e9edf2;
          --border-card: rgba(255,255,255,0.6);
          --text-primary: #0b0f19;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --accent-gradient: linear-gradient(135deg, ${accent}, ${accentLight});
          --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05);
          --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08);
          --shadow-badge: 0 1px 3px rgba(109,40,217,0.2);
          --radius-card: 16px;
          --radius-section: 12px;
          --radius-code: 10px;
          --radius-badge: 999px;
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          --font-mono: 'JetBrains Mono', "Fira Code", "Cascadia Code", "Consolas", monospace;
          --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-med: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── Fixed Sticky Header ────────────────────────────── */
        .header-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 9999; height: 56px;
          background: rgba(255,255,255,0.88); backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border-subtle);
          display: flex; align-items: center;
          padding: 0 0.75rem 0 1rem; gap: 0.6rem;
          transition: box-shadow var(--transition-fast);
        }
        .header-bar.scrolled { box-shadow: 0 1px 12px rgba(0,0,0,0.07); }
        .header-hamburger {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 10px;
          background: var(--accent-gradient); color: #fff; border: none;
          cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0;
        }
        .header-hamburger:hover { transform: scale(1.05); box-shadow: 0 2px 8px rgba(109,40,217,0.3); }
        .header-hamburger:active { transform: scale(0.95); }
        .header-title {
          font-size: 0.85rem; font-weight: 700; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: -0.01em; flex: 1; min-width: 0;
        }
        .header-badge {
          font-size: 0.55rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; background: var(--bg-accent-soft); color: var(--accent);
          padding: 0.15rem 0.45rem; border-radius: var(--radius-badge);
          border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent); flex-shrink: 0;
        }
        .sidebar-panel {
          position: fixed; top: 56px; left: 0; bottom: 0; z-index: 9998; width: 270px;
          transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(to bottom, var(--accent-soft), #ffffff);
          border-right: 1px solid color-mix(in srgb, var(--accent) 10%, transparent);
          padding: 1.25rem 1rem; overflow-y: auto;
        }
        .sidebar-panel.open { transform: translateX(0); }
        .sidebar-overlay {
          position: fixed; inset: 0; z-index: 9997;
          background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
        }
        .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
        .content-area { padding-top: 56px; min-height: 100vh; }

        @media (min-width: 1024px) {
          .sidebar-panel { transform: translateX(0) !important; width: 270px; }
          .sidebar-overlay { display: none !important; }
          .header-hamburger { display: none !important; }
          .header-bar { left: 270px; }
          .content-area { margin-left: 270px; }
        }
        @media print {
            .no-print { display: none !important; }
            .content-area { margin-left: 0 !important; padding-top: 0 !important; }
            .header-bar, .sidebar-panel { display: none !important; }
        }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 999px; }
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: var(--accent) transparent; }

        .accent-bar { width: 5rem; height: 4px; background: var(--accent-gradient); border-radius: 999px; }
        .toc-card { background: linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.8)); border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent); border-radius: 0.75rem; }
        .report-card { background: var(--bg-card); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 2.5rem 2.5rem 2rem; border: 1px solid var(--border-card); backdrop-filter: blur(2px); animation: fadeInUp 0.5s ease-out; transition: box-shadow var(--transition-med); width: 100%; max-width: 1040px; }
        .report-card:hover { box-shadow: var(--shadow-card-hover); }
        @media (max-width: 640px) { .report-card { padding: 1.25rem 1.25rem 1rem; border-radius: 12px; } }
        .report-title { font-size: 1.65rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem; letter-spacing: -0.025em; line-height: 1.3; }
        .report-title::before { content: ""; display: inline-block; width: 4px; height: 1.1em; background: var(--accent-gradient); border-radius: 999px; margin-right: 0.6rem; vertical-align: middle; }
        .report-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .report-meta .meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted); opacity: 0.4; }
        .report-meta .item-count { background: var(--bg-accent-soft); color: var(--accent); font-weight: 600; font-size: 0.7rem; padding: 0.15rem 0.55rem; border-radius: var(--radius-badge); letter-spacing: 0.02em; }

        .thought-section { margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border-subtle); animation: fadeIn 0.4s ease-out both; scroll-margin-top: calc(56px + 1rem); }
        .thought-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .thought-header { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem; animation: slideIn 0.35s ease-out both; }
        .thought-format { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; background: var(--accent-gradient); color: #ffffff; padding: 0.2rem 0.6rem; border-radius: var(--radius-badge); letter-spacing: 0.05em; box-shadow: var(--shadow-badge); line-height: 1.4; }
        .association-card { background: linear-gradient(135deg, var(--bg-accent-soft), #ffffff); border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0 0 0.85rem 0; transition: all 0.2s ease; }
        .association-card:hover { border-color: color-mix(in srgb, var(--accent) 30%, transparent); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .association-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); }
        .association-value { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
        .back-to-index { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; font-weight: 500; color: var(--text-muted); margin-top: 1rem; padding: 0.25rem 0.5rem; border-radius: 6px; transition: all var(--transition-fast); text-decoration: none; }
        .back-to-index:hover { color: var(--accent); background: var(--bg-accent-soft); text-decoration: none; }
        img { max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: box-shadow var(--transition-fast); }
        img:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        pre { overflow-x: auto; border-radius: var(--radius-code); transition: box-shadow var(--transition-fast); }
        pre:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 0.75rem 0; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-subtle); }
        th, td { border: none; border-bottom: 1px solid var(--border-subtle); padding: 0.6rem 0.85rem; text-align: left; font-size: 0.9rem; }
        th { background: var(--bg-surface); font-weight: 600; color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--bg-card-hover); }
        a { color: var(--accent); text-decoration: none; transition: color var(--transition-fast); }
        a:hover { color: var(--accent-light); text-decoration: underline; }
        blockquote { border-left: 3px solid var(--accent); padding: 0.75rem 1rem; margin: 0.85rem 0; color: var(--text-secondary); background: var(--bg-surface); border-radius: 0 8px 8px 0; font-style: italic; }
        .thought-section code { font-family: var(--font-mono); font-size: 0.85em; background: var(--bg-surface); padding: 0.15em 0.4em; border-radius: 5px; color: var(--accent); border: 1px solid var(--border-subtle); }
        .thought-section pre code { background: none; padding: 0; border: none; color: #e2e8f0 !important; }
        .prose pre code { color: #e2e8f0 !important; background: transparent !important; }
        .thought-section h1, .thought-section h2, .thought-section h3, .thought-section h4 { margin-top: 1.35em; margin-bottom: 0.5em; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
        .thought-section h1 { font-size: 1.45rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.35em; }
        .thought-section h2 { font-size: 1.2rem; }
        .thought-section h3 { font-size: 1.05rem; }
        .thought-section h4 { font-size: 0.95rem; }
        .thought-section p { margin: 0.6em 0; color: var(--text-secondary); }
        .thought-section ul, .thought-section ol { padding-left: 1.5rem; margin: 0.6rem 0; }
        .thought-section li { margin: 0.3rem 0; }
        .thought-section hr { border: none; height: 1px; background: var(--border-subtle); margin: 1.5rem 0; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

        @media (max-width: 640px) {
          .report-title { font-size: 1.15rem; }
          .report-title::before { width: 3px; margin-right: 0.4rem; }
          .toc-card { padding: 1rem !important; }
          .content-area > div { padding-left: 1rem !important; padding-right: 1rem !important; }
          h1.text-5xl { font-size: 2.5rem !important; }
        }
    </style>
</head>
<body class="bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
    <!-- ── Fixed Sticky Header ──────────────────────────────────── -->
    <header id="headerBar" class="header-bar no-print">
        <button id="hamburgerBtn" class="header-hamburger" onclick="toggleSidebar()" aria-label="Toggle navigation">
            <svg id="hamburgerIcon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
        </button>
        <div class="header-title">${htmlEscape(cleanThoughtName)}</div>
        <span class="header-badge">Sections: ${itemCount}</span>
    </header>

    <div id="sidebarOverlay" class="sidebar-overlay no-print" onclick="toggleSidebar()"></div>

    <aside id="sidebarPanel" class="sidebar-panel no-print sidebar-scroll">
        <nav>
            <div class="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--accent)]/10">
                <div class="w-2 h-2 rounded-full" style="background: var(--accent);"></div>
                <p class="text-[10px] font-bold" style="color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase;">Sections</p>
            </div>
            <ul class="space-y-1">${sidebarLinks}</ul>
        </nav>
    </aside>

    <main class="content-area">
        <div class="max-w-5xl mx-auto py-12 px-8 lg:px-12">
            <header class="mb-20" id="toc">
                <h1 class="text-5xl sm:text-7xl font-extrabold text-[var(--text-primary)] tracking-tighter leading-[0.9] mb-8">
                    ${htmlEscape(cleanTitle)}</h1>
                ${description ? `<p class="text-base sm:text-lg text-slate-500 font-light mb-8 max-w-2xl">${htmlEscape(description)}</p>` : ""}
                <div class="flex items-center gap-4 mb-12">
                    <div class="accent-bar"></div>
                    <div class="report-meta" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
                        <span class="font-semibold" style="color:var(--text-primary);">${htmlEscape(cleanThoughtName)}</span>
                        <span class="meta-dot"></span>
                        <span class="item-count">Sections: ${itemCount}</span>
                        ${createdAt ? `<span class="meta-dot"></span><span>${createdAt}</span>` : ""}
                    </div>
                </div>
                <div class="toc-card p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <div class="p-1.5 rounded-lg" style="background:color-mix(in srgb,var(--accent) 15%, transparent);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                            </svg>
                        </div>
                        <p class="text-[10px] font-bold" style="color:var(--accent);letter-spacing:0.2em;text-transform:uppercase;">Quick Routing</p>
                    </div>
                    <div class="grid grid-cols-1 gap-0">${mainIndexHtml}</div>
                </div>
            </header>
            <article class="mt-40">${sections}</article>
            <footer class="mt-32 py-12 border-t border-[var(--accent)]/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-mono">
                <span>&copy; ${new Date().getFullYear()} ${htmlEscape(cleanTitle)}</span>
                <span class="uppercase tracking-widest">Generated with Korevel Xenon</span>
            </footer>
        </div>
    </main>

    <script>
    // ── Sidebar Toggle ──────────────────────────────────────────────
    function toggleSidebar(){
      var p=document.getElementById('sidebarPanel');
      var o=document.getElementById('sidebarOverlay');
      var i=document.getElementById('hamburgerIcon');
      if(!p||!o||!i)return;
      p.classList.toggle('open');
      o.classList.toggle('open');
      if(p.classList.contains('open')){
        i.innerHTML='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
      }else{
        i.innerHTML='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>';
      }
    }
    document.querySelectorAll('#sidebarPanel a').forEach(function(l){
      if(l)l.addEventListener('click',function(){ if(window.innerWidth<1024) toggleSidebar(); });
    });

    // ── Header scroll shadow ────────────────────────────────────────
    (function(){
      var h=document.getElementById('headerBar');
      if(h) window.addEventListener('scroll',function(){ h.classList.toggle('scrolled',window.scrollY>10); });
    })();

    // ── Blob opener (html / tailwind) ───────────────────────────────
    function openBlob(idx,mode){
      var sec=document.getElementById('thought-item-'+idx);
      if(!sec)return;
      var contentDiv=sec.querySelector('[class*="bg-white"][class*="border"][class*="rounded-xl"]');
      if(!contentDiv)return;
      var content=contentDiv.innerHTML;
      var doc;
      if(mode==='tailwind'){
        doc='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><script src="https://cdn.tailwindcss.com?plugins=typography"><'+'/script></head><body class="p-8 bg-slate-50"><div class="max-w-4xl mx-auto">'+content+'</div></body></html>';
      }else{
        doc='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Preview</title></head><body>'+content+'</body></html>';
      }
      var blob=new Blob([doc],{type:'text/html'});
      var url=URL.createObjectURL(blob);
      window.open(url,'_blank');
      setTimeout(function(){ URL.revokeObjectURL(url); },30000);
    }

    // ── Mermaid zoom + drag/pan ─────────────────────────────────────
    function mermaidGetWrap(idx){ return document.getElementById('mermaid-wrap-'+idx); }
    function mermaidSetTransform(wrap,s,tx,ty){
      wrap.setAttribute('data-scale',s);
      wrap.setAttribute('data-tx',tx);
      wrap.setAttribute('data-ty',ty);
      wrap.style.transform='scale('+s+') translate('+tx+'px,'+ty+'px)';
    }
    function mermaidZoom(idx,delta){
      var wrap=mermaidGetWrap(idx);
      if(!wrap)return;
      var s=parseFloat(wrap.getAttribute('data-scale')||'1');
      var tx=parseFloat(wrap.getAttribute('data-tx')||'0');
      var ty=parseFloat(wrap.getAttribute('data-ty')||'0');
      var ns=Math.max(0.25,Math.min(5,s+delta));
      mermaidSetTransform(wrap,ns,tx,ty);
    }
    function mermaidReset(idx){
      var wrap=mermaidGetWrap(idx);
      if(!wrap)return;
      mermaidSetTransform(wrap,1,0,0);
    }
    // Attach drag handlers to each mermaid container
    (function(){
      function initDrag(containerId){
        var container=document.getElementById(containerId);
        if(!container)return;
        var wrap=container.querySelector('.mermaid-zoom-wrapper');
        if(!wrap)return;
        var dragging=false,startX=0,startY=0,startTx=0,startTy=0;
        container.addEventListener('mousedown',function(e){
          var s=parseFloat(wrap.getAttribute('data-scale')||'1');
          if(s<=1)return; // only drag when zoomed in
          dragging=true;
          startX=e.clientX; startY=e.clientY;
          startTx=parseFloat(wrap.getAttribute('data-tx')||'0');
          startTy=parseFloat(wrap.getAttribute('data-ty')||'0');
          container.style.cursor='grabbing';
          e.preventDefault();
        });
        window.addEventListener('mousemove',function(e){
          if(!dragging)return;
          var s=parseFloat(wrap.getAttribute('data-scale')||'1');
          var dx=(e.clientX-startX)/s;
          var dy=(e.clientY-startY)/s;
          mermaidSetTransform(wrap,s,startTx+dx,startTy+dy);
        });
        window.addEventListener('mouseup',function(){
          if(dragging){ dragging=false; container.style.cursor='grab'; }
        });
      }
      // Initialize after DOM ready
      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',function(){
          var containers=document.querySelectorAll('[id^="mermaid-container-"]');
          containers.forEach(function(c){ initDrag(c.id); });
        });
      }else{
        var containers=document.querySelectorAll('[id^="mermaid-container-"]');
        containers.forEach(function(c){ initDrag(c.id); });
      }
    })();

    // ── SPA navigation ──────────────────────────────────────────────
    (function(){
      function nav(){
        var hash=window.location.hash||'#toc';
        var t=document.querySelector(hash);
        if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      }
      window.addEventListener('hashchange',nav);
      if(window.location.hash) setTimeout(nav,100);
    })();
    </script>
</body>
</html>`;
  }
}

// ─── Legacy compatibility wrappers ──────────────────────────────────────────

export function renderThoughtItemToHtml(
  neuron: BKMemoryNeuron,
  index: number,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): string {
  const nFmt = getNeuronFormat(neuron.id);
  return BKMemoryTemplate.thoughtSection({
    name: neuron.name || `Thought #${neuron.order + 1}`,
    format: nFmt,
    content: neuron.value,
    index,
  });
}

export function buildStandaloneHtml(
  neurons: BKMemoryNeuron[],
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): string {
  const sorted = [...neurons].sort((a, b) => a.order - b.order);
  const headInjections = new Set<string>();
  const sectionsHtml = sorted.map((neuron, i) => {
    const nFmt = getNeuronFormat(neuron.id);
    const injection = FORMAT_HEAD_INJECTIONS[nFmt];
    if (injection) headInjections.add(injection);
    return renderThoughtItemToHtml(neuron, i, getNeuronFormat);
  });

  const sidebarLinks = sorted.map((neuron, i) => {
    const header = cleanDisplayName(neuron.name || `Section ${i + 1}`);
    return `<li>
      <a href="#thought-item-${i}" class="group flex items-center py-2 text-sm text-slate-600 hover:text-[var(--accent)] transition-all duration-200">
        <span class="mr-3 text-[10px] font-mono text-slate-300 group-hover:text-[var(--accent)] font-semibold">${(i + 1).toString().padStart(2, "0")}</span>
        <span class="truncate">${htmlEscape(header)}</span>
      </a>
    </li>`;
  }).join("");

  const mainIndexHtml = sorted.map((neuron, i) => {
    const header = cleanDisplayName(neuron.name || `Section ${i + 1}`);
    const nFmt = getNeuronFormat(neuron.id);
    return `<a href="#thought-item-${i}" class="group block py-4 border-b border-[var(--accent)]/10 hover:bg-[var(--accent)]/5 transition-colors px-2 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="text-slate-900 font-medium group-hover:text-[var(--accent)] transition-colors">${i + 1}. ${htmlEscape(header)}</span>
        <span class="flex items-center gap-2">
          <span class="toc-badge">${htmlEscape(nFmt)}</span>
          <span class="text-[var(--accent)]/40 font-mono text-xs group-hover:text-[var(--accent)] transition-colors">Jump &rarr;</span>
        </span>
      </div>
    </a>`;
  }).join("");

  return BKMemoryTemplate.thoughtDocument({
    title: memory?.name || "Thought Report",
    thoughtName: memory?.name || "Thought Report",
    description: memory?.description || null,
    itemCount: sorted.length,
    createdAt: memory?.createdAt ? new Date(memory.createdAt).toLocaleDateString() : null,
    sections: sectionsHtml.join("\n"),
    sidebarLinks,
    mainIndexHtml,
    headInjections: Array.from(headInjections).join("\n"),
    accent: "#6d28d9",
    accentLight: "#8b5cf6",
    accentSoft: "#f5f3ff",
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — CSV Adapter
//
// Parses CSV content and renders it as an HTML table for export.
// React rendering is handled by RenderModule.View.tsx.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Parse CSV text into headers and rows.
 */
function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

/**
 * Parse a single CSV line handling simple quoted values.
 */
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
 * Build an HTML table string from parsed CSV.
 */
function csvToHtml(headers: string[], rows: string[][]): string {
  if (headers.length === 0) {
    return '<div class="rm-csv-empty">No data</div>';
  }

  const style = [
    `<style>`,
    `.rm-csv-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }`,
    `.rm-csv-table th { background: #f3f4f6; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; border: 1px solid #d1d5db; }`,
    `.rm-csv-table td { padding: 0.4rem 0.75rem; border: 1px solid #d1d5db; }`,
    `.rm-csv-table tr:nth-child(even) { background: #f9fafb; }`,
    `.rm-csv-table tr:hover { background: #eef2ff; }`,
    `</style>`,
  ].join("\n");

  let html = '<div class="rm-csv-wrapper" style="overflow-x:auto;padding:0.5rem;">';
  html += style;
  html += '<table class="rm-csv-table">';

  // Header
  html += "<thead><tr>";
  for (const header of headers) {
    html += `<th>${escapeHtml(header)}</th>`;
  }
  html += "</tr></thead>";

  // Body
  html += "<tbody>";
  for (const row of rows) {
    html += "<tr>";
    for (let i = 0; i < Math.max(row.length, headers.length); i++) {
      html += `<td>${escapeHtml(row[i] ?? "")}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * CSV Adapter
 *
 * Parses comma-separated values and renders them as an HTML table.
 */
export const csvAdapter: RenderAdapter = {
  format: "csv",
  displayName: "CSV Table",
  description: "Parses comma-separated values and renders them as a structured HTML table.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const { headers, rows } = parseCsv(content);
    const html = csvToHtml(headers, rows);
    return { raw: content, html, format: "csv" };
  },
};

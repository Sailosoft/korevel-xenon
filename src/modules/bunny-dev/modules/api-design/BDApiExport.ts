// BDApiExport.ts — render API docs to a standalone HTML document.

import type { BDAPI, BDAPIProperty } from "../../BDDomain.Types";
import { BDAPIReturnKind } from "../../BDDomain.Types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function propertyRows(api: BDAPI): string {
  if (api.properties.length === 0) return "<p>No parameters.</p>";
  return `<table><thead><tr><th>Name</th><th>Type</th><th>In</th><th>Required</th><th>Description</th></tr></thead><tbody>${api.properties
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(
          p.type,
        )}</td><td>${escapeHtml(p.location)}</td><td>${
          p.required ? "yes" : "no"
        }</td><td>${escapeHtml(p.description ?? "")}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function fieldRows(fields: BDAPIProperty[]): string {
  return `<table><thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>${fields
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(
          p.type,
        )}</td><td>${p.required ? "yes" : "no"}</td><td>${escapeHtml(
          p.description ?? "",
        )}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function returnRows(api: BDAPI): string {
  const parts: string[] = [];
  const fields = api.returns.properties ?? [];
  if (fields.length > 0) {
    parts.push(`<h4>Response fields</h4>${fieldRows(fields)}`);
  }
  const item = api.returns.item;
  if (
    item?.kind === BDAPIReturnKind.object &&
    (item.properties ?? []).length > 0
  ) {
    parts.push(`<h4>Response item</h4>${fieldRows(item.properties ?? [])}`);
  }
  return parts.join("");
}

function errorRows(api: BDAPI): string {
  if (!api.errors || api.errors.length === 0) return "";
  return `<h4>Errors</h4><table><thead><tr><th>Status</th><th>Message</th><th>Description</th></tr></thead><tbody>${api.errors
    .map(
      (e) =>
        `<tr><td>${e.status}</td><td>${escapeHtml(e.message)}</td><td>${escapeHtml(
          e.description ?? "",
        )}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

/** Build a standalone HTML document from a list of API specs. */
export function toApiDocumentHtml(apis: BDAPI[], title = "API Reference"): string {
  const body = apis
    .map(
      (api) => `
<section>
  <h2><span class="method method-${api.method}">${api.method.toUpperCase()}</span> ${escapeHtml(
    api.path,
  )}</h2>
  <p class="summary">${escapeHtml(api.summary ?? api.description)}</p>
  <p>${escapeHtml(api.description)}</p>
  <h4>Parameters</h4>
  ${propertyRows(api)}
  <h4>Response</h4>
  <p><code>${escapeHtml(api.returns.type)}</code> (${escapeHtml(
    api.returns.kind,
  )})</p>
  ${returnRows(api)}
  ${errorRows(api)}
</section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
  h1 { color: #1565c0; }
  h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: .35rem; margin-top: 2rem; }
  .method { font-size: .75rem; padding: .15rem .5rem; border-radius: 6px; color: #fff; background: #1976d2; vertical-align: middle; }
  .method-post { background: #16a34a; } .method-put { background: #d97706; }
  .method-patch { background: #7c3aed; } .method-delete { background: #dc2626; }
  .summary { color: #64748b; }
  table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
  th, td { border: 1px solid #e2e8f0; padding: .35rem .55rem; text-align: left; font-size: .875rem; }
  code { background: #f1f5f9; padding: .1rem .3rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
</body>
</html>`;
}

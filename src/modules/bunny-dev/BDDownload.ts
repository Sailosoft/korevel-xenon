// BDDownload.ts — small browser download / clipboard helpers shared by every
// BunnyDev export feature (Prisma schema, diagram, outline, architecture, files).

/** Trigger a browser download of a text payload. */
export function downloadText(
  filename: string,
  text: string,
  mime = "text/plain;charset=utf-8",
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  downloadBlob(filename, blob);
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Copy text to the clipboard. Resolves false when unsupported. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Open a text payload in a new browser tab (used by HTML exports). */
export function openTextTab(html: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

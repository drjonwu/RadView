/**
 * RadView — Shared File Download Utility
 *
 * Centralizes the blob → object URL → anchor → click → cleanup pattern
 * used by CSV/text export functions across views.
 */

/**
 * Triggers a browser download of the given content as a file.
 *
 * @param content - The text content to download
 * @param filename - The suggested filename for the download
 * @param mimeType - The MIME type for the blob (defaults to text/csv)
 */
export function downloadBlob(
  content: string,
  filename: string,
  mimeType: string = "text/csv;charset=utf-8;"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

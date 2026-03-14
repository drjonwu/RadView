/**
 * Filename sanitizer — strips anything that isn't alphanumeric, underscore,
 * hyphen, or period.  Truncates to 100 characters to stay within OS limits.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

/**
 * RadView — Shared Constants
 *
 * Centralized constants used across components and services.
 * Keeps magic strings/numbers out of component code.
 */

import type { ImagingModality } from "../types";

/** Modality → hex color mapping for timeline dots and charts */
export const MODALITY_COLORS: Record<string, string> = {
  CT: "#2563eb",       // blue-600
  MRI: "#7c3aed",      // violet-600
  "X-RAY": "#6b7280",  // gray-500
  US: "#059669",        // emerald-600
  PET: "#ea580c",       // orange-600
  NM: "#ca8a04",        // yellow-600
  FLUORO: "#0891b2",    // cyan-600
  MAMMO: "#db2777",     // pink-600
  DEXA: "#65a30d",      // lime-600
  ANGIO: "#e11d48",     // rose-600
  OTHER: "#475569",     // slate-600
  DEFAULT: "#94a3b8",   // slate-400
} satisfies Record<ImagingModality | "DEFAULT", string>;

/** Modality → human-readable label */
export const MODALITY_LABELS: Record<string, string> = {
  CT: "CT Scan",
  MRI: "MRI",
  "X-RAY": "X-Ray",
  US: "Ultrasound",
  PET: "PET Scan",
  NM: "Nuclear Medicine",
  FLUORO: "Fluoroscopy",
  MAMMO: "Mammography",
  DEXA: "DEXA Scan",
  ANGIO: "Angiography",
  OTHER: "Other",
};

/** Date helper: format YYYY-MM-DD to a readable string */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Date helper: days between two YYYY-MM-DD strings.
 *  Appends T00:00:00 to force local-timezone parsing and avoid
 *  the off-by-one that occurs when browsers parse bare YYYY-MM-DD as UTC. */
export const daysBetween = (dateA: string, dateB: string): number => {
  const a = new Date(dateA + "T00:00:00").getTime();
  const b = new Date(dateB + "T00:00:00").getTime();
  return Math.abs(Math.round((b - a) / (1000 * 60 * 60 * 24)));
};

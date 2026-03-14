/**
 * RadView — Core Type System
 *
 * All shared types, enums, and interfaces used across the application.
 * Mirrors the architecture spec (Section 4 & 5).
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum ImagingModality {
  XRAY = "X-RAY",
  CT = "CT",
  MRI = "MRI",
  ULTRASOUND = "US",
  PET = "PET",
  NUCLEAR = "NM",
  FLUOROSCOPY = "FLUORO",
  MAMMOGRAPHY = "MAMMO",
  DEXA = "DEXA",
  ANGIOGRAPHY = "ANGIO",
  OTHER = "OTHER",
}

export enum ImagingStatus {
  ORDERED = "ORDERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
  RECOMMENDED = "RECOMMENDED", // e.g. "KIV MRI if symptoms persist"
}

export enum ContrastType {
  NONE = "NONE",
  IV_CONTRAST = "IV_CONTRAST",
  ORAL_CONTRAST = "ORAL_CONTRAST",
  BOTH = "BOTH",
  GADOLINIUM = "GADOLINIUM",
  UNKNOWN = "UNKNOWN",
}

export enum ErrorCategory {
  AUTH = "AUTH",
  RATE_LIMIT = "RATE_LIMIT",
  SAFETY = "SAFETY",
  SERVER = "SERVER",
  PARSING = "PARSING",
  VALIDATION = "VALIDATION",
  UNKNOWN = "UNKNOWN",
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════

export class AppError extends Error {
  constructor(
    public category: ErrorCategory,
    public override message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGING EVENT & ORDER
// ═══════════════════════════════════════════════════════════════

export interface ImagingEvent {
  id?: string;
  date: string; // YYYY-MM-DD
  modality: ImagingModality;
  bodyRegion: string; // e.g. "Abdomen/Pelvis", "Brain", "Chest"
  studyDescription: string;
  status: ImagingStatus;
  contrast: ContrastType;
  indication: string;
  keyFindings: string[];
  recommendation: string;
  orderingPhysician?: string;
  facility?: string;
  source_quote: string;
  quote_start?: number;
  quote_end?: number;
  radiationDose?: string;
}

export interface ImagingOrder {
  modality: ImagingModality;
  bodyRegion: string;
  studyDescription: string;
  contrast: ContrastType;
  clinicalIndication: string;
  orderingPhysician: string;
  urgency: "ROUTINE" | "URGENT" | "STAT";
  patientId: string;
}

// ═══════════════════════════════════════════════════════════════
// PATIENT PROFILE
// ═══════════════════════════════════════════════════════════════

export interface PatientProfile {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  dob: string; // YYYY-MM-DD
  age: number;
  gender: string;
  conditions: string[];
  allergies: string[];
  renalFunction?: {
    eGFR: number;
    creatinine: number;
    date: string;
  };
  pregnancyStatus?: "PREGNANT" | "NOT_PREGNANT" | "UNKNOWN";
  notes: string; // Full clinical notes
  priorReports: string; // Aggregated prior radiology reports
}

// ═══════════════════════════════════════════════════════════════
// APPROPRIATENESS TYPES
// ═══════════════════════════════════════════════════════════════

export type AppropriatenessRating =
  | "USUALLY_APPROPRIATE" // ACR score 7-9
  | "MAY_BE_APPROPRIATE" // ACR score 4-6
  | "USUALLY_NOT_APPROPRIATE"; // ACR score 1-3

export type AlertSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface AppropriatenessAlert {
  ruleId: string;
  title: string;
  severity: AlertSeverity;
  rating: AppropriatenessRating;
  description: string;
  recommendation: string;
  alternativeStudies?: string[];
  citation: string;
  citationUrl: string;
}

// ═══════════════════════════════════════════════════════════════
// RULES ENGINE TYPES
// ═══════════════════════════════════════════════════════════════

export type CheckType =
  | "REPEAT_SCAN"
  | "CONTRAST_SAFETY"
  | "APPROPRIATENESS"
  | "RADIATION_DOSE";

export type RuleSource = "ACR" | "CHOOSING_WISELY" | "INSTITUTIONAL";

export interface AppropriatenessRule {
  id: string;
  title: string;
  source: RuleSource;
  targetModalities: ImagingModality[];
  targetBodyRegions: string[]; // empty = any
  clinicalScenarioKeywords: string[]; // empty = skip keyword check
  checkType: CheckType;
  minIntervalDays?: number; // for REPEAT_SCAN
  contraindications?: string[]; // patient conditions that flag this
  rating: AppropriatenessRating;
  descriptionTemplate: (study: string, context: string) => string;
  recommendation: string;
  alternativeStudies?: string[];
  citation: string;
  citationUrl: string;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION & ANALYSIS RESULTS
// ═══════════════════════════════════════════════════════════════

export interface ExtractionResult {
  patientId: string;
  events: ImagingEvent[];
}

export interface AppropriatenessResult {
  alerts: AppropriatenessAlert[];
  overallVerdict: AppropriatenessRating;
  summary: string;
  priorScanSummary: string;
}

export interface CompleteAnalysisResult {
  extraction: ExtractionResult;
  appropriateness: AppropriatenessResult;
}

// ═══════════════════════════════════════════════════════════════
// RAG TYPES
// ═══════════════════════════════════════════════════════════════

export interface RAGChunk {
  text: string;
  source: "notes" | "reports";
  startIdx: number;
  endIdx: number;
  embedding?: number[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  context?: RAGChunk[]; // Retrieved chunks used for this response
  isError?: boolean; // True if this message represents an error response
}

// ═══════════════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════════════

export type ViewState =
  | "SOURCE_EVIDENCE"
  | "IMAGING_TIMELINE"
  | "BODY_REGION_HISTORY"
  | "APPROPRIATENESS_ANALYSIS"
  | "ORDER_COMPARISON"
  | "ASK_COPILOT"
  | "AUDIT_TRAIL";

export type AnalysisStatus =
  | "IDLE"
  | "EXTRACTING"
  | "RUNNING_RULES"
  | "COMPLETE"
  | "ERROR";

// ═══════════════════════════════════════════════════════════════
// ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const ImagingEventSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .refine(
      (dateStr) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return (
          dt.getFullYear() === y &&
          dt.getMonth() === m - 1 &&
          dt.getDate() === d
        );
      },
      { message: "Invalid calendar date (e.g., month 13 or day 32 is not allowed)" }
    ),
  modality: z.enum([
    "X-RAY", "CT", "MRI", "US", "PET", "NM",
    "FLUORO", "MAMMO", "DEXA", "ANGIO", "OTHER",
  ]),
  bodyRegion: z.string().min(1),
  studyDescription: z.string().min(1),
  status: z.enum(["ORDERED", "COMPLETED", "CANCELLED", "PENDING", "RECOMMENDED"]),
  contrast: z.enum([
    "NONE", "IV_CONTRAST", "ORAL_CONTRAST",
    "BOTH", "GADOLINIUM", "UNKNOWN",
  ]),
  indication: z.string().min(1),
  keyFindings: z.array(z.string()).default([]),
  recommendation: z.string().default(""),
  orderingPhysician: z.string().optional(),
  source_quote: z.string().min(1),
  quote_start: z.number().nonnegative("quote_start must be non-negative").optional(),
  quote_end: z.number().nonnegative("quote_end must be non-negative").optional(),
}).refine(
  (evt) => {
    // If both offsets present, start must be < end
    if (evt.quote_start != null && evt.quote_end != null) {
      return evt.quote_start < evt.quote_end;
    }
    return true;
  },
  { message: "quote_start must be less than quote_end", path: ["quote_start"] }
);

export const ExtractionResultSchema = z.object({
  patientId: z.string(),
  events: z.array(ImagingEventSchema),
});

export const RootResponseSchema = z.object({
  extraction: ExtractionResultSchema,
});

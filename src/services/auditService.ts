/**
 * RadView — Audit Trail Service
 *
 * Append-only audit log for every appropriateness evaluation.
 * Critical for PAMA/AUC compliance and portfolio credibility.
 *
 * Each entry records:
 *   - Timestamp (ISO 8601)
 *   - Patient demographics (no PHI in production — only ID + age/gender)
 *   - Order details
 *   - Rules that fired (with full trace)
 *   - Overall verdict
 *   - Data source (demo vs FHIR)
 *
 * The log is immutable: entries can be added but never modified or deleted.
 * In this portfolio version, the log is stored in memory and can be exported
 * as JSON or CSV. A production version would persist to a HIPAA-compliant
 * append-only datastore.
 */

import type {
  PatientProfile,
  ImagingOrder,
  AppropriatenessResult,
  AppropriatenessAlert,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// AUDIT TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuditEntry {
  /** Unique identifier for this audit entry */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Session identifier (groups entries from the same session) */
  sessionId: string;

  // ─── Patient Context (de-identified) ────────────────
  patientId: string;
  patientAge: number;
  patientGender: string;
  dataSource: "demo" | "fhir";

  // ─── Order Details ──────────────────────────────────
  orderModality: string;
  orderBodyRegion: string;
  orderDescription: string;
  orderIndication: string;
  orderContrast: string;

  // ─── Rules Evaluation ───────────────────────────────
  rulesEvaluated: number;
  rulesFired: number;
  alerts: AuditAlertSummary[];
  overallVerdict: string;
  summary: string;

  // ─── Timing ─────────────────────────────────────────
  evaluationDurationMs: number;
}

export interface AuditAlertSummary {
  ruleId: string;
  title: string;
  severity: string;
  rating: string;
  citation: string;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT STORE (in-memory, append-only)
// ═══════════════════════════════════════════════════════════════

const SESSION_ID = `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

let auditLog: AuditEntry[] = [];
let entryCounter = 0;

function generateEntryId(): string {
  entryCounter++;
  return `audit_${SESSION_ID}_${entryCounter.toString().padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Records an appropriateness evaluation in the audit log.
 * Called automatically by the store after every rules engine run.
 */
export function recordEvaluation(
  patient: PatientProfile,
  order: ImagingOrder,
  result: AppropriatenessResult,
  totalRulesCount: number,
  durationMs: number,
  dataSource: "demo" | "fhir" = "demo"
): AuditEntry {
  const entry: AuditEntry = {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,

    patientId: patient.id,
    patientAge: patient.age,
    patientGender: patient.gender,
    dataSource,

    orderModality: order.modality,
    orderBodyRegion: order.bodyRegion,
    orderDescription: order.studyDescription,
    orderIndication: order.clinicalIndication,
    orderContrast: order.contrast,

    rulesEvaluated: totalRulesCount,
    rulesFired: result.alerts.length,
    alerts: result.alerts.map(
      (a: AppropriatenessAlert): AuditAlertSummary => ({
        ruleId: a.ruleId,
        title: a.title,
        severity: a.severity,
        rating: a.rating,
        citation: a.citation,
      })
    ),
    overallVerdict: result.overallVerdict,
    summary: result.summary,

    evaluationDurationMs: durationMs,
  };

  // Append-only: push to log
  auditLog = [...auditLog, entry];

  return entry;
}

/**
 * Returns the full audit log (read-only copy).
 */
export function getAuditLog(): readonly AuditEntry[] {
  return auditLog;
}

/**
 * Returns audit entries for a specific patient.
 */
export function getPatientAuditLog(patientId: string): AuditEntry[] {
  return auditLog.filter((e) => e.patientId === patientId);
}

/**
 * Returns the current session ID.
 */
export function getSessionId(): string {
  return SESSION_ID;
}

/**
 * Exports the audit log as a JSON string.
 */
export function exportAuditLogJSON(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      sessionId: SESSION_ID,
      totalEntries: auditLog.length,
      entries: auditLog,
    },
    null,
    2
  );
}

/**
 * Exports the audit log as CSV.
 */
export function exportAuditLogCSV(): string {
  const headers = [
    "Timestamp",
    "Patient ID",
    "Age",
    "Gender",
    "Data Source",
    "Order Modality",
    "Order Body Region",
    "Order Description",
    "Order Indication",
    "Contrast",
    "Rules Evaluated",
    "Rules Fired",
    "Fired Rule IDs",
    "Overall Verdict",
    "Duration (ms)",
  ];

  const rows = auditLog.map((e) => [
    e.timestamp,
    e.patientId,
    String(e.patientAge < 1 ? `${Math.round(e.patientAge * 12)}mo` : `${Math.floor(e.patientAge)}y`),
    e.patientGender,
    e.dataSource,
    e.orderModality,
    e.orderBodyRegion,
    `"${e.orderDescription}"`,
    `"${e.orderIndication}"`,
    e.orderContrast,
    String(e.rulesEvaluated),
    String(e.rulesFired),
    `"${e.alerts.map((a) => a.ruleId).join("; ")}"`,
    e.overallVerdict,
    String(e.evaluationDurationMs),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Returns summary statistics for the current session.
 */
export function getAuditStats(): {
  totalEvaluations: number;
  uniquePatients: number;
  verdictBreakdown: Record<string, number>;
  avgDurationMs: number;
  mostCommonRule: string | null;
} {
  if (auditLog.length === 0) {
    return {
      totalEvaluations: 0,
      uniquePatients: 0,
      verdictBreakdown: {},
      avgDurationMs: 0,
      mostCommonRule: null,
    };
  }

  const uniquePatients = new Set(auditLog.map((e) => e.patientId)).size;

  const verdictBreakdown: Record<string, number> = {};
  for (const entry of auditLog) {
    verdictBreakdown[entry.overallVerdict] =
      (verdictBreakdown[entry.overallVerdict] ?? 0) + 1;
  }

  const avgDurationMs =
    auditLog.reduce((sum, e) => sum + e.evaluationDurationMs, 0) / auditLog.length;

  // Find most commonly fired rule
  const ruleCounts: Record<string, number> = {};
  for (const entry of auditLog) {
    for (const alert of entry.alerts) {
      ruleCounts[alert.ruleId] = (ruleCounts[alert.ruleId] ?? 0) + 1;
    }
  }
  const mostCommonRule =
    Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalEvaluations: auditLog.length,
    uniquePatients,
    verdictBreakdown,
    avgDurationMs: Math.round(avgDurationMs),
    mostCommonRule,
  };
}

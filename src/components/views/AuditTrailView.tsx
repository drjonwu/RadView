/**
 * RadView — Audit Trail View
 *
 * Displays the immutable log of every appropriateness evaluation
 * performed in this session. Critical for PAMA/AUC compliance
 * and demonstrates regulatory awareness in the portfolio.
 *
 * Features:
 *   - Chronological list of all evaluations
 *   - Per-entry detail expansion (rules fired, severity, citations)
 *   - Session statistics dashboard
 *   - Export as JSON or CSV
 */

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Download,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import {
  getAuditStats,
  exportAuditLogJSON,
  exportAuditLogCSV,
  getSessionId,
} from "../../services/auditService";
import type { AuditEntry } from "../../services/auditService";

// ─── Verdict colors ─────────────────────────────────────────

const VERDICT_CONFIG: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
  USUALLY_APPROPRIATE: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
  MAY_BE_APPROPRIATE: { bg: "bg-amber-100", text: "text-amber-800", icon: AlertTriangle },
  USUALLY_NOT_APPROPRIATE: { bg: "bg-red-100", text: "text-red-800", icon: Shield },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const config = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.USUALLY_APPROPRIATE;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {verdict.replace(/_/g, " ")}
    </span>
  );
}

// ─── Entry detail row ────────────────────────────────────────

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  const timestamp = new Date(entry.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {entry.orderDescription}
            </span>
            <VerdictBadge verdict={entry.overallVerdict} />
            {entry.dataSource === "fhir" && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                FHIR
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {entry.patientId.replace("fhir_", "")} &middot;{" "}
            {entry.patientAge < 1
              ? `${Math.round(entry.patientAge * 12)}mo`
              : `${Math.floor(entry.patientAge)}y`}{" "}
            {entry.patientGender} &middot; {entry.rulesFired}/{entry.rulesEvaluated} rules fired
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500">{timestamp}</p>
          <p className="text-[10px] text-gray-400">{entry.evaluationDurationMs}ms</p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50 space-y-3">
          {/* Order details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-gray-500 font-medium">Modality:</span>{" "}
              <span className="text-gray-900">{entry.orderModality}</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Region:</span>{" "}
              <span className="text-gray-900">{entry.orderBodyRegion}</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Contrast:</span>{" "}
              <span className="text-gray-900">{entry.orderContrast}</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Source:</span>{" "}
              <span className="text-gray-900">{entry.dataSource}</span>
            </div>
          </div>

          <div className="text-xs">
            <span className="text-gray-500 font-medium">Indication:</span>{" "}
            <span className="text-gray-700">{entry.orderIndication}</span>
          </div>

          {/* Fired rules */}
          {entry.alerts.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">
                Rules Fired ({entry.alerts.length})
              </p>
              <div className="space-y-1.5">
                {entry.alerts.map((alert) => (
                  <div
                    key={alert.ruleId}
                    className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200 text-xs"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                        alert.severity === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : alert.severity === "MEDIUM"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <p className="text-gray-500 mt-0.5">
                        <code className="text-[10px] bg-gray-100 px-1 rounded">
                          {alert.ruleId}
                        </code>{" "}
                        &middot; {alert.citation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              No rules fired — order deemed appropriate.
            </p>
          )}

          {/* Entry metadata */}
          <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-200">
            Entry ID: {entry.id} &middot; Session: {entry.sessionId}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────

export const AuditTrailView = () => {
  const auditLog = useAppStore((s) => s.auditLog);
  const refreshAuditLog = useAppStore((s) => s.refreshAuditLog);

  // Refresh on mount
  useEffect(() => {
    refreshAuditLog();
  }, [refreshAuditLog]);

  const stats = getAuditStats();

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([exportAuditLogJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radview_audit_${getSessionId()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportCSV = useCallback(() => {
    const blob = new Blob([exportAuditLogCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radview_audit_${getSessionId()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {auditLog.length} entries
          </span>
        </div>

        {auditLog.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              <FileText className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Session stats */}
      {stats.totalEvaluations > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Evaluations
            </div>
            <p className="text-xl font-semibold text-gray-900">{stats.totalEvaluations}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              Avg Duration
            </div>
            <p className="text-xl font-semibold text-gray-900">{stats.avgDurationMs}ms</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              Unique Patients
            </div>
            <p className="text-xl font-semibold text-gray-900">{stats.uniquePatients}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              Top Rule
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {stats.mostCommonRule ?? "—"}
            </p>
          </div>
        </div>
      )}

      {/* Verdict breakdown */}
      {stats.totalEvaluations > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Verdict Distribution</p>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.verdictBreakdown).map(([verdict, count]) => (
              <div key={verdict} className="flex items-center gap-2">
                <VerdictBadge verdict={verdict} />
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry list */}
      {auditLog.length > 0 ? (
        <div className="space-y-2">
          {[...auditLog].reverse().map((entry) => (
            <AuditEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No evaluations yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Run an appropriateness analysis on any patient to see the audit trail.
            Every evaluation is logged with full rule traces, timestamps, and citations.
          </p>
        </div>
      )}

      {/* PAMA compliance note */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-800">
        <p className="font-semibold mb-1">PAMA / AUC Compliance Context</p>
        <p>
          Under the Protecting Access to Medicare Act (PAMA), ordering providers must consult
          an appropriate use criteria (AUC) mechanism for advanced imaging orders. This audit
          trail captures the consultation decision, including which rules were evaluated and
          which fired, satisfying the documentation requirements for CMS reporting.
        </p>
      </div>
    </div>
  );
};

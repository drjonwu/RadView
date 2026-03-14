import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { MODALITY_COLORS, MODALITY_LABELS, formatDate } from "../../utils/constants";
import type { ImagingStatus, ImagingEvent } from "../../types";
import { Download, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { sanitizeFilename } from "../../utils/sanitize";
import { downloadBlob } from "../../utils/download";
import { useToast } from "../common/Toast";

/** Status badge styling — color-coded to convey meaning at a glance */
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  ORDERED: { bg: "bg-blue-50", text: "text-blue-700", label: "Ordered" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
  RECOMMENDED: { bg: "bg-purple-50", text: "text-purple-700", label: "Recommended" },
};

function getStatusStyle(status: ImagingStatus) {
  return STATUS_STYLES[status] ?? { bg: "bg-gray-50", text: "text-gray-600", label: status };
}

/** Determine which time-period bucket an event falls into relative to today */
function getTimePeriod(dateStr: string): string {
  const now = new Date();
  const eventDate = new Date(dateStr + "T00:00:00");
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Future events
  if (diffDays > 0) return "Upcoming";

  // Past events
  const absDays = Math.abs(diffDays);
  if (absDays <= 30) return "This Month";
  if (absDays <= 90) return "Last 3 Months";
  if (absDays <= 365) return "Last 12 Months";
  if (absDays <= 730) return "1–2 Years Ago";
  return "Over 2 Years Ago";
}

/** Order for time-period sections (most recent first, upcoming at top) */
const PERIOD_ORDER = [
  "Upcoming",
  "This Month",
  "Last 3 Months",
  "Last 12 Months",
  "1–2 Years Ago",
  "Over 2 Years Ago",
];

interface TimePeriodGroup {
  period: string;
  events: ImagingEvent[];
}

/** Group events by time period, maintaining chronological order within each group */
function groupByTimePeriod(events: ImagingEvent[]): TimePeriodGroup[] {
  const buckets: Record<string, ImagingEvent[]> = {};

  for (const evt of events) {
    const period = getTimePeriod(evt.date);
    if (!buckets[period]) buckets[period] = [];
    buckets[period].push(evt);
  }

  return PERIOD_ORDER
    .filter((p) => buckets[p] && buckets[p].length > 0)
    .map((p) => ({ period: p, events: buckets[p] }));
}

/** Export timeline events as CSV */
function exportTimelineCSV(events: ImagingEvent[], patientName: string) {
  const headers = ["Date", "Modality", "Body Region", "Study Description", "Status", "Contrast", "Indication", "Key Findings", "Recommendation"];
  const rows = events.map((e) => [
    e.date,
    e.modality,
    e.bodyRegion,
    e.studyDescription,
    e.status,
    e.contrast,
    e.indication,
    e.keyFindings.join("; "),
    e.recommendation,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadBlob(
    csvContent,
    `imaging-timeline-${sanitizeFilename(patientName)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/** Collapsible time-period section header */
const PeriodHeader = ({
  period,
  count,
  isOpen,
  onToggle,
}: {
  period: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const isUpcoming = period === "Upcoming";
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        isUpcoming
          ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      }`}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{period}</span>
      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
        isUpcoming ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
      }`}>
        {count} {count === 1 ? "study" : "studies"}
      </span>
    </button>
  );
};

export const ImagingTimelineView = () => {
  const analysisResult = useAppStore((s) => s.analysisResult);
  const patient = useAppStore((s) => s.patient);
  const events = analysisResult?.extraction.events ?? [];
  const { show: showToast, ToastElement } = useToast();

  /** Collect the unique modalities actually present in the timeline for the legend */
  const presentModalities = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => seen.add(e.modality));
    return Array.from(seen).sort();
  }, [events]);

  /** Group events by time period */
  const groups = useMemo(() => groupByTimePeriod(events), [events]);

  /** Track which sections are expanded (all open by default) */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const togglePeriod = (period: string) => {
    setCollapsed((prev) => ({ ...prev, [period]: !prev[period] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Imaging Timeline</h2>
          <p className="text-sm text-gray-500">
            Chronological view of all imaging studies extracted from the medical record.
          </p>
        </div>
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            {ToastElement}
            <button
              onClick={() => { exportTimelineCSV(events, patient.name); showToast("Downloaded!"); }}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Export timeline as CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-10 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-blue-500" />
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">No imaging events yet</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click <span className="font-semibold text-blue-600">Run Analysis</span> to extract imaging events
            from the clinical record, or import a patient from a FHIR server.
          </p>
        </div>
      ) : (
        <>
          {/* ── Modality Legend ── */}
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modality</span>
            {presentModalities.map((mod) => (
              <span key={mod} className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: MODALITY_COLORS[mod] ?? MODALITY_COLORS.DEFAULT }}
                />
                {MODALITY_LABELS[mod] ?? mod}
              </span>
            ))}
          </div>

          {/* ── Grouped Timeline ── */}
          <div className="space-y-4">
            {groups.map((group) => {
              const isOpen = !collapsed[group.period];
              return (
                <div key={group.period}>
                  <PeriodHeader
                    period={group.period}
                    count={group.events.length}
                    isOpen={isOpen}
                    onToggle={() => togglePeriod(group.period)}
                  />

                  {isOpen && (
                    <div className="relative mt-3 ml-2">
                      {/* Continuous vertical timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

                      <div className="space-y-3 relative">
                        {group.events.map((event) => {
                          const statusStyle = getStatusStyle(event.status);
                          const dotColor = MODALITY_COLORS[event.modality] ?? MODALITY_COLORS.DEFAULT;
                          return (
                            <div
                              key={event.id ?? `${event.date}-${event.modality}-${event.bodyRegion}`}
                              className="flex gap-4"
                            >
                              {/* Timeline dot */}
                              <div className="flex flex-col items-center flex-shrink-0 relative z-10">
                                <div
                                  className="w-4 h-4 rounded-full mt-3 ring-[3px] ring-white"
                                  style={{ backgroundColor: dotColor }}
                                  role="img"
                                  aria-label={`${event.modality} study`}
                                />
                              </div>

                              {/* Event card */}
                              <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatDate(event.date)}
                                  </span>
                                  <span
                                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: dotColor }}
                                  >
                                    {MODALITY_LABELS[event.modality] ?? event.modality}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                    {statusStyle.label}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-800">
                                  {event.studyDescription}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {event.indication}
                                </p>
                                {event.keyFindings.length > 0 && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Findings: {event.keyFindings.join("; ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

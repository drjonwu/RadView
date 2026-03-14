import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { MODALITY_COLORS, MODALITY_LABELS, formatDate, daysBetween } from "../../utils/constants";
import type { ImagingEvent, ImagingOrder } from "../../types";
import { ArrowRight, Clock, AlertTriangle, CheckCircle, Minus, GitCompare } from "lucide-react";

/**
 * Find prior studies that are most relevant to the current order:
 * 1. Same body region (highest relevance)
 * 2. Same modality but different region
 * 3. Related body regions (e.g., Abdomen ↔ Abdomen/Pelvis)
 */
function findRelevantPriorStudies(
  events: ImagingEvent[],
  order: ImagingOrder
): { sameRegion: ImagingEvent[]; sameModality: ImagingEvent[]; related: ImagingEvent[] } {
  const completed = events.filter((e) => e.status === "COMPLETED");
  const orderRegionLower = order.bodyRegion.toLowerCase();

  const sameRegion: ImagingEvent[] = [];
  const sameModality: ImagingEvent[] = [];
  const related: ImagingEvent[] = [];

  for (const evt of completed) {
    const evtRegionLower = evt.bodyRegion.toLowerCase();
    const regionMatch =
      evtRegionLower === orderRegionLower ||
      evtRegionLower.includes(orderRegionLower) ||
      orderRegionLower.includes(evtRegionLower);

    if (regionMatch) {
      sameRegion.push(evt);
    } else if (evt.modality === order.modality) {
      sameModality.push(evt);
    } else {
      // Check for loosely related body regions
      const relatedPairs: [string, string][] = [
        ["chest", "lung"],
        ["abdomen", "pelvis"],
        ["head", "brain"],
        ["spine", "lumbar"],
        ["spine", "cervical"],
        ["spine", "thoracic"],
      ];
      const isRelated = relatedPairs.some(
        ([a, b]) =>
          (evtRegionLower.includes(a) && orderRegionLower.includes(b)) ||
          (evtRegionLower.includes(b) && orderRegionLower.includes(a))
      );
      if (isRelated) related.push(evt);
    }
  }

  return { sameRegion, sameModality, related };
}

/** Comparison row: side-by-side field */
const ComparisonRow = ({
  label,
  current,
  prior,
  highlight,
}: {
  label: string;
  current: string;
  prior: string;
  highlight?: boolean;
}) => (
  <div className={`grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-1 sm:gap-4 px-4 py-2.5 ${highlight ? "bg-amber-50" : ""}`}>
    <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
    <div className="flex sm:contents gap-4">
      <span className="text-sm text-gray-800 flex-1"><span className="text-xs text-blue-500 sm:hidden">Current: </span>{current}</span>
      <span className="text-sm text-gray-800 flex-1"><span className="text-xs text-gray-400 sm:hidden">Prior: </span>{prior || <span className="text-gray-400">—</span>}</span>
    </div>
  </div>
);

/** Card showing a single prior study with comparison context */
const PriorStudyCard = ({
  event,
  order,
}: {
  event: ImagingEvent;
  order: ImagingOrder;
}) => {
  const today = new Date().toISOString().split("T")[0];
  const daysAgo = daysBetween(event.date, today);
  const isSameModality = event.modality === order.modality;
  const contrastMatch = event.contrast === order.contrast;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Card header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: MODALITY_COLORS[event.modality] ?? MODALITY_COLORS.DEFAULT }}
          />
          <span className="text-sm font-semibold text-gray-900">{event.studyDescription}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {daysAgo} days ago
        </div>
      </div>

      {/* Comparison grid */}
      <div className="divide-y divide-gray-100">
        <div className="hidden sm:grid grid-cols-[140px_1fr_1fr] gap-4 px-4 py-2 bg-gray-50/50">
          <span className="text-xs font-medium text-gray-400"></span>
          <span className="text-xs font-semibold text-blue-600 uppercase">Current Order</span>
          <span className="text-xs font-semibold text-gray-600 uppercase">Prior Study</span>
        </div>

        <ComparisonRow
          label="Date"
          current="Pending"
          prior={formatDate(event.date)}
        />
        <ComparisonRow
          label="Modality"
          current={MODALITY_LABELS[order.modality] ?? order.modality}
          prior={MODALITY_LABELS[event.modality] ?? event.modality}
          highlight={!isSameModality}
        />
        <ComparisonRow
          label="Body Region"
          current={order.bodyRegion}
          prior={event.bodyRegion}
        />
        <ComparisonRow
          label="Contrast"
          current={order.contrast.replace(/_/g, " ")}
          prior={event.contrast.replace(/_/g, " ")}
          highlight={!contrastMatch}
        />
        <ComparisonRow
          label="Indication"
          current={order.clinicalIndication}
          prior={event.indication}
        />
      </div>

      {/* Findings from prior study */}
      {event.keyFindings.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-1.5">Prior Findings</h5>
          <ul className="space-y-1">
            {event.keyFindings.map((f, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <Minus className="w-3 h-3 mt-1 text-gray-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation from prior study */}
      {event.recommendation && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Prior Recommendation</h5>
          <p className="text-sm text-gray-700">{event.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export const ComparisonView = () => {
  const analysisResult = useAppStore((s) => s.analysisResult);
  const order = useAppStore((s) => s.order);
  const events = analysisResult?.extraction.events ?? [];

  const { sameRegion, sameModality, related } = useMemo(
    () => findRelevantPriorStudies(events, order),
    [events, order]
  );

  const hasResults = events.length > 0;
  const hasRelevant = sameRegion.length > 0 || sameModality.length > 0 || related.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Order Comparison</h2>
        <p className="text-sm text-gray-500">
          Compare the current imaging order against relevant prior studies.
        </p>
      </div>

      {/* Current order summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-900">Current Order</h3>
        </div>
        <p className="font-medium text-blue-900">{order.studyDescription}</p>
        <p className="text-sm text-blue-700 mt-1">
          {order.clinicalIndication}
        </p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-blue-600">
          <span>Modality: {MODALITY_LABELS[order.modality] ?? order.modality}</span>
          <span>Region: {order.bodyRegion}</span>
          <span>Contrast: {order.contrast.replace(/_/g, " ")}</span>
          <span>Urgency: {order.urgency}</span>
        </div>
      </div>

      {!hasResults ? (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-10 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitCompare className="w-7 h-7 text-blue-500" />
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">No prior studies to compare</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click <span className="font-semibold text-blue-600">Run Analysis</span> to extract imaging
            history and compare the current order against relevant prior studies.
          </p>
        </div>
      ) : !hasRelevant ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
          <p className="text-gray-700 font-medium">No directly comparable prior studies found</p>
          <p className="text-sm text-gray-500">
            This patient has {events.filter((e) => e.status === "COMPLETED").length} completed studies,
            but none match the body region or modality of the current order.
          </p>
        </div>
      ) : (
        <>
          {/* Same body region */}
          {sameRegion.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Same Body Region ({sameRegion.length})
                </h3>
                <span className="text-xs text-gray-500">— most relevant for comparison</span>
              </div>
              <div className="space-y-4">
                {sameRegion.map((evt) => (
                  <PriorStudyCard key={evt.id ?? evt.date + evt.modality} event={evt} order={order} />
                ))}
              </div>
            </section>
          )}

          {/* Same modality, different region */}
          {sameModality.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Same Modality, Different Region ({sameModality.length})
                </h3>
              </div>
              <div className="space-y-4">
                {sameModality.map((evt) => (
                  <PriorStudyCard key={evt.id ?? evt.date + evt.modality} event={evt} order={order} />
                ))}
              </div>
            </section>
          )}

          {/* Related regions */}
          {related.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Related Studies ({related.length})
                </h3>
              </div>
              <div className="space-y-4">
                {related.map((evt) => (
                  <PriorStudyCard key={evt.id ?? evt.date + evt.modality} event={evt} order={order} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

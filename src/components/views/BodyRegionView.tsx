import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";
import { MODALITY_COLORS, MODALITY_LABELS } from "../../utils/constants";
import type { ImagingEvent } from "../../types";

/** Assign a subtle color accent per body region for quick visual scanning */
const REGION_ACCENTS: Record<string, { bg: string; border: string; text: string }> = {
  "ABDOMEN":        { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700"  },
  "ABDOMEN/PELVIS": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  "CHEST":          { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700"   },
  "HEAD":           { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  "SPINE":          { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700"   },
  "LUMBAR SPINE":   { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700"   },
  "CERVICAL SPINE": { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700"   },
  "KNEE":           { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700"  },
  "PELVIS":         { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-700"   },
  "EXTREMITY":      { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
};
const DEFAULT_ACCENT = { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" };

export const BodyRegionView = () => {
  const analysisResult = useAppStore((s) => s.analysisResult);
  const events = analysisResult?.extraction.events ?? [];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleRegion = (r: string) => setCollapsed((p) => ({ ...p, [r]: !p[r] }));

  const { grouped, regions } = useMemo(() => {
    const g = events.reduce<Record<string, ImagingEvent[]>>((acc, evt) => {
      const region = evt.bodyRegion || "Unknown";
      if (!acc[region]) acc[region] = [];
      acc[region].push(evt);
      return acc;
    }, {});
    return { grouped: g, regions: Object.keys(g).sort() };
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Imaging by Body Region</h2>
        <p className="text-sm text-gray-500">
          Longitudinal imaging history grouped by anatomical area.
        </p>
      </div>

      {regions.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-10 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-7 h-7 text-blue-500" />
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">No imaging by region yet</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click <span className="font-semibold text-blue-600">Run Analysis</span> to extract imaging events
            and group them by anatomical body region.
          </p>
        </div>
      ) : (
        regions.map((region) => {
          const accent = REGION_ACCENTS[region.toUpperCase()] ?? DEFAULT_ACCENT;
          const isOpen = !collapsed[region];
          const evts = grouped[region];
          return (
            <section key={region} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRegion(region)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 border-b ${accent.border} ${accent.bg} transition-colors hover:opacity-90`}
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                <h3 className={`text-sm font-semibold uppercase tracking-wide ${accent.text}`}>
                  {region}
                </h3>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${accent.bg} ${accent.text} border ${accent.border}`}>
                  {evts.length} {evts.length === 1 ? "study" : "studies"}
                </span>
              </button>
              {isOpen && (
                <div className="divide-y divide-gray-100">
                  {evts.map((evt) => (
                    <div key={evt.id ?? `${evt.date}-${evt.modality}-${evt.studyDescription}`} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-gray-500 tabular-nums">{evt.date}</span>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: MODALITY_COLORS[evt.modality] ?? MODALITY_COLORS.DEFAULT }}
                        />
                        <span className="font-medium text-gray-800">
                          {evt.studyDescription}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          evt.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                          evt.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                          evt.status === "ORDERED" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-50 text-gray-600"
                        }`}>
                          {evt.status}
                        </span>
                      </div>
                      {evt.keyFindings.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1.5 pl-5 border-l-2 border-gray-200 ml-1">
                          {evt.keyFindings.join("; ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};

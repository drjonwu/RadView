import { useState, type ReactNode } from "react";
import {
  FileText,
  Clock,
  LayoutGrid,
  ShieldAlert,
  GitCompare,
  MessageCircle,
  ClipboardList,
  Server,
  Heart,
  AlertCircle,
  Activity,
  X,
  ChevronDown,
  Users,
  MoreHorizontal,
} from "lucide-react";
import type { ViewState } from "../../types";
import { useAppStore } from "../../store/useAppStore";
import { ALL_PATIENTS } from "../../data/patients";

const VIEW_TABS: { id: ViewState; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: "SOURCE_EVIDENCE", label: "Source Evidence", shortLabel: "Source", icon: <FileText className="w-4 h-4" /> },
  { id: "IMAGING_TIMELINE", label: "Timeline", shortLabel: "Timeline", icon: <Clock className="w-4 h-4" /> },
  { id: "BODY_REGION_HISTORY", label: "By Region", shortLabel: "Region", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "APPROPRIATENESS_ANALYSIS", label: "Appropriateness", shortLabel: "Assess", icon: <ShieldAlert className="w-4 h-4" /> },
  { id: "ORDER_COMPARISON", label: "Comparison", shortLabel: "Compare", icon: <GitCompare className="w-4 h-4" /> },
  { id: "ASK_COPILOT", label: "Ask Copilot", shortLabel: "Copilot", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "AUDIT_TRAIL", label: "Audit Trail", shortLabel: "Audit", icon: <ClipboardList className="w-4 h-4" /> },
];

// ═══════════════════════════════════════════════════════════════
// MOBILE CONDITIONS LIST (truncated)
// ═══════════════════════════════════════════════════════════════

const MOBILE_MAX_CONDITIONS = 4;

const MobileConditionsList = ({ conditions }: { conditions: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? conditions : conditions.slice(0, MOBILE_MAX_CONDITIONS);
  const hiddenCount = conditions.length - MOBILE_MAX_CONDITIONS;

  return (
    <div className="flex items-start gap-2">
      <Heart className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
      <div className="flex flex-wrap gap-1.5">
        {visible.map((c) => (
          <span key={c} className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-xs font-medium">
            {c}
          </span>
        ))}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MOBILE PATIENT SHEET
// ═══════════════════════════════════════════════════════════════

const MobilePatientSheet = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const selectedPatientId = useAppStore((s) => s.selectedPatientId);
  const selectPatient = useAppStore((s) => s.selectPatient);
  const setShowFhirModal = useAppStore((s) => s.setShowFhirModal);
  const isFromFhir = useAppStore((s) => s.isFromFhir);
  const patient = useAppStore((s) => s.patient);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
        {/* Handle + close */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100"
            aria-label="Close patient panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 pb-6 pt-2 space-y-4">
          {/* Patient selector */}
          <div>
            <label htmlFor="mobile-patient-select" className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              {isFromFhir ? "FHIR Patient" : "Demo Patient"}
            </label>

            {isFromFhir ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="font-semibold text-emerald-900">{patient.name}</p>
                <p className="text-sm text-emerald-600 mt-0.5">MRN {patient.mrn}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {ALL_PATIENTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { selectPatient(p.id); onClose(); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                      selectedPatientId === p.id
                        ? "bg-blue-50 border-2 border-blue-300 font-semibold text-blue-900"
                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500 ml-2">MRN {p.mrn}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setShowFhirModal(true); onClose(); }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
            >
              <Server className="w-4 h-4" />
              Import from FHIR
            </button>
          </div>

          {/* Clinical snapshot */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clinical Snapshot</p>

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{patient.age}{patient.gender?.[0]}</span>
              <span className="text-gray-300">|</span>
              <span>DOB {patient.dob}</span>
            </div>

            {patient.conditions.length > 0 && (
              <MobileConditionsList conditions={patient.conditions} />
            )}

            {patient.allergies.length > 0 ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <span key={a} className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-green-600 font-medium">NKDA</span>
              </div>
            )}

            {patient.renalFunction && (
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className={`text-xs font-medium ${
                  patient.renalFunction.eGFR < 30 ? "text-red-600" :
                  patient.renalFunction.eGFR < 60 ? "text-amber-600" :
                  "text-gray-600"
                }`}>
                  eGFR {patient.renalFunction.eGFR} · Cr {patient.renalFunction.creatinine}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// MOBILE BOTTOM TAB BAR
// ═══════════════════════════════════════════════════════════════

/** Primary tabs shown directly in mobile nav; remaining go under "More" */
const PRIMARY_TAB_COUNT = 4;

const MobileBottomNav = () => {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const patient = useAppStore((s) => s.patient);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs = VIEW_TABS.slice(0, PRIMARY_TAB_COUNT);
  const overflowTabs = VIEW_TABS.slice(PRIMARY_TAB_COUNT);
  const isOverflowActive = overflowTabs.some((t) => t.id === activeView);

  return (
    <>
      <MobilePatientSheet open={patientSheetOpen} onClose={() => setPatientSheetOpen(false)} />

      {/* "More" popup overlay */}
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-14 right-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[180px]">
            {overflowTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveView(tab.id); setMoreOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  activeView === tab.id ? "text-blue-600 bg-blue-50 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 safe-area-bottom"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch justify-around">
          {/* Patient button */}
          <button
            onClick={() => setPatientSheetOpen(true)}
            className="flex flex-col items-center justify-center px-2 py-2 text-gray-500 hover:text-blue-600 active:bg-gray-50 transition-colors flex-shrink-0"
            aria-label="Switch patient"
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              <ChevronDown className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1 text-gray-400" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight truncate max-w-[56px]">
              {patient.name.split(" ").pop()}
            </span>
          </button>

          {/* Primary view tabs */}
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              aria-current={activeView === tab.id ? "page" : undefined}
              className={`flex flex-col items-center justify-center px-2 py-2 transition-colors flex-shrink-0 ${
                activeView === tab.id
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600 active:bg-gray-50"
              }`}
            >
              {tab.icon}
              <span className={`text-[10px] mt-0.5 leading-tight ${
                activeView === tab.id ? "font-semibold" : ""
              }`}>
                {tab.shortLabel}
              </span>
              {activeView === tab.id && (
                <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
              )}
            </button>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center px-2 py-2 transition-colors flex-shrink-0 ${
              isOverflowActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600 active:bg-gray-50"
            }`}
            aria-label="More views"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className={`text-[10px] mt-0.5 leading-tight ${isOverflowActive ? "font-semibold" : ""}`}>
              More
            </span>
            {isOverflowActive && (
              <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// CONDITIONS LIST (truncated with +N more)
// ═══════════════════════════════════════════════════════════════

const MAX_VISIBLE_CONDITIONS = 3;

const ConditionsList = ({ conditions }: { conditions: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? conditions : conditions.slice(0, MAX_VISIBLE_CONDITIONS);
  const hiddenCount = conditions.length - MAX_VISIBLE_CONDITIONS;

  return (
    <div className="flex items-start gap-1.5">
      <Heart className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
      <div className="flex flex-wrap gap-1">
        {visible.map((c) => (
          <span
            key={c}
            className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-medium leading-tight"
          >
            {c}
          </span>
        ))}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium leading-tight hover:bg-gray-200 transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium leading-tight hover:bg-gray-200 transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DESKTOP SIDEBAR
// ═══════════════════════════════════════════════════════════════

const DesktopSidebar = () => {
  const selectedPatientId = useAppStore((s) => s.selectedPatientId);
  const activeView = useAppStore((s) => s.activeView);
  const selectPatient = useAppStore((s) => s.selectPatient);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setShowFhirModal = useAppStore((s) => s.setShowFhirModal);
  const isFromFhir = useAppStore((s) => s.isFromFhir);
  const patient = useAppStore((s) => s.patient);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      {/* Patient Selector */}
      <div className="p-4 border-b border-gray-200">
        <label htmlFor="patient-select" className="block text-xs font-medium text-gray-500 mb-2">
          {isFromFhir ? "FHIR PATIENT" : "DEMO PATIENT"}
        </label>

        {isFromFhir ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
            <p className="font-medium text-emerald-900">{patient.name}</p>
            <p className="text-xs text-emerald-600 mt-0.5">MRN {patient.mrn}</p>
          </div>
        ) : (
          <select
            id="patient-select"
            value={selectedPatientId}
            onChange={(e) => selectPatient(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ALL_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — MRN {p.mrn}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowFhirModal(true)}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
        >
          <Server className="w-3.5 h-3.5" />
          Import from FHIR
        </button>
      </div>

      {/* Patient Clinical Snapshot */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium text-gray-800">{patient.age}{patient.gender?.[0]}</span>
            <span className="text-gray-300">|</span>
            <span>DOB {patient.dob}</span>
          </div>

          {patient.conditions.length > 0 && (
            <ConditionsList conditions={patient.conditions} />
          )}

          {patient.allergies.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium leading-tight"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              <span className="text-[10px] text-green-600 font-medium">NKDA</span>
            </div>
          )}

          {patient.renalFunction && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className={`text-[10px] font-medium ${
                patient.renalFunction.eGFR < 30 ? "text-red-600" :
                patient.renalFunction.eGFR < 60 ? "text-amber-600" :
                "text-gray-600"
              }`}>
                eGFR {patient.renalFunction.eGFR} · Cr {patient.renalFunction.creatinine}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View Navigation — grouped into sections */}
      <nav className="flex-1 p-2">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Data</p>
        {VIEW_TABS.slice(0, 3).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            aria-current={activeView === tab.id ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === tab.id
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Analysis</p>
        {VIEW_TABS.slice(3).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            aria-current={activeView === tab.id ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === tab.id
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORTED SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Sidebar = () => (
  <>
    <DesktopSidebar />
    <MobileBottomNav />
  </>
);

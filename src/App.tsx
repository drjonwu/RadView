import { useRef, useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import {
  SourceEvidenceView,
  ImagingTimelineView,
  BodyRegionView,
  AppropriatenessView,
  ComparisonView,
  CopilotView,
  AuditTrailView,
} from "./components/views";
import { FhirImportModal } from "./components/views/FhirImportModal";
import { Play, Loader2, AlertCircle, User, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { formatDate } from "./utils/constants";

/** Skeleton placeholder shown while analysis is running */
const AnalysisSkeleton = () => (
  <div className="space-y-4 animate-pulse" aria-label="Loading analysis...">
    <div className="h-5 bg-gray-200 rounded w-48" />
    <div className="h-3 bg-gray-100 rounded w-72" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-64 mx-auto" />
      <div className="h-3 bg-gray-100 rounded w-96 mx-auto" />
    </div>
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-56" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
    </div>
  </div>
);

const ViewRouter = () => {
  const activeView = useAppStore((s) => s.activeView);
  const analysisStatus = useAppStore((s) => s.analysisStatus);
  const analysisResult = useAppStore((s) => s.analysisResult);

  // Show skeleton for views that depend on analysis results when analysis is running
  const isAnalyzing = analysisStatus === "EXTRACTING" || analysisStatus === "RUNNING_RULES";
  const needsResults = activeView !== "SOURCE_EVIDENCE" && activeView !== "ASK_COPILOT";
  if (isAnalyzing && needsResults && !analysisResult) {
    return <AnalysisSkeleton />;
  }

  const view = (() => {
    switch (activeView) {
      case "SOURCE_EVIDENCE":
        return <SourceEvidenceView />;
      case "IMAGING_TIMELINE":
        return <ImagingTimelineView />;
      case "BODY_REGION_HISTORY":
        return <BodyRegionView />;
      case "APPROPRIATENESS_ANALYSIS":
        return <AppropriatenessView />;
      case "ORDER_COMPARISON":
        return <ComparisonView />;
      case "ASK_COPILOT":
        return <CopilotView />;
      case "AUDIT_TRAIL":
        return <AuditTrailView />;
      default: {
        const _exhaustive: never = activeView;
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            Unknown view: {String(_exhaustive)}
          </div>
        );
      }
    }
  })();

  return <>{view}</>;
};

const AnalysisControls = () => {
  const analysisStatus = useAppStore((s) => s.analysisStatus);
  const error = useAppStore((s) => s.error);
  const patient = useAppStore((s) => s.patient);
  const order = useAppStore((s) => s.order);
  const runAnalysis = useAppStore((s) => s.runAnalysis);
  const isFromFhir = useAppStore((s) => s.isFromFhir);
  const analysisResult = useAppStore((s) => s.analysisResult);

  const isAnalyzing =
    analysisStatus === "EXTRACTING" || analysisStatus === "RUNNING_RULES";
  const hasResults = !!analysisResult;

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2">
      {/* Single compact bar: patient identity + order + action */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* Patient identity cluster */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">{patient.name}</span>
            {isFromFhir && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                FHIR
              </span>
            )}
          </div>
        </div>

        {/* Patient details — compact inline pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="px-1.5 py-0.5 bg-slate-50 rounded">{patient.age < 1 ? `${Math.round(patient.age * 12)}mo` : `${patient.age}y`}{patient.gender?.[0]}</span>
          <span className="px-1.5 py-0.5 bg-slate-50 rounded hidden sm:inline">MRN {patient.mrn}</span>
          <span className="px-1.5 py-0.5 bg-slate-50 rounded hidden md:inline">DOB {formatDate(patient.dob)}</span>
          {patient.allergies.length > 0 && patient.allergies[0] !== "Nil known drug allergies" && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              ALLERGY: {patient.allergies.map((a) => a.split("(")[0].trim()).join(", ")}
            </span>
          )}
        </div>

        {/* Separator */}
        <div className="hidden lg:block w-px h-5 bg-gray-200" />

        {/* Order under review — truncated on small screens */}
        <div className="text-xs min-w-0 flex items-center gap-1.5 text-gray-500">
          <span className="font-medium flex-shrink-0">Reviewing:</span>
          <span className="font-semibold text-gray-800 truncate max-w-[300px]">
            {order.studyDescription}
          </span>
        </div>

        {/* Spacer pushes button right */}
        <div className="flex-1" />

        {/* Error indicator */}
        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{error.message}</span>
          </div>
        )}

        {/* Analysis button with state feedback */}
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
            isAnalyzing
              ? "bg-blue-100 text-blue-600 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </>
          ) : hasResults ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Re-run
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Analysis
            </>
          )}
        </button>
      </div>
    </div>
  );
};

function App() {
  const mainRef = useRef<HTMLElement>(null);
  const activeView = useAppStore((s) => s.activeView);

  // Move focus to main content whenever the view changes (a11y)
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [activeView]);

  return (
    <ErrorBoundary fallbackTitle="RadView encountered an error">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <div className="h-screen flex flex-col">
        <Header />
        <AnalysisControls />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main ref={mainRef} id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6" tabIndex={-1}>
            <ErrorBoundary fallbackTitle="This view encountered an error">
              <ViewRouter />
            </ErrorBoundary>
          </main>
        </div>
        {/* Persistent clinical disclaimer — hidden on mobile where bottom nav takes priority */}
        <div className="hidden md:flex items-center justify-center gap-2 bg-slate-50 border-t border-gray-200 text-gray-400 text-[11px] text-center px-4 py-1.5 flex-shrink-0">
          <Info className="w-3 h-3 flex-shrink-0" />
          <span>Clinical decision-support demonstration. Findings require physician verification. This tool does not provide medical advice.</span>
        </div>
      </div>
      {/* FHIR Import Modal (rendered at root level for proper z-index stacking) */}
      <FhirImportModal />
    </ErrorBoundary>
  );
}

export default App;

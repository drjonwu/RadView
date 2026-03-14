import { useMemo, useState, useCallback } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Copy, Check, ChevronDown, ChevronRight, User, Heart, FileText, ClipboardList, Activity, AlertCircle } from "lucide-react";

/** Delimiter used in the raw notes to separate clinical notes from radiology reports */
const REPORTS_DELIMITER = "===== PREVIOUS RADIOLOGY REPORTS =====";

/**
 * Split the raw notes blob into clinical notes and prior radiology reports.
 */
function splitSourceEvidence(notes: string, priorReports: string) {
  if (priorReports && priorReports.trim().length > 0) {
    return { clinicalNotes: notes.trim(), radiologyReports: priorReports.trim() };
  }
  const delimIdx = notes.indexOf(REPORTS_DELIMITER);
  if (delimIdx === -1) {
    return { clinicalNotes: notes.trim(), radiologyReports: "" };
  }
  return {
    clinicalNotes: notes.slice(0, delimIdx).trim(),
    radiologyReports: notes.slice(delimIdx + REPORTS_DELIMITER.length).trim(),
  };
}

/**
 * Parse clinical notes into structured sections for visual display.
 * Falls back to raw text if structure isn't recognized.
 */
interface NoteSection {
  title: string;
  content: string;
  icon: "user" | "heart" | "pill" | "stethoscope" | "clipboard" | "file";
}

function parseClinicalNotes(raw: string): NoteSection[] | null {
  // Try to detect structured sections by common clinical headings
  const sectionPatterns = [
    { pattern: /={3,}\s*PATIENT SUMMARY\s*={3,}/i, title: "Patient Summary", icon: "heart" as const },
    { pattern: /Current Medications:/i, title: "Current Medications", icon: "pill" as const },
    { pattern: /(?:CURRENT|PENDING) IMAGING ORDER/i, title: "Current Imaging Order", icon: "stethoscope" as const },
    { pattern: /(?:PREVIOUS|PRIOR) (?:IMAGING|RADIOLOGY)/i, title: "Previous Imaging", icon: "clipboard" as const },
    { pattern: /CLINICAL (?:QUESTION|CONTEXT)/i, title: "Clinical Context", icon: "file" as const },
  ];

  // Extract patient header (everything before first ===== section)
  const firstSectionIdx = raw.indexOf("=====");
  if (firstSectionIdx === -1) return null; // Can't parse, fall back to raw

  const headerBlock = raw.slice(0, firstSectionIdx).trim();
  const bodyBlock = raw.slice(firstSectionIdx);

  const sections: NoteSection[] = [];

  // Patient demographics header
  if (headerBlock.length > 0) {
    sections.push({ title: "Patient Demographics", content: headerBlock, icon: "user" });
  }

  // Split remaining content by ===== section markers
  const parts = bodyBlock.split(/={3,}[^=]*={3,}/i).filter((s) => s.trim().length > 0);
  const headings = bodyBlock.match(/={3,}\s*([^=]+?)\s*={3,}/gi) ?? [];

  for (let idx = 0; idx < parts.length; idx++) {
    const content = parts[idx].trim();
    if (!content) continue;

    // Try to match heading to a known pattern
    const heading = headings[idx] ?? "";
    let matched = false;
    for (const sp of sectionPatterns) {
      if (sp.pattern.test(heading) || sp.pattern.test(content.slice(0, 80))) {
        sections.push({ title: sp.title, content, icon: sp.icon });
        matched = true;
        break;
      }
    }
    if (!matched && content.length > 20) {
      // Derive title from first line or heading
      const cleanHeading = heading.replace(/={3,}/g, "").trim();
      sections.push({
        title: cleanHeading || "Additional Notes",
        content,
        icon: "file",
      });
    }
  }

  return sections.length >= 2 ? sections : null; // Need at least 2 sections to be useful
}

const SECTION_ICONS = {
  user: User,
  heart: Heart,
  pill: Activity,
  stethoscope: AlertCircle,
  clipboard: ClipboardList,
  file: FileText,
};

/** Copy-to-clipboard button with visual feedback */
const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
      aria-label={`Copy ${label} to clipboard`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span className="text-green-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  );
};

/** Collapsible section for structured notes */
const StructuredSection = ({ section, defaultOpen = true }: { section: NoteSection; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const IconComp = SECTION_ICONS[section.icon];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        <IconComp className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">{section.title}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {section.content}
        </div>
      )}
    </div>
  );
};

export const SourceEvidenceView = () => {
  const patient = useAppStore((s) => s.patient);
  const [showRaw, setShowRaw] = useState(false);

  const { clinicalNotes, radiologyReports } = useMemo(
    () => splitSourceEvidence(patient.notes, patient.priorReports),
    [patient.notes, patient.priorReports]
  );

  const structuredSections = useMemo(
    () => parseClinicalNotes(clinicalNotes),
    [clinicalNotes]
  );

  const hasStructured = structuredSections !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Source Evidence</h2>
          <p className="text-sm text-gray-500">
            Clinical notes and prior radiology reports for{" "}
            <span className="font-medium text-gray-700">{patient.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clinicalNotes.length > 0 && (
            <CopyButton text={clinicalNotes + (radiologyReports ? "\n\n" + radiologyReports : "")} label="all source evidence" />
          )}
          {hasStructured && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              {showRaw ? "Structured View" : "Raw Text"}
            </button>
          )}
        </div>
      </div>

      {/* Clinical Notes — structured or raw */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Clinical Notes</h3>
        {clinicalNotes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
            No clinical notes available for this patient.
          </div>
        ) : hasStructured && !showRaw ? (
          <div className="space-y-3">
            {structuredSections.map((s, i) => (
              <StructuredSection key={i} section={s} defaultOpen={s.title !== "Patient Demographics"} />
            ))}
          </div>
        ) : (
          <pre className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[60vh] overflow-y-auto">
            {clinicalNotes}
          </pre>
        )}
      </section>

      {/* Prior Radiology Reports */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Prior Radiology Reports</h3>
          {radiologyReports.length > 0 && (
            <CopyButton text={radiologyReports} label="radiology reports" />
          )}
        </div>
        {radiologyReports.length > 0 ? (
          <pre className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[60vh] overflow-y-auto">
            {radiologyReports}
          </pre>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
            No prior radiology reports available for this patient.
          </div>
        )}
      </section>
    </div>
  );
};

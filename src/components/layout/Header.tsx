import { useState, useRef, useEffect } from "react";
import { Github, Info, X, Shield, BookOpen } from "lucide-react";

/**
 * RadView Logo — Custom inline SVG depicting a stylized cross-sectional
 * imaging scan with concentric arcs (like a CT gantry / scan beam).
 */
const RadViewLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0"
    aria-hidden="true"
  >
    <circle cx="18" cy="18" r="18" fill="#1e3a5f" />
    <path d="M7 18 A11 11 0 0 1 18 7" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M9 22 A10 10 0 0 1 22 9" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
    <path d="M11 26 A12 12 0 0 1 26 11" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.2" />
    <ellipse cx="18" cy="18" rx="7" ry="8" fill="#2563eb" opacity="0.15" />
    <ellipse cx="18" cy="18" rx="7" ry="8" stroke="#93c5fd" strokeWidth="1.2" fill="none" />
    <line x1="18" y1="11.5" x2="18" y2="24.5" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
    <line x1="12" y1="18" x2="14" y2="18" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="22" y1="18" x2="24" y2="18" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="18" y1="10" x2="18" y2="8" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="18" y1="26" x2="18" y2="28" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="18" cy="18" r="1.5" fill="#60a5fa" />
  </svg>
);

/** Info popover showing architecture and guideline details */
const InfoPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
        aria-label="About RadView"
        aria-expanded={isOpen}
      >
        <Info className="w-4 h-4" />
        <span className="hidden sm:inline">About</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-fade-in-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">About RadView</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              Radiology imaging decision-support tool that evaluates orders against
              evidence-based appropriateness criteria using a deterministic rules engine.
            </p>

            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700">18 Deterministic Rules</p>
                <p className="text-xs text-gray-500">No LLM in the decision path. 100% auditable, reproducible logic.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Evidence-Based Guidelines</p>
                <p className="text-xs text-gray-500">ACR Appropriateness Criteria, Choosing Wisely, Fleischner Society, Lung-RADS, BI-RADS</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Built by Jonathan Wu, M.D.</span>
              <span className="text-gray-300">|</span>
              <span className="text-[10px] text-gray-400">React + TypeScript + Zustand</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Header = () => (
  <header className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 md:px-6 py-2.5">
    <div className="flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <RadViewLogo />
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">
            Rad<span className="text-blue-400">View</span>
          </h1>
          <p className="text-[11px] text-slate-400 tracking-wide hidden sm:block">
            Radiology Imaging Decision Support
          </p>
        </div>
      </div>

      {/* Compact action links */}
      <div className="flex items-center gap-2">
        <InfoPopover />

        <a
          href="https://github.com/drjonwu/RadView"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
          aria-label="View source on GitHub"
        >
          <Github className="w-4 h-4" />
          <span className="hidden sm:inline">Source</span>
        </a>
      </div>
    </div>
  </header>
);

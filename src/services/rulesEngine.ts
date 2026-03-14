/**
 * RadView — Deterministic Appropriateness Rules Engine
 *
 * Evaluates an imaging order against evidence-based guidelines:
 *   - ACR Appropriateness Criteria
 *   - Choosing Wisely recommendations
 *   - Contrast safety checks (eGFR, allergy, pregnancy)
 *   - Fleischner Society lung nodule follow-up
 *   - Pediatric radiation safety (Image Gently)
 *
 * This module is ENTIRELY deterministic — no LLM calls.
 * All logic is transparent and auditable.
 */

import {
  ImagingModality,
  ContrastType,
} from "../types";
import type {
  ImagingEvent,
  ImagingOrder,
  PatientProfile,
  AppropriatenessAlert,
  AppropriatenessResult,
  AppropriatenessRule,
  AlertSeverity,
} from "../types";
import { daysBetween } from "../utils/constants";
import { logger } from "../utils/logger";

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const normalize = (s: string): string => s.toLowerCase().trim();

/**
 * Returns today's date in YYYY-MM-DD using the local timezone (not UTC).
 *
 * TIMEZONE NOTE: This intentionally uses local date components to match
 * daysBetween() in constants.ts, which appends "T00:00:00" to force
 * local-timezone parsing. Both functions use the same timezone convention
 * so interval calculations are consistent.
 */
const today = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Formats age for clinical display.
 * Infants < 1 year → months (e.g., "3 months")
 * Children 1-2 years → years with precision (e.g., "1.5 years")
 * Others → whole years (e.g., "5 years")
 */
const formatAge = (ageInYears: number): string => {
  if (ageInYears < 1) {
    const months = Math.round(ageInYears * 12);
    return `${months} month${months !== 1 ? "s" : ""}`;
  }
  if (ageInYears < 2) {
    return `${ageInYears} years`;
  }
  return `${Math.floor(ageInYears)} years`;
};

/**
 * Checks whether two body region strings overlap.
 * Handles slash-separated compound regions symmetrically:
 *   "Abdomen/Pelvis" ↔ "Abdomen" ✓
 *   "Pelvis" ↔ "Abdomen/Pelvis" ✓
 *   "Chest" ↔ "Abdomen" ✗
 */
const bodyRegionsOverlap = (regionA: string, regionB: string): boolean => {
  const segmentsA = normalize(regionA).split("/").map((s) => s.trim());
  const segmentsB = normalize(regionB).split("/").map((s) => s.trim());
  return segmentsA.some((a) =>
    segmentsB.some((b) => a.includes(b) || b.includes(a))
  );
};

/**
 * Finds the most recent COMPLETED prior scan matching modality + body region.
 * Body region matching is symmetric via bodyRegionsOverlap().
 */
const findMostRecentPrior = (
  events: ImagingEvent[],
  modality: ImagingModality,
  bodyRegion: string
): ImagingEvent | null => {
  const matches = events
    .filter(
      (e) =>
        e.status === "COMPLETED" &&
        e.modality === modality &&
        bodyRegionsOverlap(e.bodyRegion, bodyRegion)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matches[0] ?? null;
};

/**
 * Deduplicates alerts with the same ruleId.
 */
const deduplicateAlerts = (
  alerts: AppropriatenessAlert[]
): AppropriatenessAlert[] =>
  alerts.filter(
    (alert, index, self) =>
      index === self.findIndex((t) => t.ruleId === alert.ruleId)
  );

// ═══════════════════════════════════════════════════════════════
// RULES DATABASE
// ═══════════════════════════════════════════════════════════════

// ─── ACR Appropriateness Criteria ───────────────────────────

const ACR_RULES: AppropriatenessRule[] = [
  {
    id: "ACR_CT_HEAD_MINOR_TRAUMA",
    title: "ACR: CT Head for Minor Head Trauma",
    source: "ACR",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["head", "brain"],
    clinicalScenarioKeywords: [
      "minor trauma",
      "minor head injury",
      "low risk",
      "no loc",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for minor head trauma without loss of consciousness or focal neurological deficit. ACR rates this as Usually Not Appropriate.`,
    recommendation:
      "Clinical observation recommended. Consider Canadian CT Head Rule or NEXUS II criteria to determine if imaging is warranted.",
    alternativeStudies: [
      "Clinical observation",
      "Skull X-ray (if concern for depressed fracture)",
    ],
    checkType: "APPROPRIATENESS",
    citation: "ACR Appropriateness Criteria: Head Trauma",
    citationUrl: "https://acsearch.acr.org/docs/69481/Narrative/",
  },
  {
    id: "ACR_LUMBAR_SPINE_ACUTE_LBP",
    title: "ACR: Imaging for Acute Low Back Pain",
    source: "ACR",
    targetModalities: [ImagingModality.MRI, ImagingModality.CT],
    targetBodyRegions: ["lumbar", "spine", "lumbosacral"],
    clinicalScenarioKeywords: [
      "low back pain",
      "lbp",
      "acute back pain",
      "mechanical back pain",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for acute low back pain without red flag symptoms. Imaging within 6 weeks of onset is Usually Not Appropriate per ACR guidelines.`,
    recommendation:
      "Conservative management for 4-6 weeks. Image only if red flags present: progressive neurological deficit, cauda equina syndrome, suspected cancer, infection, or fracture.",
    alternativeStudies: [
      "Conservative management",
      "Physical therapy referral",
    ],
    checkType: "APPROPRIATENESS",
    citation: "ACR Appropriateness Criteria: Low Back Pain",
    citationUrl: "https://acsearch.acr.org/docs/69483/Narrative/",
  },
  {
    id: "ACR_CT_ABDOMEN_REPEAT",
    title: "ACR: Repeat CT Abdomen/Pelvis",
    source: "ACR",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["abdomen", "pelvis", "abdomen/pelvis"],
    clinicalScenarioKeywords: [], // Triggered by repeat scan logic, not keywords
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (study, context) =>
      `${study} ordered, but patient had a similar CT abdomen/pelvis ${context}. Consider whether prior study adequately addresses the clinical question.`,
    recommendation:
      "Review prior CT findings. If clinical question is unchanged and prior study is recent (<90 days), repeat imaging may not add diagnostic value.",
    checkType: "REPEAT_SCAN",
    minIntervalDays: 90,
    citation: "ACR Appropriateness Criteria",
    citationUrl:
      "https://www.acr.org/Clinical-Resources/ACR-Appropriateness-Criteria",
  },
];

// ─── Choosing Wisely ────────────────────────────────────────

const CHOOSING_WISELY_RULES: AppropriatenessRule[] = [
  {
    id: "CW_PREOP_CXR",
    title: "Choosing Wisely: Routine Preoperative Chest X-Ray",
    source: "CHOOSING_WISELY",
    targetModalities: [ImagingModality.XRAY],
    targetBodyRegions: ["chest"],
    clinicalScenarioKeywords: [
      "preoperative",
      "pre-op",
      "pre op",
      "surgical clearance",
      "preop",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, _context) =>
      `Routine preoperative chest X-ray ordered. Choosing Wisely recommends against routine preop CXR for patients with unremarkable history and physical exam.`,
    recommendation:
      "Do not order routine preoperative CXR unless there is a specific clinical indication (e.g., new cardiopulmonary symptoms, known cardiopulmonary disease).",
    checkType: "APPROPRIATENESS",
    citation: "Choosing Wisely: ACR Recommendations",
    citationUrl:
      "https://www.choosingwisely.org/societies/american-college-of-radiology/",
  },
  {
    id: "CW_CT_PE_LOW_RISK",
    title: "Choosing Wisely: CT-PA for Low Probability PE",
    source: "CHOOSING_WISELY",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["chest", "pulmonary"],
    clinicalScenarioKeywords: [
      "pe",
      "pulmonary embolism",
      "shortness of breath",
      "chest pain",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, _context) =>
      `CT pulmonary angiography ordered without documented moderate-to-high pretest probability of PE. Consider Wells Score or PERC rule first.`,
    recommendation:
      "Apply Wells Score or PERC rule. If low pretest probability, obtain D-dimer first. Image only if D-dimer elevated or clinical probability is moderate-to-high.",
    alternativeStudies: ["D-dimer", "Wells Score assessment"],
    checkType: "APPROPRIATENESS",
    citation: "Choosing Wisely: ACR - Imaging for Suspected PE",
    citationUrl:
      "https://www.choosingwisely.org/clinician-lists/american-college-radiology-imaging-for-suspected-pulmonary-embolism-without-moderate-or-high-pretest-probability/",
  },
  {
    id: "CW_ROUTINE_HEADACHE_IMAGING",
    title: "Choosing Wisely: Imaging for Uncomplicated Headache",
    source: "CHOOSING_WISELY",
    targetModalities: [ImagingModality.CT, ImagingModality.MRI],
    targetBodyRegions: ["head", "brain"],
    clinicalScenarioKeywords: [
      "headache",
      "migraine",
      "tension headache",
      "cephalgia",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for headache without red flag symptoms. Imaging for uncomplicated headache is not recommended.`,
    recommendation:
      "Image only if red flags present: thunderclap onset, new neurological deficit, papilledema, immunocompromised, cancer history, age >50 with new-onset headache.",
    alternativeStudies: ["Clinical assessment for red flags"],
    checkType: "APPROPRIATENESS",
    citation: "Choosing Wisely: AAN Recommendations",
    citationUrl:
      "https://www.choosingwisely.org/societies/american-academy-of-neurology/",
  },
];

// ─── Fleischner Criteria (Incidental Finding Follow-Up) ─────

const FOLLOW_UP_RULES: AppropriatenessRule[] = [
  {
    id: "FLEISCHNER_LUNG_NODULE",
    title: "Fleischner Criteria: Lung Nodule Follow-Up Interval",
    source: "ACR",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["chest", "lung"],
    clinicalScenarioKeywords: [
      "nodule",
      "lung nodule",
      "pulmonary nodule",
      "follow-up",
      "follow up",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `CT Chest ordered for lung nodule follow-up, but prior CT was performed ${context}. Imaging earlier than the recommended interval is not supported by Fleischner criteria unless the patient develops new symptoms.`,
    recommendation:
      "Adhere to Fleischner Society guidelines for follow-up intervals. For solid nodules <6mm in low-risk patients, no follow-up is needed. For 6-8mm, follow-up at 6-12 months. Repeat only if new symptoms develop.",
    checkType: "REPEAT_SCAN",
    minIntervalDays: 180, // 6 months minimum for most Fleischner scenarios
    citation:
      "Fleischner Society 2017 Guidelines for Incidental Pulmonary Nodules",
    citationUrl: "https://pubs.rsna.org/doi/10.1148/radiol.2017161659",
  },
];

// ─── Pediatric Radiation Safety (Image Gently) ─────────────

const PEDIATRIC_RULES: AppropriatenessRule[] = [
  {
    id: "PEDS_CT_HEAD_INFANT",
    title: "Pediatric Safety: CT Head in Infant",
    source: "CHOOSING_WISELY",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["head", "brain"],
    clinicalScenarioKeywords: [], // Triggered by age check, not keywords
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `CT Head ordered for infant (age ${context}). Infants with open fontanelles can be evaluated with cranial ultrasound. If advanced imaging is needed, MRI avoids ionizing radiation.`,
    recommendation:
      "Consider cranial ultrasound (through open fontanelle) as first-line. If cross-sectional imaging is required, MRI is preferred over CT to minimize radiation exposure in pediatric patients. Refer to Image Gently guidelines.",
    alternativeStudies: [
      "Cranial Ultrasound (if fontanelle open)",
      "MRI Brain without contrast",
    ],
    checkType: "APPROPRIATENESS",
    citation: "Image Gently Campaign / ACR-SPR Practice Parameter",
    citationUrl: "https://www.imagegently.org/",
  },
  {
    id: "PEDS_CT_ABDOMEN",
    title: "Pediatric Safety: CT Abdomen in Children",
    source: "CHOOSING_WISELY",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["abdomen", "pelvis"],
    clinicalScenarioKeywords: [],
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `CT Abdomen/Pelvis ordered for pediatric patient (age ${context}). Consider ultrasound as the first-line imaging modality for children to avoid ionizing radiation.`,
    recommendation:
      "For suspected appendicitis in children, ultrasound has high sensitivity and should be the first study. MRI is an alternative. CT should be reserved for equivocal cases.",
    alternativeStudies: ["Ultrasound Abdomen", "MRI Abdomen"],
    checkType: "APPROPRIATENESS",
    citation:
      "ACR Appropriateness Criteria: Right Lower Quadrant Pain (Pediatric)",
    citationUrl: "https://acsearch.acr.org/docs/3102404/Narrative/",
  },
];

// ─── Lung-RADS (ACR Lung Cancer Screening) ──────────────────

const LUNG_RADS_RULES: AppropriatenessRule[] = [
  {
    id: "LUNGRADS_SCREENING_ELIGIBILITY",
    title: "Lung-RADS: CT Lung Screening Eligibility",
    source: "ACR",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["chest", "lung"],
    clinicalScenarioKeywords: [
      "lung cancer screening",
      "ldct",
      "low dose ct",
      "low-dose ct",
      "smoking screening",
    ],
    rating: "USUALLY_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for lung cancer screening. Verify patient meets USPSTF eligibility criteria: age 50-80, ≥20 pack-year smoking history, currently smokes or quit within past 15 years.`,
    recommendation:
      "Confirm USPSTF eligibility before ordering LDCT lung screening. Use Lung-RADS structured reporting for findings. Ensure patient is informed of benefits, limitations, and potential harms of screening.",
    checkType: "APPROPRIATENESS",
    citation: "ACR Lung-RADS v2022 / USPSTF Lung Cancer Screening",
    citationUrl: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Lung-Rads",
  },
  {
    id: "LUNGRADS_EARLY_FOLLOWUP",
    title: "Lung-RADS: Premature Screening Follow-Up",
    source: "ACR",
    targetModalities: [ImagingModality.CT],
    targetBodyRegions: ["chest", "lung"],
    clinicalScenarioKeywords: [
      "lung screening follow",
      "annual screening",
      "screening follow-up",
    ],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `CT Chest ordered as lung screening follow-up, but prior screening CT was performed ${context}. Lung-RADS recommends annual screening for category 1-2 (negative/benign). Earlier follow-up is appropriate only for category 3-4 findings.`,
    recommendation:
      "For Lung-RADS 1-2: annual follow-up. For Lung-RADS 3 (6mm+): 6-month follow-up LDCT. For Lung-RADS 4A: 3-month follow-up or PET/CT. For Lung-RADS 4B/4X: tissue sampling or PET/CT.",
    checkType: "REPEAT_SCAN",
    minIntervalDays: 330, // ~11 months, to flag premature annual repeats
    citation: "ACR Lung-RADS v2022",
    citationUrl: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Lung-Rads",
  },
];

// ─── BI-RADS (Breast Imaging) ───────────────────────────────

const BIRADS_RULES: AppropriatenessRule[] = [
  {
    id: "BIRADS_SCREENING_INTERVAL",
    title: "BI-RADS: Premature Screening Mammography",
    source: "ACR",
    targetModalities: [ImagingModality.MAMMOGRAPHY],
    targetBodyRegions: ["breast"],
    clinicalScenarioKeywords: [
      "screening",
      "annual mammogram",
      "routine mammogram",
      "screening mammography",
    ],
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `Screening mammography ordered, but prior screening was performed ${context}. ACR recommends annual screening mammography beginning at age 40 for average-risk women. Ensure minimum 11-month interval between screenings.`,
    recommendation:
      "Follow ACR guidelines: annual screening mammography starting at age 40 for average-risk women. High-risk patients (≥20% lifetime risk) should also receive annual breast MRI. Risk assessment with validated models (Tyrer-Cuzick) is recommended at age 25.",
    checkType: "REPEAT_SCAN",
    minIntervalDays: 330, // ~11 months
    citation: "ACR Practice Parameter for Breast Cancer Screening",
    citationUrl: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads",
  },
  {
    id: "BIRADS_DIAGNOSTIC_AFTER_SCREENING",
    title: "BI-RADS: Diagnostic Mammography for Abnormal Screening",
    source: "ACR",
    targetModalities: [ImagingModality.MAMMOGRAPHY, ImagingModality.ULTRASOUND, ImagingModality.MRI],
    targetBodyRegions: ["breast"],
    clinicalScenarioKeywords: [
      "bi-rads 0",
      "birads 0",
      "incomplete",
      "callback",
      "abnormal screening",
      "additional imaging",
    ],
    rating: "USUALLY_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for follow-up of abnormal screening mammography (BI-RADS 0). Diagnostic workup is appropriate and should be completed within 30 days of screening.`,
    recommendation:
      "Complete diagnostic workup within 30 days. Diagnostic mammography with spot compression/magnification views and/or targeted ultrasound as appropriate. Follow ACR BI-RADS assessment categories for management recommendations.",
    checkType: "APPROPRIATENESS",
    citation: "ACR BI-RADS Atlas, 5th Edition",
    citationUrl: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads",
  },
  {
    id: "BIRADS_SHORT_INTERVAL_FOLLOWUP",
    title: "BI-RADS: Short-Interval Follow-Up (BI-RADS 3)",
    source: "ACR",
    targetModalities: [ImagingModality.MAMMOGRAPHY, ImagingModality.ULTRASOUND],
    targetBodyRegions: ["breast"],
    clinicalScenarioKeywords: [
      "bi-rads 3",
      "birads 3",
      "probably benign",
      "short interval",
      "6 month follow",
      "6-month follow",
    ],
    rating: "USUALLY_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `${study} ordered for BI-RADS 3 (probably benign) short-interval follow-up. This is consistent with ACR guidelines recommending 6-month follow-up imaging for BI-RADS 3 assessments.`,
    recommendation:
      "BI-RADS 3: short-interval follow-up at 6 months, then every 6-12 months for 2-3 years to confirm stability. If lesion increases in size or changes morphology, upgrade to BI-RADS 4 and recommend biopsy.",
    checkType: "APPROPRIATENESS",
    citation: "ACR BI-RADS Atlas, 5th Edition",
    citationUrl: "https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads",
  },
];

// ─── Contrast Safety ────────────────────────────────────────

const CONTRAST_SAFETY_RULES: AppropriatenessRule[] = [
  {
    id: "CONTRAST_EGFR_MODERATE",
    title: "Contrast Safety: IV Contrast with eGFR 30–44",
    source: "ACR",
    targetModalities: [ImagingModality.CT, ImagingModality.MRI],
    targetBodyRegions: [],
    clinicalScenarioKeywords: [],
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `Contrast study ordered for patient with eGFR ${context}. Moderate risk of contrast-induced nephropathy (iodinated contrast). Gadolinium-based agents: use Group II GBCAs.`,
    recommendation:
      "Proceed with caution. Ensure pre- and post-procedure hydration for iodinated contrast. For gadolinium, use Group II agents only. Monitor creatinine 48-72h post-procedure. Check ACR Manual on Contrast Media.",
    checkType: "CONTRAST_SAFETY",
    contraindications: ["ckd", "renal failure", "aki", "chronic kidney disease"],
    citation: "ACR Manual on Contrast Media 2024",
    citationUrl: "https://www.acr.org/Clinical-Resources/Contrast-Manual",
  },
  {
    id: "CONTRAST_EGFR_SEVERE",
    title: "Contrast Safety: IV Contrast with eGFR < 30",
    source: "ACR",
    targetModalities: [ImagingModality.CT, ImagingModality.MRI],
    targetBodyRegions: [],
    clinicalScenarioKeywords: [],
    rating: "USUALLY_NOT_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `Contrast study ordered for patient with severely reduced renal function (eGFR ${context}). High risk of contrast-induced nephropathy and nephrogenic systemic fibrosis (NSF) with gadolinium.`,
    recommendation:
      "Strongly consider non-contrast alternative. If contrast is essential, consult nephrology. For gadolinium, use only Group II GBCAs. Dialysis patients: coordinate timing with nephrologist. Check ACR Manual on Contrast Media.",
    checkType: "CONTRAST_SAFETY",
    contraindications: ["ckd", "renal failure", "aki", "chronic kidney disease"],
    citation: "ACR Manual on Contrast Media 2024",
    citationUrl: "https://www.acr.org/Clinical-Resources/Contrast-Manual",
  },
  {
    id: "CONTRAST_ALLERGY",
    title: "Contrast Safety: Prior Contrast Allergy",
    source: "ACR",
    targetModalities: [ImagingModality.CT, ImagingModality.MRI],
    targetBodyRegions: [],
    clinicalScenarioKeywords: [],
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (_study, context) =>
      `Contrast study ordered for patient with documented contrast allergy: ${context}.`,
    recommendation:
      "Premedicate per ACR protocol (Prednisone 50mg PO at 13, 7, and 1 hour prior + Diphenhydramine 50mg). Consider non-contrast alternative if prior reaction was severe.",
    checkType: "CONTRAST_SAFETY",
    citation: "ACR Manual on Contrast Media - Allergic Reactions",
    citationUrl:
      "https://www.acr.org/Clinical-Resources/Contrast-Manual",
  },
  {
    id: "CONTRAST_PREGNANCY",
    title: "Radiation/Contrast Safety: Imaging in Pregnancy",
    source: "ACR",
    targetModalities: [
      ImagingModality.CT,
      ImagingModality.XRAY,
      ImagingModality.FLUOROSCOPY,
      ImagingModality.PET,
    ],
    targetBodyRegions: [],
    clinicalScenarioKeywords: [],
    rating: "MAY_BE_APPROPRIATE",
    descriptionTemplate: (study, _context) =>
      `Ionizing radiation study (${study}) ordered for pregnant patient. Assess risk-benefit ratio.`,
    recommendation:
      "Consider US or MRI as radiation-free alternatives. If ionizing radiation is necessary, consult medical physicist for dose estimation. Gadolinium contrast is relatively contraindicated in pregnancy.",
    alternativeStudies: ["Ultrasound", "MRI without gadolinium"],
    checkType: "CONTRAST_SAFETY",
    citation:
      "ACR-SPR Practice Parameter: Imaging of the Pregnant Patient",
    citationUrl:
      "https://www.acr.org/Clinical-Resources/Practice-Parameters-and-Technical-Standards",
  },
];

// ─── Combined Database ──────────────────────────────────────

export const RULES_DATABASE: AppropriatenessRule[] = [
  ...ACR_RULES,
  ...CHOOSING_WISELY_RULES,
  ...FOLLOW_UP_RULES,
  ...LUNG_RADS_RULES,
  ...BIRADS_RULES,
  ...PEDIATRIC_RULES,
  ...CONTRAST_SAFETY_RULES,
];

// ═══════════════════════════════════════════════════════════════
// ENGINE LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluates a single imaging order against all rules.
 * Returns fired alerts (not the full result — that's composed by the caller).
 */
const evaluateRules = (
  patient: PatientProfile,
  currentOrder: ImagingOrder,
  priorEvents: ImagingEvent[]
): AppropriatenessAlert[] => {
  const alerts: AppropriatenessAlert[] = [];

  for (const rule of RULES_DATABASE) {
    // ── Pediatric age gate ──
    // Skip all PEDS_ rules for adults
    if (rule.id.startsWith("PEDS_") && patient.age >= 18) continue;
    // PEDS_CT_HEAD_INFANT only applies to infants < 2 years
    if (rule.id === "PEDS_CT_HEAD_INFANT" && patient.age >= 2) continue;

    // ── Check 1: Modality match ──
    if (
      rule.targetModalities.length > 0 &&
      !rule.targetModalities.includes(currentOrder.modality)
    )
      continue;

    // ── Check 2: Body region match ──
    if (
      rule.targetBodyRegions.length > 0 &&
      !rule.targetBodyRegions.some((r) =>
        normalize(currentOrder.bodyRegion).includes(normalize(r))
      )
    )
      continue;

    // ── Check 3: Clinical scenario keyword match ──
    // Uses word-boundary regex to prevent false positives
    // (e.g. keyword "pe" must not match inside "operated" or "CT-PA")
    if (rule.clinicalScenarioKeywords.length > 0) {
      const indicationNorm = normalize(currentOrder.clinicalIndication);
      const hasKeyword = rule.clinicalScenarioKeywords.some((kw) => {
        const kwNorm = normalize(kw);
        // Multi-word keywords (e.g. "low back pain") use substring match
        // Single short keywords (e.g. "pe") use word-boundary regex
        if (kwNorm.includes(" ") || kwNorm.length > 4) {
          return indicationNorm.includes(kwNorm);
        }
        const pattern = new RegExp(`\\b${kwNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
        return pattern.test(indicationNorm);
      });
      if (!hasKeyword) continue;
    }

    // ── Check 4: Type-specific logic ──

    // --- REPEAT_SCAN ---
    if (rule.checkType === "REPEAT_SCAN" && rule.minIntervalDays) {
      const priorScan = findMostRecentPrior(
        priorEvents,
        currentOrder.modality,
        currentOrder.bodyRegion
      );
      if (!priorScan) continue; // No prior = rule doesn't apply

      const daysSincePrior = daysBetween(priorScan.date, today());
      if (daysSincePrior >= rule.minIntervalDays) continue;

      // Severity: escalate to HIGH if rating is USUALLY_NOT_APPROPRIATE,
      // otherwise use time-based severity
      let severity: AlertSeverity;
      if (rule.rating === "USUALLY_NOT_APPROPRIATE") {
        severity = "HIGH";
      } else {
        severity = daysSincePrior < 30 ? "HIGH" : "MEDIUM";
      }

      alerts.push({
        ruleId: rule.id,
        title: rule.title,
        severity,
        rating: rule.rating,
        description: rule.descriptionTemplate(
          currentOrder.studyDescription,
          `${daysSincePrior} days ago (${priorScan.date})`
        ),
        recommendation: rule.recommendation,
        alternativeStudies: rule.alternativeStudies,
        citation: rule.citation,
        citationUrl: rule.citationUrl,
      });
      continue;
    }

    // --- CONTRAST_SAFETY ---
    if (rule.checkType === "CONTRAST_SAFETY") {
      // eGFR check — tiered: moderate (30–44) vs severe (<30)
      if (
        rule.id === "CONTRAST_EGFR_MODERATE" &&
        currentOrder.contrast !== ContrastType.NONE
      ) {
        if (patient.renalFunction && patient.renalFunction.eGFR >= 30 && patient.renalFunction.eGFR < 45) {
          alerts.push({
            ruleId: rule.id,
            title: rule.title,
            severity: "MEDIUM" as AlertSeverity,
            rating: rule.rating,
            description: rule.descriptionTemplate(
              currentOrder.studyDescription,
              `${patient.renalFunction.eGFR} mL/min`
            ),
            recommendation: rule.recommendation,
            citation: rule.citation,
            citationUrl: rule.citationUrl,
          });
        }
        continue;
      }

      if (
        rule.id === "CONTRAST_EGFR_SEVERE" &&
        currentOrder.contrast !== ContrastType.NONE
      ) {
        if (patient.renalFunction && patient.renalFunction.eGFR < 30) {
          alerts.push({
            ruleId: rule.id,
            title: rule.title,
            severity: "HIGH" as AlertSeverity,
            rating: rule.rating,
            description: rule.descriptionTemplate(
              currentOrder.studyDescription,
              `${patient.renalFunction.eGFR} mL/min`
            ),
            recommendation: rule.recommendation,
            citation: rule.citation,
            citationUrl: rule.citationUrl,
          });
        }
        continue;
      }

      // Contrast allergy check
      if (
        rule.id === "CONTRAST_ALLERGY" &&
        currentOrder.contrast !== ContrastType.NONE
      ) {
        const contrastAllergy = patient.allergies.find(
          (a) =>
            normalize(a).includes("contrast") ||
            normalize(a).includes("iodine") ||
            normalize(a).includes("gadolinium")
        );
        if (!contrastAllergy) continue;

        alerts.push({
          ruleId: rule.id,
          title: rule.title,
          severity: "HIGH",
          rating: rule.rating,
          description: rule.descriptionTemplate(
            currentOrder.studyDescription,
            contrastAllergy
          ),
          recommendation: rule.recommendation,
          citation: rule.citation,
          citationUrl: rule.citationUrl,
        });
        continue;
      }

      // Pregnancy check
      if (
        rule.id === "CONTRAST_PREGNANCY" &&
        patient.pregnancyStatus === "PREGNANT"
      ) {
        alerts.push({
          ruleId: rule.id,
          title: rule.title,
          severity: "HIGH",
          rating: rule.rating,
          description: rule.descriptionTemplate(
            currentOrder.studyDescription,
            ""
          ),
          recommendation: rule.recommendation,
          alternativeStudies: rule.alternativeStudies,
          citation: rule.citation,
          citationUrl: rule.citationUrl,
        });
        continue;
      }

      // Other contrast safety rules that didn't match — skip
      continue;
    }

    // --- RADIATION_DOSE ---
    // Reserved for future cumulative dose tracking rules.
    // If a rule is added with this checkType, it should be handled here.
    if (rule.checkType === "RADIATION_DOSE") {
      logger.warn(
        `[RadView] RADIATION_DOSE rule "${rule.id}" matched but no handler is implemented yet. Skipping.`
      );
      continue;
    }

    // --- APPROPRIATENESS (default) ---
    // If we've passed modality, region, keyword, and age checks → fires
    alerts.push({
      ruleId: rule.id,
      title: rule.title,
      severity:
        rule.rating === "USUALLY_NOT_APPROPRIATE" ? "HIGH" : "MEDIUM",
      rating: rule.rating,
      description: rule.descriptionTemplate(
        currentOrder.studyDescription,
        patient.age < 18 ? formatAge(patient.age) : ""
      ),
      recommendation: rule.recommendation,
      alternativeStudies: rule.alternativeStudies,
      citation: rule.citation,
      citationUrl: rule.citationUrl,
    });
  }

  return deduplicateAlerts(alerts);
};

/**
 * Determines the overall verdict from a set of alerts.
 * Worst-case wins: if any alert is USUALLY_NOT_APPROPRIATE, that's the verdict.
 */
const determineOverallVerdict = (
  alerts: AppropriatenessAlert[]
): AppropriatenessResult["overallVerdict"] => {
  if (alerts.length === 0) return "USUALLY_APPROPRIATE";
  if (alerts.some((a) => a.rating === "USUALLY_NOT_APPROPRIATE"))
    return "USUALLY_NOT_APPROPRIATE";
  if (alerts.some((a) => a.rating === "MAY_BE_APPROPRIATE"))
    return "MAY_BE_APPROPRIATE";
  return "USUALLY_APPROPRIATE";
};

/**
 * Generates a human-readable summary of prior scans.
 */
const buildPriorScanSummary = (events: ImagingEvent[]): string => {
  const completed = events.filter((e) => e.status === "COMPLETED");
  if (completed.length === 0) return "No prior imaging on record.";

  const sorted = [...completed].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const most = sorted[0];
  const daysAgo = daysBetween(most.date, today());

  return `${completed.length} prior imaging studies on record. Most recent: ${most.studyDescription} (${most.date}, ${daysAgo} days ago).`;
};

// ─── Public API ─────────────────────────────────────────────

/**
 * Main entry point: evaluates an imaging order against all rules
 * and returns the complete appropriateness result.
 */
export const evaluateAppropriateness = (
  patient: PatientProfile,
  order: ImagingOrder,
  priorEvents: ImagingEvent[]
): AppropriatenessResult => {
  const alerts = evaluateRules(patient, order, priorEvents);
  const overallVerdict = determineOverallVerdict(alerts);

  const summary =
    alerts.length === 0
      ? "No appropriateness concerns identified for this order."
      : `${alerts.length} appropriateness concern${alerts.length > 1 ? "s" : ""} identified. Overall verdict: ${overallVerdict.replace(/_/g, " ").toLowerCase()}.`;

  return {
    alerts,
    overallVerdict,
    summary,
    priorScanSummary: buildPriorScanSummary(priorEvents),
  };
};

// Re-export for testing
export const _testUtils = {
  normalize,
  daysBetween,
  formatAge,
  bodyRegionsOverlap,
  findMostRecentPrior,
  deduplicateAlerts,
  evaluateRules,
  determineOverallVerdict,
  buildPriorScanSummary,
};

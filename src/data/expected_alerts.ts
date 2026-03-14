/**
 * RadView — Expected Alert Verification
 *
 * This file documents the expected output of the rules engine for each patient.
 * Use this as a test fixture: run evaluateAppropriateness() with each patient's
 * data and assert the output matches these expectations.
 *
 * FORMAT: For each patient, we trace the rule evaluation path to show
 * exactly WHY each alert fires (or doesn't fire).
 */

import type { AppropriatenessAlert, AppropriatenessRating } from "../types";

// ═══════════════════════════════════════════════════════════════
// PATIENT 1: MRS. LI-MEI ZHANG
// Order: CT Abdomen/Pelvis with IV Contrast
// Prior imaging: 5 studies (KUB, knee XR, US abdomen, CT A/P, pre-op CXR)
// Expected: 2 alerts
// ═══════════════════════════════════════════════════════════════

/**
 * RULE TRACE — Mrs. Zhang:
 *
 * ACR_CT_HEAD_MINOR_TRAUMA → SKIP (modality CT matches, but body region is abdomen, not head)
 * ACR_LUMBAR_SPINE_ACUTE_LBP → SKIP (modality CT matches, but body region is abdomen, not lumbar)
 * ACR_CT_ABDOMEN_REPEAT → HIT!
 *   - Modality: CT ✓
 *   - Body region: "Abdomen/Pelvis" includes "abdomen" ✓
 *   - Keywords: [] (empty = skip keyword check) ✓
 *   - checkType: REPEAT_SCAN
 *   - Prior scans evaluated:
 *       img_zhang_0 (2024-09-20, X-Ray KUB) — SKIP, modality X-RAY ≠ CT
 *       img_zhang_1 (2025-04-02, X-Ray Knees) — SKIP, modality X-RAY ≠ CT
 *       img_zhang_2 (2025-11-12, US Abdomen) — SKIP, modality US ≠ CT
 *       img_zhang_3 (2026-01-15, CT A/P, COMPLETED) — MATCH! Most recent CT of abdomen
 *       img_zhang_4 (2026-03-02, X-Ray Chest) — SKIP, body region chest ≠ abdomen
 *   - Days since prior: ~54 days (Jan 15 → Mar 10)
 *   - minIntervalDays: 90 → 54 < 90 → FIRES
 *   - Severity: 54 > 30 → MEDIUM
 *
 * CW_PREOP_CXR → SKIP (modality is CT, not X-RAY)
 * CW_CT_PE_LOW_RISK → SKIP (body region is abdomen, not chest; no PE keywords)
 * CW_ROUTINE_HEADACHE_IMAGING → SKIP (body region is abdomen, not head)
 *
 * FLEISCHNER_LUNG_NODULE → SKIP (body region is abdomen, not chest)
 *
 * PEDS_CT_HEAD_INFANT → SKIP (patient.age 68 ≥ 18 → adult, pediatric rule skipped)
 * PEDS_CT_ABDOMEN → SKIP (patient.age 68 ≥ 18 → adult, pediatric rule skipped)
 *
 * CONTRAST_EGFR_MODERATE → HIT!
 *   - Modality: CT ✓ (rule targets [CT, MRI])
 *   - Body region: [] (any) ✓
 *   - Contrast: IV_CONTRAST ≠ NONE → contrast study ✓
 *   - Patient eGFR: 38, in range [30, 45) → FIRES MODERATE tier
 *   - Severity: MEDIUM
 *
 * CONTRAST_EGFR_SEVERE → SKIP (eGFR 38 >= 30)
 *
 * CONTRAST_ALLERGY → SKIP (patient allergies: ["Penicillin (maculopapular rash, 2018)"]
 *   — no contrast/iodine/gadolinium match)
 * CONTRAST_PREGNANCY → SKIP (pregnancyStatus: NOT_PREGNANT)
 */

export const EXPECTED_ZHANG: {
  alertCount: number;
  overallVerdict: AppropriatenessRating;
  alerts: Partial<AppropriatenessAlert>[];
} = {
  alertCount: 2,
  overallVerdict: "MAY_BE_APPROPRIATE",
  alerts: [
    {
      ruleId: "ACR_CT_ABDOMEN_REPEAT",
      title: "ACR: Repeat CT Abdomen/Pelvis",
      severity: "MEDIUM",
      rating: "MAY_BE_APPROPRIATE",
      // Description will contain "54 days ago" and the prior scan date (2026-01-15)
    },
    {
      ruleId: "CONTRAST_EGFR_MODERATE",
      title: "Contrast Safety: IV Contrast with eGFR 30–44",
      severity: "MEDIUM",
      rating: "MAY_BE_APPROPRIATE",
      // Description will contain "38 mL/min"
    }
  ]
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 2: MR. RAJESH VIKRAM PATEL
// Order: MRI Lumbar Spine without Contrast
// Prior imaging: 3 studies (shoulder XR, shoulder US, immigration CXR)
// Expected: 1 alert
// ═══════════════════════════════════════════════════════════════

/**
 * RULE TRACE — Mr. Patel:
 *
 * ACR_CT_HEAD_MINOR_TRAUMA → SKIP (modality is MRI, rule targets CT)
 * ACR_LUMBAR_SPINE_ACUTE_LBP → HIT!
 *   - Modality: MRI ✓ (rule targets [MRI, CT])
 *   - Body region: "Lumbar Spine" includes "lumbar" ✓
 *   - Keywords: "low back pain" → indication "Acute low back pain x 2 weeks" includes it ✓
 *   - checkType: APPROPRIATENESS → fires on keyword match
 *   - Severity: USUALLY_NOT_APPROPRIATE → HIGH
 *
 * ACR_CT_ABDOMEN_REPEAT → SKIP (modality MRI, rule targets CT only)
 * CW_PREOP_CXR → SKIP (modality MRI, rule targets X-RAY)
 * CW_CT_PE_LOW_RISK → SKIP (modality MRI, rule targets CT)
 * CW_ROUTINE_HEADACHE_IMAGING → SKIP (body region is lumbar, not head)
 *
 * FLEISCHNER_LUNG_NODULE → SKIP (body region is lumbar, not chest)
 *
 * PEDS_CT_HEAD_INFANT → SKIP (patient.age 45 ≥ 18 → adult, pediatric rule skipped)
 * PEDS_CT_ABDOMEN → SKIP (patient.age 45 ≥ 18 → adult, pediatric rule skipped)
 *
 * CONTRAST_EGFR_MODERATE/SEVERE → SKIP (contrast is NONE — no eGFR check needed)
 * CONTRAST_ALLERGY → SKIP (contrast is NONE)
 * CONTRAST_PREGNANCY → SKIP (no pregnancy status / male patient)
 *
 * Note: No prior spine imaging exists for Mr. Patel (prior studies are
 * shoulder XR, shoulder US, and immigration CXR), so repeat scan rules
 * wouldn't fire even if they matched modality/region.
 */

export const EXPECTED_PATEL: {
  alertCount: number;
  overallVerdict: AppropriatenessRating;
  alerts: Partial<AppropriatenessAlert>[];
} = {
  alertCount: 1,
  overallVerdict: "USUALLY_NOT_APPROPRIATE",
  alerts: [
    {
      ruleId: "ACR_LUMBAR_SPINE_ACUTE_LBP",
      title: "ACR: Imaging for Acute Low Back Pain",
      severity: "HIGH",
      rating: "USUALLY_NOT_APPROPRIATE",
      // Recommendation will mention "4-6 weeks" conservative management
    }
  ]
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 3: MS. CARMEN LUCIA RIVERA
// Order: CT Chest without Contrast
// Prior imaging: 5 completed + 1 recommended (CXR x3, mammogram, CT-PA, future CT)
// Expected: 1 alert
// ═══════════════════════════════════════════════════════════════

/**
 * RULE TRACE — Ms. Rivera:
 *
 * ACR_CT_HEAD_MINOR_TRAUMA → SKIP (body region is chest, not head)
 * ACR_LUMBAR_SPINE_ACUTE_LBP → SKIP (body region is chest, not lumbar)
 * ACR_CT_ABDOMEN_REPEAT → SKIP (body region is chest, not abdomen)
 *
 * CW_PREOP_CXR → SKIP (modality CT, rule targets X-RAY)
 * CW_CT_PE_LOW_RISK → SKIP (indication keywords don't match: "follow-up lung nodule"
 *   does not contain "pe", "pulmonary embolism", "shortness of breath", or "chest pain")
 * CW_ROUTINE_HEADACHE_IMAGING → SKIP (body region is chest, not head)
 *
 * FLEISCHNER_LUNG_NODULE → HIT!
 *   - Modality: CT ✓
 *   - Body region: "Chest" includes "chest" ✓
 *   - Keywords: "nodule" → indication "Follow-up lung nodule" includes it ✓
 *   - checkType: REPEAT_SCAN
 *   - Prior scans evaluated (CT + Chest):
 *       img_rivera_0 (2024-04-08, X-Ray Chest) — SKIP, modality X-RAY ≠ CT
 *       img_rivera_1 (2025-03-15, X-Ray Chest) — SKIP, modality X-RAY ≠ CT
 *       img_rivera_2 (2025-07-10, Mammogram) — SKIP, modality MAMMOGRAPHY ≠ CT
 *       img_rivera_3 (2025-09-18, X-Ray Chest) — SKIP, modality X-RAY ≠ CT
 *       img_rivera_4 (2025-12-05, CT-PA, COMPLETED) — MATCH! Most recent CT of chest
 *       img_rivera_5 (2026-12-05, CT Chest, RECOMMENDED) — SKIP, status ≠ COMPLETED
 *   - Days since prior: ~95 days (Dec 5 → Mar 10)
 *   - minIntervalDays: 180 → 95 < 180 → FIRES
 *   - Severity: 95 > 30 → MEDIUM
 *     BUT rating is USUALLY_NOT_APPROPRIATE → engine overrides to HIGH
 *
 * PEDS_CT_HEAD_INFANT → SKIP (patient.age 55 ≥ 18 → adult, pediatric rule skipped)
 * PEDS_CT_ABDOMEN → SKIP (patient.age 55 ≥ 18 → adult, pediatric rule skipped)
 *
 * CONTRAST_EGFR_MODERATE/SEVERE → SKIP (contrast is NONE)
 * CONTRAST_ALLERGY → SKIP (contrast is NONE)
 * CONTRAST_PREGNANCY → SKIP (not pregnant)
 *
 * Note: The RECOMMENDED event (img_rivera_5, due Dec 2026) is status
 * RECOMMENDED, not COMPLETED, so the repeat scan finder correctly
 * skips it and finds the Dec 2025 COMPLETED CT-PA instead.
 */

export const EXPECTED_RIVERA: {
  alertCount: number;
  overallVerdict: AppropriatenessRating;
  alerts: Partial<AppropriatenessAlert>[];
} = {
  alertCount: 1,
  overallVerdict: "USUALLY_NOT_APPROPRIATE",
  alerts: [
    {
      ruleId: "FLEISCHNER_LUNG_NODULE",
      title: "Fleischner Criteria: Lung Nodule Follow-Up Interval",
      severity: "HIGH",
      rating: "USUALLY_NOT_APPROPRIATE",
      // Description will mention follow-up interval and prior report recommendation
    }
  ]
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 4: BABY ETHAN JAMES KOWALSKI
// Order: CT Head non-contrast
// Prior imaging: 2 studies (hip US, CXR)
// Expected: 1 alert
// ═══════════════════════════════════════════════════════════════

/**
 * RULE TRACE — Baby Kowalski:
 *
 * ACR_CT_HEAD_MINOR_TRAUMA → SKIP (keywords: "minor trauma", "head injury" etc.
 *   — indication "Irritability and poor feeding" doesn't contain any)
 * ACR_LUMBAR_SPINE_ACUTE_LBP → SKIP (body region is head, not lumbar)
 * ACR_CT_ABDOMEN_REPEAT → SKIP (body region is head, not abdomen)
 *
 * CW_PREOP_CXR → SKIP (modality CT, rule targets X-RAY)
 * CW_CT_PE_LOW_RISK → SKIP (body region is head, not chest)
 * CW_ROUTINE_HEADACHE_IMAGING → SKIP (keywords: "headache", "migraine" etc.
 *   — indication "Irritability and poor feeding" doesn't contain any)
 *
 * FLEISCHNER_LUNG_NODULE → SKIP (body region is head, not chest)
 *
 * PEDS_CT_HEAD_INFANT → HIT!
 *   - Age gate: patient.age (0.25) < 2 ✓
 *   - Modality: CT ✓
 *   - Body region: "Head" includes "head" ✓
 *   - Keywords: [] (empty, age-triggered) ✓
 *   - checkType: APPROPRIATENESS → FIRES
 *   - Rating: USUALLY_NOT_APPROPRIATE → Severity: HIGH
 *   - Prior scans evaluated:
 *       img_kowalski_0 (2026-01-05, US Hips) — not relevant to CT Head repeat check
 *       img_kowalski_1 (2026-01-20, X-Ray Chest) — not relevant to CT Head repeat check
 *   - Note: No prior head imaging exists, but this rule fires on
 *     APPROPRIATENESS (age-based), not REPEAT_SCAN
 *
 * PEDS_CT_ABDOMEN → SKIP (body region is head, not abdomen)
 *
 * CONTRAST_EGFR_MODERATE/SEVERE → SKIP (contrast is NONE)
 * CONTRAST_ALLERGY → SKIP (contrast is NONE)
 * CONTRAST_PREGNANCY → SKIP (not applicable — 3-month-old male infant)
 */

export const EXPECTED_KOWALSKI: {
  alertCount: number;
  overallVerdict: AppropriatenessRating;
  alerts: Partial<AppropriatenessAlert>[];
} = {
  alertCount: 1,
  overallVerdict: "USUALLY_NOT_APPROPRIATE",
  alerts: [
    {
      ruleId: "PEDS_CT_HEAD_INFANT",
      title: "Pediatric Safety: CT Head in Infant",
      severity: "HIGH",
      rating: "USUALLY_NOT_APPROPRIATE",
      // Recommendation will mention cranial ultrasound through open fontanelle
      // and MRI as preferred alternatives (Image Gently Campaign)
    }
  ]
};


// ═══════════════════════════════════════════════════════════════
// SUMMARY TABLE — Quick reference for all 4 patients
// ═══════════════════════════════════════════════════════════════
//
// Patient                    | Order              | Alerts | Verdict
// ──────────────────────────|────────────────────|────────|─────────────────────
// Mrs. Li-Mei Zhang (68F)   | CT A/P + contrast  | 2      | MAY_BE_APPROPRIATE
//                            |                    |        |   - Repeat scan (54d < 90d)
//                            |                    |        |   - eGFR 38 < 45
// Mr. Rajesh V. Patel (45M) | MRI Lumbar Spine   | 1      | USUALLY_NOT_APPROPRIATE
//                            |                    |        |   - Acute LBP < 6 weeks
// Ms. Carmen L. Rivera (55F)| CT Chest           | 1      | USUALLY_NOT_APPROPRIATE
//                            |                    |        |   - Fleischner: 95d < 180d
// Baby E.J. Kowalski (3M)   | CT Head            | 1      | USUALLY_NOT_APPROPRIATE
//                            |                    |        |   - Peds CT alternative

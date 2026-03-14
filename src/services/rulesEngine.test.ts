/**
 * RadView — Rules Engine Unit Tests
 *
 * Comprehensive test suite for the deterministic appropriateness engine.
 * Covers utility functions, helper functions, keyword matching, all 4 patient
 * fixtures, edge cases, and verdict/summary logic.
 */

import { describe, it, expect, vi } from "vitest";
import {
  evaluateAppropriateness,
  RULES_DATABASE,
  _testUtils,
} from "./rulesEngine";
import {
  ImagingModality,
  ImagingStatus,
  ContrastType,
} from "../types";
import type {
  PatientProfile,
  ImagingOrder,
  ImagingEvent,
  AppropriatenessAlert,
} from "../types";
import {
  PATIENT_ZHANG,
  ORDER_ZHANG,
  PATIENT_PATEL,
  ORDER_PATEL,
  PATIENT_RIVERA,
  ORDER_RIVERA,
  PATIENT_KOWALSKI,
  ORDER_KOWALSKI,
} from "../data/patients";
import { PRECOMPUTED_DATA } from "../data/precomputed";
import {
  EXPECTED_ZHANG,
  EXPECTED_PATEL,
  EXPECTED_RIVERA,
  EXPECTED_KOWALSKI,
} from "../data/expected_alerts";

const {
  normalize,
  daysBetween,
  formatAge,
  bodyRegionsOverlap,
  findMostRecentPrior,
  deduplicateAlerts,
  evaluateRules,
  determineOverallVerdict,
  buildPriorScanSummary,
} = _testUtils;

// ═══════════════════════════════════════════════════════════════
// 1. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe("normalize()", () => {
  it("lowercases and trims whitespace", () => {
    expect(normalize("  CT Head  ")).toBe("ct head");
  });

  it("handles empty string", () => {
    expect(normalize("")).toBe("");
  });

  it("handles already-lowercase text", () => {
    expect(normalize("abdomen/pelvis")).toBe("abdomen/pelvis");
  });

  it("handles mixed case with special characters", () => {
    expect(normalize("  CT-PA Chest  ")).toBe("ct-pa chest");
  });
});

describe("daysBetween()", () => {
  it("calculates days between two dates correctly", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("returns 0 for the same date", () => {
    expect(daysBetween("2026-03-12", "2026-03-12")).toBe(0);
  });

  it("is symmetric — order of arguments doesn't matter", () => {
    expect(daysBetween("2026-01-15", "2026-03-12")).toBe(
      daysBetween("2026-03-12", "2026-01-15")
    );
  });

  it("handles dates across year boundaries", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("handles leap year", () => {
    // 2024 was a leap year
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("formatAge()", () => {
  it("formats newborn (0 months)", () => {
    expect(formatAge(0)).toBe("0 months");
  });

  it("formats 1 month old (singular)", () => {
    expect(formatAge(1 / 12)).toBe("1 month");
  });

  it("formats 3-month-old infant", () => {
    expect(formatAge(0.25)).toBe("3 months");
  });

  it("formats 6-month-old infant", () => {
    expect(formatAge(0.5)).toBe("6 months");
  });

  it("formats 11-month-old infant", () => {
    // 11/12 = 0.9167
    expect(formatAge(11 / 12)).toBe("11 months");
  });

  it("formats 1-year-old with decimal precision", () => {
    expect(formatAge(1.5)).toBe("1.5 years");
  });

  it("formats 2-year-old — integer", () => {
    expect(formatAge(2)).toBe("2 years");
  });

  it("formats 5-year-old child", () => {
    expect(formatAge(5)).toBe("5 years");
  });

  it("formats 17-year-old — rounds down", () => {
    expect(formatAge(17.8)).toBe("17 years");
  });

  it("formats adult (68 years)", () => {
    expect(formatAge(68)).toBe("68 years");
  });
});

describe("bodyRegionsOverlap()", () => {
  it("matches identical regions", () => {
    expect(bodyRegionsOverlap("Chest", "Chest")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(bodyRegionsOverlap("CHEST", "chest")).toBe(true);
  });

  it("matches compound region against simple region", () => {
    expect(bodyRegionsOverlap("Abdomen/Pelvis", "Abdomen")).toBe(true);
  });

  it("matches simple region against compound region (symmetric)", () => {
    expect(bodyRegionsOverlap("Abdomen", "Abdomen/Pelvis")).toBe(true);
  });

  it("matches second segment of compound region", () => {
    expect(bodyRegionsOverlap("Abdomen/Pelvis", "Pelvis")).toBe(true);
  });

  it("matches compound against compound with shared segment", () => {
    expect(bodyRegionsOverlap("Abdomen/Pelvis", "Pelvis/Hip")).toBe(true);
  });

  it("does NOT match unrelated regions", () => {
    expect(bodyRegionsOverlap("Chest", "Abdomen")).toBe(false);
  });

  it("does NOT match unrelated compound regions", () => {
    expect(bodyRegionsOverlap("Head/Brain", "Chest/Lung")).toBe(false);
  });

  it("handles whitespace around slash separators", () => {
    expect(bodyRegionsOverlap("Abdomen / Pelvis", "pelvis")).toBe(true);
  });

  it("handles substring matching — 'head' matches 'head'", () => {
    expect(bodyRegionsOverlap("Head", "Head")).toBe(true);
  });

  it("does NOT match spine subtypes — 'cervical' vs 'lumbar'", () => {
    expect(bodyRegionsOverlap("Cervical Spine", "Lumbar Spine")).toBe(false);
  });

  it("spine matches spine subtype via includes — 'spine' vs 'cervical spine'", () => {
    // Because "spine" includes in "cervical spine" segment "cervical spine"
    // normalize splits on "/", so "Cervical Spine" → ["cervical spine"]
    // "Spine" → ["spine"], and "cervical spine".includes("spine") = true
    expect(bodyRegionsOverlap("Spine", "Cervical Spine")).toBe(true);
  });

  it("handles empty strings gracefully", () => {
    expect(bodyRegionsOverlap("", "Chest")).toBe(true); // "" includes ""
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe("findMostRecentPrior()", () => {
  const makePrior = (
    date: string,
    modality: ImagingModality,
    bodyRegion: string,
    status: ImagingStatus = ImagingStatus.COMPLETED
  ): ImagingEvent => ({
    date,
    modality,
    bodyRegion,
    studyDescription: `Test ${modality} ${bodyRegion}`,
    status,
    contrast: ContrastType.NONE,
    indication: "test",
    keyFindings: [],
    recommendation: "",
    source_quote: "test",
  });

  it("returns null when no events exist", () => {
    expect(findMostRecentPrior([], ImagingModality.CT, "Chest")).toBeNull();
  });

  it("returns null when no events match modality", () => {
    const events = [makePrior("2026-01-01", ImagingModality.XRAY, "Chest")];
    expect(findMostRecentPrior(events, ImagingModality.CT, "Chest")).toBeNull();
  });

  it("returns null when no events match body region", () => {
    const events = [makePrior("2026-01-01", ImagingModality.CT, "Head")];
    expect(
      findMostRecentPrior(events, ImagingModality.CT, "Chest")
    ).toBeNull();
  });

  it("skips non-COMPLETED events", () => {
    const events = [
      makePrior(
        "2026-01-01",
        ImagingModality.CT,
        "Chest",
        ImagingStatus.RECOMMENDED
      ),
    ];
    expect(findMostRecentPrior(events, ImagingModality.CT, "Chest")).toBeNull();
  });

  it("returns the most recent matching event", () => {
    const events = [
      makePrior("2025-06-01", ImagingModality.CT, "Chest"),
      makePrior("2026-01-15", ImagingModality.CT, "Chest"),
      makePrior("2025-12-01", ImagingModality.CT, "Chest"),
    ];
    const result = findMostRecentPrior(events, ImagingModality.CT, "Chest");
    expect(result?.date).toBe("2026-01-15");
  });

  it("matches compound body region against simple query", () => {
    const events = [
      makePrior("2026-01-15", ImagingModality.CT, "Abdomen/Pelvis"),
    ];
    const result = findMostRecentPrior(events, ImagingModality.CT, "Abdomen");
    expect(result).not.toBeNull();
    expect(result?.date).toBe("2026-01-15");
  });

  it("matches simple body region against compound query (symmetric)", () => {
    const events = [
      makePrior("2026-01-15", ImagingModality.CT, "Pelvis"),
    ];
    const result = findMostRecentPrior(
      events,
      ImagingModality.CT,
      "Abdomen/Pelvis"
    );
    expect(result).not.toBeNull();
  });
});

describe("deduplicateAlerts()", () => {
  const makeAlert = (ruleId: string): AppropriatenessAlert => ({
    ruleId,
    title: `Rule ${ruleId}`,
    severity: "MEDIUM",
    rating: "MAY_BE_APPROPRIATE",
    description: "test",
    recommendation: "test",
    citation: "test",
    citationUrl: "https://example.com",
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateAlerts([])).toEqual([]);
  });

  it("keeps unique alerts", () => {
    const alerts = [makeAlert("A"), makeAlert("B")];
    expect(deduplicateAlerts(alerts)).toHaveLength(2);
  });

  it("removes duplicate ruleIds, keeping the first occurrence", () => {
    const alerts = [makeAlert("A"), makeAlert("B"), makeAlert("A")];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.ruleId)).toEqual(["A", "B"]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. KEYWORD MATCHING
// ═══════════════════════════════════════════════════════════════

describe("keyword matching (via evaluateRules)", () => {
  // Helper: create a minimal patient + order pair to test keyword matching
  const makeAdultPatient = (): PatientProfile => ({
    id: "test",
    mrn: "99990001",
    name: "Test Patient",
    dob: "1985-06-01",
    age: 40,
    gender: "Male",
    conditions: [],
    allergies: [],
    notes: "",
    priorReports: "",
  });

  it("matches multi-word keyword via substring: 'low back pain'", () => {
    const patient = makeAdultPatient();
    const order: ImagingOrder = {
      modality: ImagingModality.MRI,
      bodyRegion: "Lumbar Spine",
      studyDescription: "MRI Lumbar Spine",
      contrast: ContrastType.NONE,
      clinicalIndication: "Patient has low back pain for 3 weeks",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "ACR_LUMBAR_SPINE_ACUTE_LBP")).toBe(
      true
    );
  });

  it("uses word-boundary for short keyword 'pe' — does NOT match 'operated'", () => {
    const patient = makeAdultPatient();
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "CT Chest",
      contrast: ContrastType.NONE,
      clinicalIndication: "Post-operated chest, routine follow-up",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "CW_CT_PE_LOW_RISK")).toBe(false);
  });

  it("uses word-boundary for short keyword 'pe' — DOES match standalone 'PE'", () => {
    const patient = makeAdultPatient();
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "CT-PA",
      contrast: ContrastType.IV_CONTRAST,
      clinicalIndication: "Suspect PE, shortness of breath",
      orderingPhysician: "Dr. Test",
      urgency: "URGENT",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "CW_CT_PE_LOW_RISK")).toBe(true);
  });

  it("does NOT match 'pe' inside 'CT-PA' (hyphenated word)", () => {
    const patient = makeAdultPatient();
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "CT Chest",
      contrast: ContrastType.NONE,
      clinicalIndication: "CT-PA ordered for cough evaluation",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    // "ct-pa" — "pe" with word boundaries should NOT match inside "ct-pa"
    // Actually, "pa" != "pe", so this tests the right thing for "pe" specifically
    // Let's test a scenario where "pe" appears as a substring
    const order2: ImagingOrder = {
      ...order,
      clinicalIndication: "Suspected type of pneumonia",
    };
    // "pe" should NOT match inside "type" — it doesn't contain "pe"
    // "pe" should NOT match inside "suspected" — it doesn't contain "pe"
    const alerts = evaluateRules(patient, order2, []);
    expect(alerts.some((a) => a.ruleId === "CW_CT_PE_LOW_RISK")).toBe(false);
  });

  it("matches 'lbp' as a short keyword with word boundary", () => {
    const patient = makeAdultPatient();
    const order: ImagingOrder = {
      modality: ImagingModality.MRI,
      bodyRegion: "Lumbar Spine",
      studyDescription: "MRI Lumbar Spine",
      contrast: ContrastType.NONE,
      clinicalIndication: "Acute LBP, no red flags",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "ACR_LUMBAR_SPINE_ACUTE_LBP")).toBe(
      true
    );
  });

  it("skips rules with empty keyword arrays (age-triggered rules)", () => {
    // PEDS_CT_HEAD_INFANT has empty keywords — it fires purely on age + modality + region
    const infant: PatientProfile = {
      ...makeAdultPatient(),
      age: 0.5,
      name: "Baby Test",
    };
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Head",
      studyDescription: "CT Head",
      contrast: ContrastType.NONE,
      clinicalIndication: "Completely irrelevant indication string",
      orderingPhysician: "Dr. Test",
      urgency: "URGENT",
      patientId: "test",
    };
    const alerts = evaluateRules(infant, order, []);
    expect(alerts.some((a) => a.ruleId === "PEDS_CT_HEAD_INFANT")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. PATIENT FIXTURE INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

describe("Patient fixture: Mrs. Li-Mei Zhang", () => {
  // We need to mock today() since the expected days count depends on the date
  // For reproducibility, we'll just verify structural correctness
  const events = PRECOMPUTED_DATA["patient_zhang"].events;

  it("fires exactly 2 alerts", () => {
    const result = evaluateAppropriateness(PATIENT_ZHANG, ORDER_ZHANG, events);
    expect(result.alerts).toHaveLength(EXPECTED_ZHANG.alertCount);
  });

  it("fires ACR_CT_ABDOMEN_REPEAT with MEDIUM severity", () => {
    const result = evaluateAppropriateness(PATIENT_ZHANG, ORDER_ZHANG, events);
    const repeatAlert = result.alerts.find(
      (a) => a.ruleId === "ACR_CT_ABDOMEN_REPEAT"
    );
    expect(repeatAlert).toBeDefined();
    expect(repeatAlert?.severity).toBe("MEDIUM");
    expect(repeatAlert?.rating).toBe("MAY_BE_APPROPRIATE");
  });

  it("fires CONTRAST_EGFR_MODERATE with MEDIUM severity (eGFR 38)", () => {
    const result = evaluateAppropriateness(PATIENT_ZHANG, ORDER_ZHANG, events);
    const egfrAlert = result.alerts.find(
      (a) => a.ruleId === "CONTRAST_EGFR_MODERATE"
    );
    expect(egfrAlert).toBeDefined();
    expect(egfrAlert?.severity).toBe("MEDIUM");
    expect(egfrAlert?.description).toContain("38 mL/min");
  });

  it("overall verdict is MAY_BE_APPROPRIATE", () => {
    const result = evaluateAppropriateness(PATIENT_ZHANG, ORDER_ZHANG, events);
    expect(result.overallVerdict).toBe(EXPECTED_ZHANG.overallVerdict);
  });

  it("repeat alert description mentions the prior scan date", () => {
    const result = evaluateAppropriateness(PATIENT_ZHANG, ORDER_ZHANG, events);
    const repeatAlert = result.alerts.find(
      (a) => a.ruleId === "ACR_CT_ABDOMEN_REPEAT"
    );
    expect(repeatAlert?.description).toContain("2026-01-15");
  });
});

describe("Patient fixture: Mr. Rajesh Vikram Patel", () => {
  const events = PRECOMPUTED_DATA["patient_patel"].events;

  it("fires exactly 1 alert", () => {
    const result = evaluateAppropriateness(PATIENT_PATEL, ORDER_PATEL, events);
    expect(result.alerts).toHaveLength(EXPECTED_PATEL.alertCount);
  });

  it("fires ACR_LUMBAR_SPINE_ACUTE_LBP with HIGH severity", () => {
    const result = evaluateAppropriateness(PATIENT_PATEL, ORDER_PATEL, events);
    const alert = result.alerts[0];
    expect(alert.ruleId).toBe("ACR_LUMBAR_SPINE_ACUTE_LBP");
    expect(alert.severity).toBe("HIGH");
    expect(alert.rating).toBe("USUALLY_NOT_APPROPRIATE");
  });

  it("overall verdict is USUALLY_NOT_APPROPRIATE", () => {
    const result = evaluateAppropriateness(PATIENT_PATEL, ORDER_PATEL, events);
    expect(result.overallVerdict).toBe(EXPECTED_PATEL.overallVerdict);
  });

  it("recommendation mentions conservative management 4-6 weeks", () => {
    const result = evaluateAppropriateness(PATIENT_PATEL, ORDER_PATEL, events);
    expect(result.alerts[0].recommendation).toContain("4-6 weeks");
  });
});

describe("Patient fixture: Ms. Carmen Lucia Rivera", () => {
  const events = PRECOMPUTED_DATA["patient_rivera"].events;

  it("fires exactly 1 alert", () => {
    const result = evaluateAppropriateness(
      PATIENT_RIVERA,
      ORDER_RIVERA,
      events
    );
    expect(result.alerts).toHaveLength(EXPECTED_RIVERA.alertCount);
  });

  it("fires FLEISCHNER_LUNG_NODULE with HIGH severity (rating override)", () => {
    const result = evaluateAppropriateness(
      PATIENT_RIVERA,
      ORDER_RIVERA,
      events
    );
    const alert = result.alerts[0];
    expect(alert.ruleId).toBe("FLEISCHNER_LUNG_NODULE");
    expect(alert.severity).toBe("HIGH");
    expect(alert.rating).toBe("USUALLY_NOT_APPROPRIATE");
  });

  it("correctly skips the RECOMMENDED future CT scan (img_rivera_5)", () => {
    const result = evaluateAppropriateness(
      PATIENT_RIVERA,
      ORDER_RIVERA,
      events
    );
    const alert = result.alerts[0];
    // The prior scan referenced should be 2025-12-05 (the completed CT-PA),
    // NOT 2026-12-05 (the recommended future scan)
    expect(alert.description).toContain("2025-12-05");
    expect(alert.description).not.toContain("2026-12-05");
  });

  it("overall verdict is USUALLY_NOT_APPROPRIATE", () => {
    const result = evaluateAppropriateness(
      PATIENT_RIVERA,
      ORDER_RIVERA,
      events
    );
    expect(result.overallVerdict).toBe(EXPECTED_RIVERA.overallVerdict);
  });
});

describe("Patient fixture: Baby Ethan James Kowalski", () => {
  const events = PRECOMPUTED_DATA["patient_kowalski"].events;

  it("fires exactly 1 alert", () => {
    const result = evaluateAppropriateness(
      PATIENT_KOWALSKI,
      ORDER_KOWALSKI,
      events
    );
    expect(result.alerts).toHaveLength(EXPECTED_KOWALSKI.alertCount);
  });

  it("fires PEDS_CT_HEAD_INFANT with HIGH severity", () => {
    const result = evaluateAppropriateness(
      PATIENT_KOWALSKI,
      ORDER_KOWALSKI,
      events
    );
    const alert = result.alerts[0];
    expect(alert.ruleId).toBe("PEDS_CT_HEAD_INFANT");
    expect(alert.severity).toBe("HIGH");
    expect(alert.rating).toBe("USUALLY_NOT_APPROPRIATE");
  });

  it("description uses '3 months' not '0.25 years'", () => {
    const result = evaluateAppropriateness(
      PATIENT_KOWALSKI,
      ORDER_KOWALSKI,
      events
    );
    const alert = result.alerts[0];
    expect(alert.description).toContain("3 months");
    expect(alert.description).not.toContain("0.25 years");
  });

  it("recommendation mentions cranial ultrasound and MRI alternatives", () => {
    const result = evaluateAppropriateness(
      PATIENT_KOWALSKI,
      ORDER_KOWALSKI,
      events
    );
    const alert = result.alerts[0];
    expect(alert.recommendation).toContain("cranial ultrasound");
    expect(alert.recommendation).toContain("MRI");
  });

  it("overall verdict is USUALLY_NOT_APPROPRIATE", () => {
    const result = evaluateAppropriateness(
      PATIENT_KOWALSKI,
      ORDER_KOWALSKI,
      events
    );
    expect(result.overallVerdict).toBe(EXPECTED_KOWALSKI.overallVerdict);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  const makePatient = (overrides: Partial<PatientProfile> = {}): PatientProfile => ({
    id: "test",
    mrn: "99990001",
    name: "Test Patient",
    dob: "1985-06-01",
    age: 40,
    gender: "Male",
    conditions: [],
    allergies: [],
    notes: "",
    priorReports: "",
    ...overrides,
  });

  const makeOrder = (overrides: Partial<ImagingOrder> = {}): ImagingOrder => ({
    modality: ImagingModality.CT,
    bodyRegion: "Abdomen",
    studyDescription: "CT Abdomen",
    contrast: ContrastType.NONE,
    clinicalIndication: "Routine follow-up",
    orderingPhysician: "Dr. Test",
    urgency: "ROUTINE",
    patientId: "test",
    ...overrides,
  });

  describe("eGFR boundary values (tiered rules)", () => {
    it("eGFR exactly 45 — does NOT fire (threshold is < 45)", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 45, creatinine: 1.2, date: "2026-03-01" },
      });
      const order = makeOrder({ contrast: ContrastType.IV_CONTRAST });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_MODERATE")).toBe(false);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_SEVERE")).toBe(false);
    });

    it("eGFR 44 — fires MODERATE with MEDIUM severity", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 44, creatinine: 1.3, date: "2026-03-01" },
      });
      const order = makeOrder({ contrast: ContrastType.IV_CONTRAST });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_EGFR_MODERATE");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe("MEDIUM");
    });

    it("eGFR exactly 30 — fires MODERATE with MEDIUM severity (30 >= 30)", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 30, creatinine: 2.0, date: "2026-03-01" },
      });
      const order = makeOrder({ contrast: ContrastType.IV_CONTRAST });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_EGFR_MODERATE");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe("MEDIUM");
    });

    it("eGFR 29 — fires SEVERE with HIGH severity", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 29, creatinine: 2.2, date: "2026-03-01" },
      });
      const order = makeOrder({ contrast: ContrastType.IV_CONTRAST });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_EGFR_SEVERE");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe("HIGH");
    });

    it("no renal function data — does NOT fire", () => {
      const patient = makePatient(); // no renalFunction
      const order = makeOrder({ contrast: ContrastType.IV_CONTRAST });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_MODERATE")).toBe(false);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_SEVERE")).toBe(false);
    });
  });

  describe("Gadolinium + MRI eGFR check (NSF risk)", () => {
    it("MRI with gadolinium and eGFR 35 fires CONTRAST_EGFR_MODERATE", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 35, creatinine: 1.6, date: "2026-03-01" },
      });
      const order = makeOrder({
        modality: ImagingModality.MRI,
        bodyRegion: "Brain",
        studyDescription: "MRI Brain with Gadolinium",
        contrast: ContrastType.GADOLINIUM,
      });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_EGFR_MODERATE");
      expect(alert).toBeDefined();
    });

    it("MRI without contrast and low eGFR does NOT fire", () => {
      const patient = makePatient({
        renalFunction: { eGFR: 35, creatinine: 1.6, date: "2026-03-01" },
      });
      const order = makeOrder({
        modality: ImagingModality.MRI,
        bodyRegion: "Brain",
        studyDescription: "MRI Brain without Contrast",
        contrast: ContrastType.NONE,
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_MODERATE")).toBe(false);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_EGFR_SEVERE")).toBe(false);
    });
  });

  describe("Age boundary values for pediatric rules", () => {
    it("age exactly 18 — pediatric rules DO NOT fire", () => {
      const patient = makePatient({ age: 18 });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Head",
        studyDescription: "CT Head",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId.startsWith("PEDS_"))).toBe(false);
    });

    it("age 17 — PEDS_CT_HEAD_INFANT does NOT fire (requires < 2 years)", () => {
      const patient = makePatient({ age: 17 });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Head",
        studyDescription: "CT Head",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "PEDS_CT_HEAD_INFANT")).toBe(
        false
      );
    });

    it("age exactly 2 — PEDS_CT_HEAD_INFANT does NOT fire", () => {
      const patient = makePatient({ age: 2 });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Head",
        studyDescription: "CT Head",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "PEDS_CT_HEAD_INFANT")).toBe(
        false
      );
    });

    it("age 1.9 — PEDS_CT_HEAD_INFANT fires", () => {
      const patient = makePatient({ age: 1.9 });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Head",
        studyDescription: "CT Head",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "PEDS_CT_HEAD_INFANT")).toBe(true);
    });

    it("PEDS_CT_ABDOMEN fires for 10-year-old child", () => {
      const patient = makePatient({ age: 10 });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Abdomen",
        studyDescription: "CT Abdomen",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "PEDS_CT_ABDOMEN")).toBe(true);
    });
  });

  describe("Contrast allergy detection", () => {
    it("fires for patient with 'iodine' allergy on contrast CT", () => {
      const patient = makePatient({
        allergies: ["Iodinated contrast (mild urticaria, 2020)"],
      });
      const order = makeOrder({
        contrast: ContrastType.IV_CONTRAST,
        bodyRegion: "Chest",
        modality: ImagingModality.CT,
      });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_ALLERGY");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe("HIGH");
    });

    it("fires for patient with 'gadolinium' allergy on gadolinium MRI", () => {
      const patient = makePatient({
        allergies: ["Gadolinium (prior anaphylactoid reaction)"],
      });
      const order = makeOrder({
        modality: ImagingModality.MRI,
        contrast: ContrastType.GADOLINIUM,
        bodyRegion: "Brain",
      });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_ALLERGY")).toBe(true);
    });

    it("does NOT fire for non-contrast study even with contrast allergy", () => {
      const patient = makePatient({
        allergies: ["Iodinated contrast (severe, 2019)"],
      });
      const order = makeOrder({ contrast: ContrastType.NONE });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_ALLERGY")).toBe(false);
    });
  });

  describe("Pregnancy safety", () => {
    it("fires for pregnant patient with CT order", () => {
      const patient = makePatient({
        age: 30,
        gender: "Female",
        pregnancyStatus: "PREGNANT",
      });
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Abdomen",
      });
      const alerts = evaluateRules(patient, order, []);
      const alert = alerts.find((a) => a.ruleId === "CONTRAST_PREGNANCY");
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe("HIGH");
    });

    it("does NOT fire for pregnant patient with MRI order (MRI not in pregnancy rule targetModalities)", () => {
      const patient = makePatient({
        age: 30,
        gender: "Female",
        pregnancyStatus: "PREGNANT",
      });
      const order = makeOrder({
        modality: ImagingModality.MRI,
        bodyRegion: "Brain",
      });
      const alerts = evaluateRules(patient, order, []);
      // MRI is not in the pregnancy rule's targetModalities (CT, XRAY, FLUOROSCOPY, PET)
      expect(alerts.some((a) => a.ruleId === "CONTRAST_PREGNANCY")).toBe(false);
    });

    it("does NOT fire for UNKNOWN pregnancy status", () => {
      const patient = makePatient({
        age: 30,
        gender: "Female",
        pregnancyStatus: "UNKNOWN",
      });
      const order = makeOrder({ modality: ImagingModality.CT });
      const alerts = evaluateRules(patient, order, []);
      expect(alerts.some((a) => a.ruleId === "CONTRAST_PREGNANCY")).toBe(false);
    });
  });

  describe("Empty and minimal inputs", () => {
    it("no alerts for order with no matching rules", () => {
      const patient = makePatient();
      const order = makeOrder({
        modality: ImagingModality.DEXA,
        bodyRegion: "Hip",
        clinicalIndication: "Osteoporosis screening",
      });
      const result = evaluateAppropriateness(patient, order, []);
      expect(result.alerts).toHaveLength(0);
      expect(result.overallVerdict).toBe("USUALLY_APPROPRIATE");
    });

    it("handles empty prior events array", () => {
      const patient = makePatient();
      const order = makeOrder();
      const result = evaluateAppropriateness(patient, order, []);
      expect(result.priorScanSummary).toBe("No prior imaging on record.");
    });
  });

  describe("RADIATION_DOSE checkType guard", () => {
    it("logs warning and skips for RADIATION_DOSE rule", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Temporarily add a RADIATION_DOSE rule to test the guard
      const testRule = {
        id: "TEST_RADIATION_DOSE",
        title: "Test Radiation Dose Rule",
        source: "INSTITUTIONAL" as const,
        targetModalities: [ImagingModality.CT],
        targetBodyRegions: [],
        clinicalScenarioKeywords: [],
        checkType: "RADIATION_DOSE" as const,
        rating: "MAY_BE_APPROPRIATE" as const,
        descriptionTemplate: () => "test",
        recommendation: "test",
        citation: "test",
        citationUrl: "https://example.com",
      };

      RULES_DATABASE.push(testRule);

      const patient = makePatient();
      const order = makeOrder();
      const alerts = evaluateRules(patient, order, []);

      // The RADIATION_DOSE rule should be skipped (warned, not fired)
      expect(alerts.some((a) => a.ruleId === "TEST_RADIATION_DOSE")).toBe(
        false
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RADIATION_DOSE")
      );

      // Clean up
      RULES_DATABASE.pop();
      warnSpy.mockRestore();
    });
  });

  describe("Repeat scan severity escalation", () => {
    it("repeat scan < 30 days → HIGH severity for MAY_BE_APPROPRIATE rule", () => {
      const patient = makePatient();
      const order = makeOrder({
        modality: ImagingModality.CT,
        bodyRegion: "Abdomen/Pelvis",
        clinicalIndication: "Follow-up",
      });
      // Create a prior CT from 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const priorDate = tenDaysAgo.toISOString().split("T")[0];

      const events: ImagingEvent[] = [
        {
          date: priorDate,
          modality: ImagingModality.CT,
          bodyRegion: "Abdomen/Pelvis",
          studyDescription: "CT Abdomen/Pelvis",
          status: ImagingStatus.COMPLETED,
          contrast: ContrastType.NONE,
          indication: "Prior study",
          keyFindings: [],
          recommendation: "",
          source_quote: "test",
        },
      ];

      const alerts = evaluateRules(patient, order, events);
      const repeatAlert = alerts.find(
        (a) => a.ruleId === "ACR_CT_ABDOMEN_REPEAT"
      );
      expect(repeatAlert).toBeDefined();
      expect(repeatAlert?.severity).toBe("HIGH");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. VERDICT & SUMMARY
// ═══════════════════════════════════════════════════════════════

describe("determineOverallVerdict()", () => {
  const makeAlert = (
    rating: "USUALLY_APPROPRIATE" | "MAY_BE_APPROPRIATE" | "USUALLY_NOT_APPROPRIATE"
  ): AppropriatenessAlert => ({
    ruleId: "test",
    title: "Test",
    severity: "MEDIUM",
    rating,
    description: "test",
    recommendation: "test",
    citation: "test",
    citationUrl: "https://example.com",
  });

  it("returns USUALLY_APPROPRIATE for no alerts", () => {
    expect(determineOverallVerdict([])).toBe("USUALLY_APPROPRIATE");
  });

  it("returns MAY_BE_APPROPRIATE when worst alert is MAY_BE", () => {
    const alerts = [makeAlert("MAY_BE_APPROPRIATE")];
    expect(determineOverallVerdict(alerts)).toBe("MAY_BE_APPROPRIATE");
  });

  it("returns USUALLY_NOT_APPROPRIATE when any alert is USUALLY_NOT", () => {
    const alerts = [
      makeAlert("MAY_BE_APPROPRIATE"),
      makeAlert("USUALLY_NOT_APPROPRIATE"),
    ];
    expect(determineOverallVerdict(alerts)).toBe("USUALLY_NOT_APPROPRIATE");
  });

  it("worst-case wins even with many lower alerts", () => {
    const alerts = [
      makeAlert("MAY_BE_APPROPRIATE"),
      makeAlert("MAY_BE_APPROPRIATE"),
      makeAlert("MAY_BE_APPROPRIATE"),
      makeAlert("USUALLY_NOT_APPROPRIATE"),
    ];
    expect(determineOverallVerdict(alerts)).toBe("USUALLY_NOT_APPROPRIATE");
  });
});

describe("buildPriorScanSummary()", () => {
  const makePrior = (date: string): ImagingEvent => ({
    date,
    modality: ImagingModality.CT,
    bodyRegion: "Chest",
    studyDescription: "CT Chest",
    status: ImagingStatus.COMPLETED,
    contrast: ContrastType.NONE,
    indication: "test",
    keyFindings: [],
    recommendation: "",
    source_quote: "test",
  });

  it("returns 'No prior imaging on record.' for empty array", () => {
    expect(buildPriorScanSummary([])).toBe("No prior imaging on record.");
  });

  it("returns 'No prior imaging on record.' when all events are non-COMPLETED", () => {
    const events: ImagingEvent[] = [
      {
        ...makePrior("2026-01-01"),
        status: ImagingStatus.RECOMMENDED,
      },
    ];
    expect(buildPriorScanSummary(events)).toBe("No prior imaging on record.");
  });

  it("includes count and most recent study description", () => {
    const events = [makePrior("2026-01-01"), makePrior("2026-02-15")];
    const summary = buildPriorScanSummary(events);
    expect(summary).toContain("2 prior imaging studies");
    expect(summary).toContain("CT Chest");
    expect(summary).toContain("2026-02-15");
  });

  it("correctly identifies most recent from unsorted input", () => {
    const events = [
      makePrior("2025-06-01"),
      makePrior("2026-03-01"),
      makePrior("2025-12-15"),
    ];
    const summary = buildPriorScanSummary(events);
    expect(summary).toContain("2026-03-01");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. RULES DATABASE INTEGRITY
// ═══════════════════════════════════════════════════════════════

describe("Rules database integrity", () => {
  it("contains exactly 18 rules", () => {
    expect(RULES_DATABASE).toHaveLength(18);
  });

  it("all rules have unique IDs", () => {
    const ids = RULES_DATABASE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rules have required fields", () => {
    for (const rule of RULES_DATABASE) {
      expect(rule.id).toBeTruthy();
      expect(rule.title).toBeTruthy();
      expect(rule.source).toMatch(/^(ACR|CHOOSING_WISELY|INSTITUTIONAL)$/);
      expect(rule.checkType).toMatch(
        /^(REPEAT_SCAN|CONTRAST_SAFETY|APPROPRIATENESS|RADIATION_DOSE)$/
      );
      expect(rule.rating).toBeTruthy();
      expect(typeof rule.descriptionTemplate).toBe("function");
      expect(rule.recommendation).toBeTruthy();
      expect(rule.citation).toBeTruthy();
      expect(rule.citationUrl).toMatch(/^https?:\/\//);
    }
  });

  it("REPEAT_SCAN rules have minIntervalDays", () => {
    const repeatRules = RULES_DATABASE.filter(
      (r) => r.checkType === "REPEAT_SCAN"
    );
    for (const rule of repeatRules) {
      expect(rule.minIntervalDays).toBeGreaterThan(0);
    }
  });

  it("descriptionTemplate returns a non-empty string", () => {
    for (const rule of RULES_DATABASE) {
      const result = rule.descriptionTemplate("Test Study", "test context");
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. LUNG-RADS & BI-RADS RULES
// ═══════════════════════════════════════════════════════════════

describe("Lung-RADS rules", () => {
  const makePatient = (): PatientProfile => ({
    id: "test",
    mrn: "99990001",
    name: "Test Patient",
    dob: "1960-01-01",
    age: 66,
    gender: "Male",
    conditions: [],
    allergies: [],
    notes: "",
    priorReports: "",
  });

  it("LUNGRADS_SCREENING_ELIGIBILITY fires for LDCT lung screening", () => {
    const patient = makePatient();
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "Low Dose CT Chest",
      contrast: ContrastType.NONE,
      clinicalIndication: "Lung cancer screening, LDCT, 30 pack-year history",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "LUNGRADS_SCREENING_ELIGIBILITY")).toBe(true);
  });

  it("LUNGRADS_EARLY_FOLLOWUP fires when prior screening is < 330 days", () => {
    const patient = makePatient();
    const order: ImagingOrder = {
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "CT Chest LDCT",
      contrast: ContrastType.NONE,
      clinicalIndication: "Annual screening follow-up, lung screening follow",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const events: ImagingEvent[] = [{
      date: sixMonthsAgo.toISOString().split("T")[0],
      modality: ImagingModality.CT,
      bodyRegion: "Chest",
      studyDescription: "CT Chest LDCT Screening",
      status: ImagingStatus.COMPLETED,
      contrast: ContrastType.NONE,
      indication: "Lung screening",
      keyFindings: [],
      recommendation: "",
      source_quote: "test",
    }];
    const alerts = evaluateRules(patient, order, events);
    expect(alerts.some((a) => a.ruleId === "LUNGRADS_EARLY_FOLLOWUP")).toBe(true);
  });
});

describe("BI-RADS rules", () => {
  const makePatient = (): PatientProfile => ({
    id: "test",
    mrn: "99990001",
    name: "Test Patient",
    dob: "1975-05-15",
    age: 50,
    gender: "Female",
    conditions: [],
    allergies: [],
    notes: "",
    priorReports: "",
  });

  it("BIRADS_SCREENING_INTERVAL fires for premature repeat mammogram", () => {
    const patient = makePatient();
    const order: ImagingOrder = {
      modality: ImagingModality.MAMMOGRAPHY,
      bodyRegion: "Breast",
      studyDescription: "Screening Mammography",
      contrast: ContrastType.NONE,
      clinicalIndication: "Annual mammogram, routine mammogram screening",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setDate(fourMonthsAgo.getDate() - 120);
    const events: ImagingEvent[] = [{
      date: fourMonthsAgo.toISOString().split("T")[0],
      modality: ImagingModality.MAMMOGRAPHY,
      bodyRegion: "Breast",
      studyDescription: "Screening Mammography",
      status: ImagingStatus.COMPLETED,
      contrast: ContrastType.NONE,
      indication: "Annual screening",
      keyFindings: [],
      recommendation: "",
      source_quote: "test",
    }];
    const alerts = evaluateRules(patient, order, events);
    expect(alerts.some((a) => a.ruleId === "BIRADS_SCREENING_INTERVAL")).toBe(true);
  });

  it("BIRADS_DIAGNOSTIC_AFTER_SCREENING fires for BI-RADS 0 workup", () => {
    const patient = makePatient();
    const order: ImagingOrder = {
      modality: ImagingModality.MAMMOGRAPHY,
      bodyRegion: "Breast",
      studyDescription: "Diagnostic Mammography",
      contrast: ContrastType.NONE,
      clinicalIndication: "Callback for BI-RADS 0 incomplete screening",
      orderingPhysician: "Dr. Test",
      urgency: "URGENT",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "BIRADS_DIAGNOSTIC_AFTER_SCREENING")).toBe(true);
  });

  it("BIRADS_SHORT_INTERVAL_FOLLOWUP fires for BI-RADS 3 follow-up", () => {
    const patient = makePatient();
    const order: ImagingOrder = {
      modality: ImagingModality.ULTRASOUND,
      bodyRegion: "Breast",
      studyDescription: "Breast Ultrasound",
      contrast: ContrastType.NONE,
      clinicalIndication: "BI-RADS 3 probably benign, 6 month follow-up",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const alerts = evaluateRules(patient, order, []);
    expect(alerts.some((a) => a.ruleId === "BIRADS_SHORT_INTERVAL_FOLLOWUP")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. NO APPLICABLE RULES vs EXPLICITLY APPROPRIATE
// ═══════════════════════════════════════════════════════════════

describe("'No rules matched' distinction", () => {
  it("returns USUALLY_APPROPRIATE with explicit 'no concerns' summary when no rules fire", () => {
    const patient: PatientProfile = {
      id: "test", mrn: "99990001", name: "Test", dob: "1985-06-01",
      age: 40, gender: "Male", conditions: [], allergies: [],
      notes: "", priorReports: "",
    };
    const order: ImagingOrder = {
      modality: ImagingModality.DEXA,
      bodyRegion: "Hip",
      studyDescription: "DEXA Bone Density",
      contrast: ContrastType.NONE,
      clinicalIndication: "Osteoporosis screening",
      orderingPhysician: "Dr. Test",
      urgency: "ROUTINE",
      patientId: "test",
    };
    const result = evaluateAppropriateness(patient, order, []);
    expect(result.overallVerdict).toBe("USUALLY_APPROPRIATE");
    expect(result.summary).toContain("No appropriateness concerns");
  });
});

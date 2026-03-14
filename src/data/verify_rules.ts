/**
 * RadView — Rules Engine Verification Script
 *
 * Runs evaluateAppropriateness() for each demo patient and compares
 * the output against the expected alert fixtures in expected_alerts.ts.
 *
 * Usage: npx tsx src/data/verify_rules.ts
 */

import { evaluateAppropriateness } from "../services/rulesEngine";
import {
  PATIENT_ZHANG,
  PATIENT_PATEL,
  PATIENT_RIVERA,
  PATIENT_KOWALSKI,
  ORDER_ZHANG,
  ORDER_PATEL,
  ORDER_RIVERA,
  ORDER_KOWALSKI,
} from "./patients";
import { PRECOMPUTED_DATA } from "./precomputed";
import {
  EXPECTED_ZHANG,
  EXPECTED_PATEL,
  EXPECTED_RIVERA,
  EXPECTED_KOWALSKI,
} from "./expected_alerts";

type Expected = {
  alertCount: number;
  overallVerdict: string;
  alerts: { ruleId?: string; severity?: string; rating?: string }[];
};

const verify = (
  label: string,
  patientId: string,
  patient: Parameters<typeof evaluateAppropriateness>[0],
  order: Parameters<typeof evaluateAppropriateness>[1],
  expected: Expected
) => {
  const events = PRECOMPUTED_DATA[patientId]?.events ?? [];
  const result = evaluateAppropriateness(patient, order, events);

  let pass = true;
  const issues: string[] = [];

  // Check alert count
  if (result.alerts.length !== expected.alertCount) {
    pass = false;
    issues.push(
      `Alert count: expected ${expected.alertCount}, got ${result.alerts.length}`
    );
  }

  // Check overall verdict
  if (result.overallVerdict !== expected.overallVerdict) {
    pass = false;
    issues.push(
      `Verdict: expected ${expected.overallVerdict}, got ${result.overallVerdict}`
    );
  }

  // Check individual alerts
  for (const exp of expected.alerts) {
    const actual = result.alerts.find((a) => a.ruleId === exp.ruleId);
    if (!actual) {
      pass = false;
      issues.push(`Missing alert: ${exp.ruleId}`);
      continue;
    }
    if (exp.severity && actual.severity !== exp.severity) {
      pass = false;
      issues.push(
        `${exp.ruleId} severity: expected ${exp.severity}, got ${actual.severity}`
      );
    }
    if (exp.rating && actual.rating !== exp.rating) {
      pass = false;
      issues.push(
        `${exp.ruleId} rating: expected ${exp.rating}, got ${actual.rating}`
      );
    }
  }

  // Check no unexpected alerts
  for (const actual of result.alerts) {
    if (!expected.alerts.find((e) => e.ruleId === actual.ruleId)) {
      pass = false;
      issues.push(`Unexpected alert: ${actual.ruleId} — "${actual.title}"`);
    }
  }

  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${label}`);
  if (!pass) {
    issues.forEach((i) => console.log(`       ${i}`));
  } else {
    console.log(`       ${result.alerts.length} alert(s), verdict: ${result.overallVerdict}`);
    result.alerts.forEach((a) =>
      console.log(`       - ${a.ruleId} [${a.severity}]: ${a.title}`)
    );
  }
  console.log();

  return pass;
};

// ─── Run ────────────────────────────────────────────────────

console.log("RadView Rules Engine — Verification\n");
console.log("=".repeat(50));
console.log();

const results = [
  verify("Mrs. Zhang (CT A/P + contrast)", "patient_zhang", PATIENT_ZHANG, ORDER_ZHANG, EXPECTED_ZHANG),
  verify("Mr. Patel (MRI Lumbar Spine)", "patient_patel", PATIENT_PATEL, ORDER_PATEL, EXPECTED_PATEL),
  verify("Ms. Rivera (CT Chest)", "patient_rivera", PATIENT_RIVERA, ORDER_RIVERA, EXPECTED_RIVERA),
  verify("Baby Kowalski (CT Head)", "patient_kowalski", PATIENT_KOWALSKI, ORDER_KOWALSKI, EXPECTED_KOWALSKI),
];

console.log("=".repeat(50));
const allPass = results.every(Boolean);
console.log(allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED");
if (!allPass) throw new Error("Some verification tests failed");

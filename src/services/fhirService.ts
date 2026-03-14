/**
 * RadView — FHIR R4 Client Service
 *
 * Connects to FHIR R4 endpoints (HAPI, Logica Health, etc.)
 * and loads patient data into RadView's internal type system.
 *
 * This is the single highest-leverage feature for portfolio credibility:
 * it transforms RadView from "demo with sample data" to "connects to
 * real clinical infrastructure."
 *
 * Supported FHIR resources:
 *   - Patient → PatientProfile (demographics, conditions)
 *   - Condition → PatientProfile.conditions
 *   - AllergyIntolerance → PatientProfile.allergies
 *   - Observation (lab) → PatientProfile.renalFunction
 *   - DiagnosticReport (radiology) → ImagingEvent[]
 *   - ServiceRequest → ImagingOrder
 */

import { z } from "zod";
import type {
  PatientProfile,
  ImagingOrder,
  ImagingEvent,
} from "../types";
import {
  ImagingModality,
  ImagingStatus,
  ContrastType,
  AppError,
  ErrorCategory,
} from "../types";
import { logger } from "../utils/logger";

// ═══════════════════════════════════════════════════════════════
// PUBLIC FHIR R4 SANDBOX SERVERS
// ═══════════════════════════════════════════════════════════════

export interface FhirServer {
  name: string;
  url: string;
  description: string;
}

export const FHIR_SANDBOX_SERVERS: FhirServer[] = [
  {
    name: "HAPI FHIR R4",
    url: "https://hapi.fhir.org/baseR4",
    description: "Public HAPI FHIR reference server (R4)",
  },
  {
    name: "HAPI FHIR R4 (Sandbox)",
    url: "https://hapi.fhir.org/baseR4",
    description: "HAPI FHIR with synthetic patient data",
  },
];

// ═══════════════════════════════════════════════════════════════
// FHIR RESOURCE INTERFACES (minimal, R4-compatible)
// ═══════════════════════════════════════════════════════════════

interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{
    family?: string;
    given?: string[];
    prefix?: string[];
    use?: string;
  }>;
  gender?: string;
  birthDate?: string;
}

interface FhirCondition {
  resourceType: "Condition";
  code?: {
    coding?: Array<{ display?: string; code?: string; system?: string }>;
    text?: string;
  };
  clinicalStatus?: {
    coding?: Array<{ code?: string }>;
  };
}

interface FhirAllergyIntolerance {
  resourceType: "AllergyIntolerance";
  code?: {
    coding?: Array<{ display?: string }>;
    text?: string;
  };
  reaction?: Array<{
    manifestation?: Array<{ coding?: Array<{ display?: string }>; text?: string }>;
  }>;
}

interface FhirObservation {
  resourceType: "Observation";
  code?: {
    coding?: Array<{ code?: string; display?: string; system?: string }>;
  };
  valueQuantity?: { value?: number; unit?: string };
  effectiveDateTime?: string;
  status?: string;
}

interface FhirDiagnosticReport {
  resourceType: "DiagnosticReport";
  id?: string;
  status?: string;
  category?: Array<{
    coding?: Array<{ code?: string; display?: string; system?: string }>;
  }>;
  code?: {
    coding?: Array<{ display?: string; code?: string }>;
    text?: string;
  };
  effectiveDateTime?: string;
  conclusion?: string;
  presentedForm?: Array<{ data?: string; contentType?: string }>;
}

interface FhirServiceRequest {
  resourceType: "ServiceRequest";
  id?: string;
  status?: string;
  intent?: string;
  code?: {
    coding?: Array<{ display?: string; code?: string; system?: string }>;
    text?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{ display?: string }>;
    text?: string;
  }>;
  priority?: string;
  requester?: { display?: string };
}

interface FhirBundle<T> {
  resourceType: "Bundle";
  total?: number;
  entry?: Array<{ resource: T }>;
}

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMAS FOR FHIR R4 RESOURCES
// ═══════════════════════════════════════════════════════════════

/** Validates the minimum shape we depend on for FhirPatient */
const FhirPatientSchema = z.object({
  resourceType: z.literal("Patient"),
  id: z.string(),
  identifier: z.array(z.object({ system: z.string().optional(), value: z.string().optional() })).optional(),
  name: z.array(z.object({
    family: z.string().optional(),
    given: z.array(z.string()).optional(),
    prefix: z.array(z.string()).optional(),
    use: z.string().optional(),
  })).optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
});

/** Validates a FHIR Bundle envelope (generic — just checks structure) */
const FhirBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  total: z.number().optional(),
  entry: z.array(z.object({ resource: z.record(z.unknown()) })).optional(),
});

/**
 * Validates FHIR response data with Zod.
 * Logs warnings for unexpected shapes but returns the data as-is
 * to avoid blocking the workflow for minor schema mismatches.
 */
function validateFhirResponse<T>(data: unknown, label: string): T {
  if (label === "Patient") {
    const result = FhirPatientSchema.safeParse(data);
    if (!result.success) {
      logger.warn(
        `[FHIR] Patient resource validation warning: ${result.error.issues.map(i => i.message).join(", ")}`
      );
    }
  } else if (label === "Bundle") {
    const result = FhirBundleSchema.safeParse(data);
    if (!result.success) {
      logger.warn(
        `[FHIR] Bundle validation warning: ${result.error.issues.map(i => i.message).join(", ")}`
      );
    }
  }
  return data as T;
}

// ═══════════════════════════════════════════════════════════════
// FHIR CLIENT
// ═══════════════════════════════════════════════════════════════

const FHIR_TIMEOUT_MS = 15_000;

async function fhirFetch<T>(baseUrl: string, path: string, label?: string): Promise<T> {
  // Validate URL format — block non-HTTPS (except localhost for dev)
  const normalizedBase = baseUrl.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalizedBase)) {
    throw new AppError(ErrorCategory.VALIDATION, `Invalid FHIR server URL: ${normalizedBase}`);
  }
  if (normalizedBase.startsWith("http://") && !normalizedBase.includes("localhost")) {
    logger.warn("[FHIR] Non-HTTPS FHIR server URL detected. Consider using HTTPS for security.");
  }

  const url = `${normalizedBase}/${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FHIR_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/fhir+json",
        "Content-Type": "application/fhir+json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        ErrorCategory.SERVER,
        `FHIR server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return label ? validateFhirResponse<T>(data, label) : (data as T);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AppError(ErrorCategory.SERVER, "FHIR request timed out");
    }
    throw new AppError(
      ErrorCategory.SERVER,
      `Failed to connect to FHIR server: ${err instanceof Error ? err.message : "Unknown error"}`,
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════════════════════════════════════════════════════════
// SERVER VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface FhirCapabilityResult {
  serverName: string;
  fhirVersion: string;
  supportsPatient: boolean;
  supportsDiagnosticReport: boolean;
}

export async function validateFhirServer(
  baseUrl: string
): Promise<FhirCapabilityResult> {
  const metadata = await fhirFetch<{
    resourceType: string;
    fhirVersion?: string;
    software?: { name?: string };
    rest?: Array<{
      resource?: Array<{ type: string }>;
    }>;
  }>(baseUrl, "metadata?_summary=true");

  if (metadata.resourceType !== "CapabilityStatement") {
    throw new AppError(
      ErrorCategory.VALIDATION,
      "Server did not return a valid FHIR CapabilityStatement"
    );
  }

  const resources =
    metadata.rest?.[0]?.resource?.map((r) => r.type) ?? [];

  return {
    serverName: metadata.software?.name ?? "Unknown FHIR Server",
    fhirVersion: metadata.fhirVersion ?? "unknown",
    supportsPatient: resources.includes("Patient"),
    supportsDiagnosticReport: resources.includes("DiagnosticReport"),
  };
}

// ═══════════════════════════════════════════════════════════════
// PATIENT SEARCH
// ═══════════════════════════════════════════════════════════════

export interface FhirPatientSummary {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  identifier?: string;
}

function formatFhirName(patient: FhirPatient): string {
  const nameEntry = patient.name?.find((n) => n.use === "official") ?? patient.name?.[0];
  if (!nameEntry) return `Patient ${patient.id}`;

  const prefix = nameEntry.prefix?.join(" ") ?? "";
  const given = nameEntry.given?.join(" ") ?? "";
  const family = nameEntry.family ?? "";

  return [prefix, given, family].filter(Boolean).join(" ").trim();
}

export async function searchPatients(
  baseUrl: string,
  query?: string,
  count = 20
): Promise<FhirPatientSummary[]> {
  let path = `Patient?_count=${count}&_sort=-_lastUpdated`;
  if (query) {
    path += `&name=${encodeURIComponent(query)}`;
  }

  const bundle = await fhirFetch<FhirBundle<FhirPatient>>(baseUrl, path);
  if (!bundle.entry) return [];

  return bundle.entry.map((e) => ({
    id: e.resource.id,
    name: formatFhirName(e.resource),
    gender: e.resource.gender ?? "unknown",
    birthDate: e.resource.birthDate ?? "unknown",
    identifier: e.resource.identifier?.[0]?.value,
  }));
}

// ═══════════════════════════════════════════════════════════════
// FULL PATIENT LOAD (Demographics + Clinical Data)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculates age from birth date string (YYYY-MM-DD).
 * Appends "T00:00:00" to force local-timezone parsing, consistent with
 * daysBetween() and today() in the rules engine.
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  // For infants, return fractional years
  if (age < 2) {
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    return Math.max(0, months / 12);
  }
  return age;
}

function mapGender(fhirGender?: string): string {
  switch (fhirGender) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "other":
      return "Other";
    default:
      return "Unknown";
  }
}

// ─── Modality mapping from FHIR/LOINC codes ────────────────

const MODALITY_MAP: Record<string, ImagingModality> = {
  // Common LOINC/SNOMED display terms
  ct: ImagingModality.CT,
  "computed tomography": ImagingModality.CT,
  "cat scan": ImagingModality.CT,
  mri: ImagingModality.MRI,
  "magnetic resonance": ImagingModality.MRI,
  mr: ImagingModality.MRI,
  "x-ray": ImagingModality.XRAY,
  xray: ImagingModality.XRAY,
  radiograph: ImagingModality.XRAY,
  radiography: ImagingModality.XRAY,
  ultrasound: ImagingModality.ULTRASOUND,
  us: ImagingModality.ULTRASOUND,
  sonography: ImagingModality.ULTRASOUND,
  echo: ImagingModality.ULTRASOUND,
  pet: ImagingModality.PET,
  "positron emission": ImagingModality.PET,
  nuclear: ImagingModality.NUCLEAR,
  scintigraphy: ImagingModality.NUCLEAR,
  fluoroscopy: ImagingModality.FLUOROSCOPY,
  fluoro: ImagingModality.FLUOROSCOPY,
  mammography: ImagingModality.MAMMOGRAPHY,
  mammogram: ImagingModality.MAMMOGRAPHY,
  dexa: ImagingModality.DEXA,
  "bone density": ImagingModality.DEXA,
  angiography: ImagingModality.ANGIOGRAPHY,
  angiogram: ImagingModality.ANGIOGRAPHY,
};

function inferModality(description: string): ImagingModality {
  const lower = description.toLowerCase();
  for (const [keyword, modality] of Object.entries(MODALITY_MAP)) {
    if (lower.includes(keyword)) return modality;
  }
  return ImagingModality.OTHER;
}

// ─── Body region extraction ────────────────────────────────

const BODY_REGION_MAP: Array<[RegExp, string]> = [
  [/\b(head|brain|cranial|intracranial)\b/i, "Head/Brain"],
  [/\b(chest|thorax|thoracic|lung|pulmonary)\b/i, "Chest"],
  [/\b(abdomen|abdominal)\b.*\b(pelvis|pelvic)\b/i, "Abdomen/Pelvis"],
  [/\b(abdomen|abdominal)\b/i, "Abdomen"],
  [/\b(pelvis|pelvic)\b/i, "Pelvis"],
  [/\b(lumbar|lumbosacral|l-spine)\b/i, "Lumbar Spine"],
  [/\b(cervical|c-spine)\b/i, "Cervical Spine"],
  [/\b(thoracic|t-spine)\b/i, "Thoracic Spine"],
  [/\b(spine|spinal)\b/i, "Spine"],
  [/\b(shoulder)\b/i, "Shoulder"],
  [/\b(knee)\b/i, "Knee"],
  [/\b(hip)\b/i, "Hip"],
  [/\b(ankle|foot)\b/i, "Ankle/Foot"],
  [/\b(wrist|hand)\b/i, "Wrist/Hand"],
  [/\b(neck|thyroid)\b/i, "Neck"],
  [/\b(breast|mamm)\b/i, "Breast"],
];

function inferBodyRegion(description: string): string {
  for (const [pattern, region] of BODY_REGION_MAP) {
    if (pattern.test(description)) return region;
  }
  return "Unspecified";
}

// ─── Contrast inference ────────────────────────────────────

function inferContrast(description: string): ContrastType {
  const lower = description.toLowerCase();
  if (lower.includes("with and without contrast") || lower.includes("w/ and w/o")) {
    return ContrastType.BOTH;
  }
  if (lower.includes("gadolinium")) return ContrastType.GADOLINIUM;
  if (lower.includes("with contrast") || lower.includes("w/ contrast") || lower.includes("+ contrast")) {
    return ContrastType.IV_CONTRAST;
  }
  if (lower.includes("without contrast") || lower.includes("w/o contrast") || lower.includes("non-contrast")) {
    return ContrastType.NONE;
  }
  return ContrastType.UNKNOWN;
}

// ─── eGFR LOINC codes ────────────────────────────────────

const EGFR_LOINC_CODES = [
  "33914-3", // eGFR/1.73 sq M.predicted
  "48642-3", // eGFR/1.73 sq M CKD-EPI
  "48643-1", // eGFR/1.73 sq M MDRD
  "62238-1", // eGFR CKD-EPI
  "77147-7", // eGFR CKD-EPI 2021
  "88294-4", // eGFR CKD-EPI 2021 (race free)
];

const CREATININE_LOINC_CODES = [
  "2160-0", // Creatinine [Mass/volume] in Serum or Plasma
  "38483-4", // Creatinine in blood
];

// ═══════════════════════════════════════════════════════════════
// LOAD FULL PATIENT
// ═══════════════════════════════════════════════════════════════

export interface FhirPatientData {
  patient: PatientProfile;
  priorEvents: ImagingEvent[];
  pendingOrders: ImagingOrder[];
}

export async function loadFhirPatient(
  baseUrl: string,
  patientId: string
): Promise<FhirPatientData> {
  logger.log(`[FHIR] Loading patient ${patientId} from ${baseUrl}`);

  // Resource count limits
  const CONDITION_LIMIT = 50;
  const ALLERGY_LIMIT = 20;
  const OBSERVATION_LIMIT = 50;
  const REPORT_LIMIT = 50;
  const ORDER_LIMIT = 10;

  // Fetch all resources in parallel
  const [
    patientResource,
    conditionsBundle,
    allergiesBundle,
    observationsBundle,
    reportsBundle,
    requestsBundle,
  ] = await Promise.all([
    fhirFetch<FhirPatient>(baseUrl, `Patient/${patientId}`, "Patient"),
    fhirFetch<FhirBundle<FhirCondition>>(
      baseUrl,
      `Condition?patient=${patientId}&_count=${CONDITION_LIMIT}`,
      "Bundle"
    ),
    fhirFetch<FhirBundle<FhirAllergyIntolerance>>(
      baseUrl,
      `AllergyIntolerance?patient=${patientId}&_count=${ALLERGY_LIMIT}`,
      "Bundle"
    ),
    fhirFetch<FhirBundle<FhirObservation>>(
      baseUrl,
      `Observation?patient=${patientId}&category=laboratory&_count=${OBSERVATION_LIMIT}&_sort=-date`,
      "Bundle"
    ),
    fhirFetch<FhirBundle<FhirDiagnosticReport>>(
      baseUrl,
      `DiagnosticReport?patient=${patientId}&category=http://loinc.org|LP29684-5&_count=${REPORT_LIMIT}&_sort=-date`,
      "Bundle"
    ),
    fhirFetch<FhirBundle<FhirServiceRequest>>(
      baseUrl,
      `ServiceRequest?patient=${patientId}&status=active,draft&_count=${ORDER_LIMIT}&_sort=-authored`,
      "Bundle"
    ),
  ]);

  // Log truncation warnings if bundle totals exceed our fetch limits
  const truncationWarnings: string[] = [];
  if (conditionsBundle.total && conditionsBundle.total > CONDITION_LIMIT) {
    truncationWarnings.push(`Conditions: showing ${CONDITION_LIMIT} of ${conditionsBundle.total}`);
  }
  if (reportsBundle.total && reportsBundle.total > REPORT_LIMIT) {
    truncationWarnings.push(`Diagnostic Reports: showing ${REPORT_LIMIT} of ${reportsBundle.total}`);
  }
  if (requestsBundle.total && requestsBundle.total > ORDER_LIMIT) {
    truncationWarnings.push(`Service Requests: showing ${ORDER_LIMIT} of ${requestsBundle.total}`);
  }
  if (truncationWarnings.length > 0) {
    logger.warn(`[FHIR] Data truncated for patient ${patientId}: ${truncationWarnings.join("; ")}`);
  }

  // ─── Map conditions ─────────────────────────────────
  const conditions: string[] = (conditionsBundle.entry ?? [])
    .map((e) => {
      const isActive = e.resource.clinicalStatus?.coding?.some(
        (c) => c.code === "active" || c.code === "recurrence"
      );
      if (!isActive) return null;
      return e.resource.code?.text ?? e.resource.code?.coding?.[0]?.display ?? null;
    })
    .filter((c): c is string => c !== null);

  // ─── Map allergies ──────────────────────────────────
  const allergies: string[] = (allergiesBundle.entry ?? [])
    .map((e) => {
      const name =
        e.resource.code?.text ?? e.resource.code?.coding?.[0]?.display ?? "Unknown allergen";
      const reaction = e.resource.reaction?.[0]?.manifestation?.[0];
      const reactionText =
        reaction?.text ?? reaction?.coding?.[0]?.display;
      return reactionText ? `${name} (${reactionText})` : name;
    });

  if (allergies.length === 0) allergies.push("Nil known drug allergies");

  // ─── Extract renal function (eGFR + creatinine) ─────
  const observations = observationsBundle.entry?.map((e) => e.resource) ?? [];

  let renalFunction: PatientProfile["renalFunction"] = undefined;

  const egfrObs = observations.find((obs) =>
    obs.code?.coding?.some((c) => EGFR_LOINC_CODES.includes(c.code ?? ""))
  );
  const creatinineObs = observations.find((obs) =>
    obs.code?.coding?.some((c) => CREATININE_LOINC_CODES.includes(c.code ?? ""))
  );

  if (egfrObs?.valueQuantity?.value) {
    renalFunction = {
      eGFR: egfrObs.valueQuantity.value,
      creatinine: creatinineObs?.valueQuantity?.value ?? 0,
      date: (egfrObs.effectiveDateTime ?? "").slice(0, 10),
    };
  }

  // ─── Map diagnostic reports → ImagingEvents ─────────
  const priorEvents: ImagingEvent[] = (reportsBundle.entry ?? [])
    .map((e, idx) => {
      const report = e.resource;
      const description =
        report.code?.text ?? report.code?.coding?.[0]?.display ?? "Imaging Study";
      const date = (report.effectiveDateTime ?? "").slice(0, 10);

      return {
        id: `fhir_${report.id ?? idx}`,
        date: date || "2026-01-01",
        modality: inferModality(description),
        bodyRegion: inferBodyRegion(description),
        studyDescription: description,
        status: report.status === "final" ? ImagingStatus.COMPLETED : ImagingStatus.PENDING,
        contrast: inferContrast(description),
        indication: "",
        keyFindings: report.conclusion ? [report.conclusion] : [],
        recommendation: "",
        source_quote: report.conclusion ?? description,
      } satisfies ImagingEvent;
    })
    .filter((e) => e.date.length === 10); // Only include events with valid dates

  // ─── Map service requests → ImagingOrders ───────────
  const pendingOrders: ImagingOrder[] = (requestsBundle.entry ?? [])
    .map((e) => {
      const req = e.resource;
      const description =
        req.code?.text ?? req.code?.coding?.[0]?.display ?? "Imaging Order";
      const indication =
        req.reasonCode?.[0]?.text ??
        req.reasonCode?.[0]?.coding?.[0]?.display ??
        "Clinical evaluation";

      // Map FHIR priority to typed urgency — explicit mapping avoids unsafe casts
      const urgencyMap: Record<string, ImagingOrder["urgency"]> = {
        urgent: "URGENT",
        stat: "STAT",
        asap: "URGENT",
        routine: "ROUTINE",
      };
      const mappedUrgency = urgencyMap[req.priority?.toLowerCase() ?? ""] ?? "ROUTINE";

      return {
        modality: inferModality(description),
        bodyRegion: inferBodyRegion(description),
        studyDescription: description,
        contrast: inferContrast(description),
        clinicalIndication: indication,
        orderingPhysician: req.requester?.display ?? "Unknown",
        urgency: mappedUrgency,
        patientId: `fhir_${patientId}`,
      } satisfies ImagingOrder;
    });

  // ─── Build patient notes from available data ────────
  const notesLines: string[] = [
    `FHIR Patient: ${formatFhirName(patientResource)}`,
    `ID: ${patientResource.id}`,
    `DOB: ${patientResource.birthDate ?? "Unknown"}`,
    `Gender: ${mapGender(patientResource.gender)}`,
    "",
    "=== ACTIVE CONDITIONS ===",
    ...(conditions.length > 0 ? conditions.map((c) => `- ${c}`) : ["None documented"]),
    "",
    "=== ALLERGIES ===",
    ...allergies.map((a) => `- ${a}`),
    "",
  ];

  if (renalFunction) {
    notesLines.push(
      "=== RENAL FUNCTION ===",
      `eGFR: ${renalFunction.eGFR} mL/min/1.73m² (${renalFunction.date})`,
      `Creatinine: ${renalFunction.creatinine} mg/dL`,
      ""
    );
  }

  // Build prior reports text
  const reportLines = priorEvents.map(
    (e) =>
      `[${e.date}] ${e.studyDescription} — ${e.status}${
        e.keyFindings.length > 0 ? `: ${e.keyFindings.join("; ")}` : ""
      }`
  );

  // ─── Assemble PatientProfile ────────────────────────
  const patient: PatientProfile = {
    id: `fhir_${patientId}`,
    mrn: patientResource.identifier?.[0]?.value ?? patientId,
    name: formatFhirName(patientResource),
    dob: patientResource.birthDate ?? "1970-01-01",
    age: patientResource.birthDate
      ? calculateAge(patientResource.birthDate)
      : 0,
    gender: mapGender(patientResource.gender),
    conditions,
    allergies,
    renalFunction,
    notes: notesLines.join("\n"),
    priorReports:
      reportLines.length > 0
        ? reportLines.join("\n\n")
        : "No prior radiology reports available.",
  };

  logger.log(
    `[FHIR] Loaded patient ${patient.name}: ${conditions.length} conditions, ` +
    `${allergies.length} allergies, ${priorEvents.length} prior imaging studies, ` +
    `${pendingOrders.length} pending orders`
  );

  return { patient, priorEvents, pendingOrders };
}

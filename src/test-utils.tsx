/**
 * RadView — Component Test Utilities
 *
 * Provides helpers for rendering components with a controlled Zustand store.
 * Instead of mocking useAppStore directly (which is fragile), we use
 * Zustand's setState to inject test data before each render.
 */

import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useAppStore } from "./store/useAppStore";
import type {
  PatientProfile,
  ImagingOrder,
  CompleteAnalysisResult,
  ChatMessage,
  AnalysisStatus,
  ViewState,
} from "./types";
import { ImagingModality, ContrastType, ImagingStatus, AppError } from "./types";

// ─── Mock Patient ──────────────────────────────────────────────

export const mockPatient: PatientProfile = {
  id: "patient_test",
  mrn: "99990001",
  name: "Test Patient",
  dob: "1980-01-15",
  age: 45,
  gender: "Male",
  conditions: ["Hypertension"],
  allergies: [],
  renalFunction: { eGFR: 90, creatinine: 1.0, date: "2025-01-01" },
  pregnancyStatus: "NOT_PREGNANT",
  notes: "Test patient clinical notes with relevant history.",
  priorReports: "Test patient prior radiology report.",
};

export const mockOrder: ImagingOrder = {
  modality: ImagingModality.CT,
  bodyRegion: "Abdomen/Pelvis",
  studyDescription: "CT Abdomen/Pelvis with IV contrast",
  contrast: ContrastType.IV_CONTRAST,
  clinicalIndication: "Abdominal pain, rule out appendicitis",
  orderingPhysician: "Dr. Test",
  urgency: "ROUTINE",
  patientId: "patient_test",
};

export const mockAnalysisResult: CompleteAnalysisResult = {
  extraction: {
    patientId: "patient_test",
    events: [
      {
        date: "2025-01-15",
        modality: ImagingModality.CT,
        bodyRegion: "Abdomen/Pelvis",
        studyDescription: "CT Abdomen/Pelvis with contrast",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.IV_CONTRAST,
        indication: "Abdominal pain",
        keyFindings: ["No acute abnormality"],
        recommendation: "No follow-up needed",
        source_quote: "CT abdomen/pelvis performed 1/15/2025",
      },
      {
        date: "2024-06-10",
        modality: ImagingModality.MRI,
        bodyRegion: "Brain",
        studyDescription: "MRI Brain without contrast",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Headache",
        keyFindings: ["Normal study"],
        recommendation: "",
        source_quote: "MRI brain performed 6/10/2024",
      },
    ],
  },
  appropriateness: {
    alerts: [
      {
        ruleId: "REPEAT_CT_AP",
        title: "Repeat CT Abdomen/Pelvis",
        severity: "HIGH",
        rating: "USUALLY_NOT_APPROPRIATE",
        description: "CT Abdomen/Pelvis was performed 30 days ago.",
        recommendation: "Consider using prior study results.",
        citation: "ACR Appropriateness Criteria, 2024",
        citationUrl: "https://acsearch.acr.org/docs/69483/Narrative/",
      },
      {
        ruleId: "CONTRAST_ALLERGY",
        title: "Contrast Allergy Screening",
        severity: "MEDIUM",
        rating: "MAY_BE_APPROPRIATE",
        description: "Patient has no documented contrast allergy.",
        recommendation: "Proceed with standard protocol.",
        citation: "ACR Manual on Contrast Media, 2024",
        citationUrl: "https://www.acr.org/Clinical-Resources/Contrast-Manual",
      },
    ],
    overallVerdict: "USUALLY_NOT_APPROPRIATE",
    summary: "Repeat scan detected within 90-day window.",
    priorScanSummary: "1 prior CT A/P, 1 prior MRI Brain",
  },
};

// ─── Store Setter ──────────────────────────────────────────────

type PartialStoreState = {
  selectedPatientId?: string;
  patient?: PatientProfile;
  order?: ImagingOrder;
  analysisStatus?: AnalysisStatus;
  analysisResult?: CompleteAnalysisResult | null;
  error?: AppError | null;
  activeView?: ViewState;
  apiKey?: string;
  chatHistory?: ChatMessage[];
  isCopilotLoading?: boolean;
  copilotError?: AppError | null;
};

/**
 * Sets Zustand store state for testing.
 * Call before render() to inject test data.
 */
export const setStoreState = (state: PartialStoreState) => {
  useAppStore.setState(state);
};

/**
 * Resets the store to default state with the mock patient.
 */
export const resetStore = () => {
  useAppStore.setState({
    selectedPatientId: mockPatient.id,
    patient: mockPatient,
    order: mockOrder,
    analysisStatus: "IDLE",
    analysisResult: null,
    activeView: "SOURCE_EVIDENCE",
    apiKey: "",
    chatHistory: [],
    isCopilotLoading: false,
    copilotError: null,
    error: null,
    isFromFhir: false,
    showFhirModal: false,
    auditLog: [],
  });
};

// ─── Custom Render ─────────────────────────────────────────────

/**
 * Wraps React Testing Library's render with a user-event instance.
 * No providers needed since Zustand is vanilla (no React context).
 */
export const renderWithStore = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  };
};

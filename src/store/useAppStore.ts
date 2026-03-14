/**
 * RadView — Global Application State (Zustand)
 *
 * Key design decision: all demo patients are pre-analyzed at store
 * initialization. Since the rules engine is deterministic and extraction
 * data is precomputed, this costs ~1ms per patient and means:
 *   - First load shows verdict immediately (no "Run Analysis" click)
 *   - Switching demo patients is instant
 *   - The audit trail populates from the start
 */

import { create } from "zustand";
import type {
  ViewState,
  AnalysisStatus,
  PatientProfile,
  ImagingOrder,
  ImagingEvent,
  CompleteAnalysisResult,
  ChatMessage,
} from "../types";
import { AppError, ErrorCategory, ImagingModality, ContrastType } from "../types";
import { ALL_PATIENTS, ALL_ORDERS } from "../data/patients";
import { PRECOMPUTED_DATA } from "../data/precomputed";
import { analyzeImagingOrder } from "../services/geminiService";
import { evaluateAppropriateness, RULES_DATABASE } from "../services/rulesEngine";
import { getRAGService, clearRAGCache } from "../services/ragService";
import { recordEvaluation, getAuditLog } from "../services/auditService";
import type { AuditEntry } from "../services/auditService";
import type { FhirPatientSummary } from "../services/fhirService";

/** Maximum number of chat messages retained in memory */
const MAX_CHAT_HISTORY = 100;

/** Trim chat history to the last MAX_CHAT_HISTORY messages */
function trimChatHistory(history: ChatMessage[]): ChatMessage[] {
  return history.length > MAX_CHAT_HISTORY
    ? history.slice(history.length - MAX_CHAT_HISTORY)
    : history;
}

// ═══════════════════════════════════════════════════════════════
// PRE-COMPUTE ALL DEMO RESULTS AT STARTUP
// ═══════════════════════════════════════════════════════════════

/**
 * Eagerly runs the deterministic rules engine on all demo patients
 * at module load time. This is cheap (~1ms per patient) because
 * extraction data is precomputed and the rules engine is pure logic.
 */
function precomputeAllDemoResults(): Map<string, CompleteAnalysisResult> {
  const cache = new Map<string, CompleteAnalysisResult>();

  for (const patient of ALL_PATIENTS) {
    const precomputed = PRECOMPUTED_DATA[patient.id];
    if (!precomputed) continue;

    const order = ALL_ORDERS[patient.id];
    const startTime = performance.now();
    const appropriateness = evaluateAppropriateness(
      patient,
      order,
      precomputed.events
    );
    const durationMs = Math.round(performance.now() - startTime);

    const result: CompleteAnalysisResult = {
      extraction: precomputed,
      appropriateness,
    };

    cache.set(patient.id, result);

    // Record in audit trail so it's populated from the start
    recordEvaluation(
      patient,
      order,
      appropriateness,
      RULES_DATABASE.length,
      durationMs,
      "demo"
    );
  }

  return cache;
}

const demoResultsCache = precomputeAllDemoResults();

// ═══════════════════════════════════════════════════════════════
// FHIR CONNECTION STATE
// ═══════════════════════════════════════════════════════════════

export type FhirConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface FhirState {
  fhirServerUrl: string;
  fhirConnectionStatus: FhirConnectionStatus;
  fhirServerName: string;
  fhirPatients: FhirPatientSummary[];
  fhirSearchQuery: string;
  fhirError: string | null;
  /** True if the currently loaded patient came from FHIR */
  isFromFhir: boolean;
  /** FHIR-loaded prior events (not precomputed) */
  fhirPriorEvents: ImagingEvent[];
  /** Show/hide the FHIR import modal */
  showFhirModal: boolean;
}

// ═══════════════════════════════════════════════════════════════
// FULL STATE INTERFACE
// ═══════════════════════════════════════════════════════════════

interface AppState extends FhirState {
  // ─── Patient & Order ──────────────────────────────
  selectedPatientId: string;
  patient: PatientProfile;
  order: ImagingOrder;

  // ─── Analysis ─────────────────────────────────────
  analysisStatus: AnalysisStatus;
  analysisResult: CompleteAnalysisResult | null;
  error: AppError | null;

  // ─── UI ───────────────────────────────────────────
  activeView: ViewState;
  apiKey: string;

  // ─── Copilot ──────────────────────────────────────
  chatHistory: ChatMessage[];
  isCopilotLoading: boolean;
  copilotError: AppError | null;

  // ─── Audit ────────────────────────────────────────
  auditLog: readonly AuditEntry[];

  // ─── Actions ──────────────────────────────────────
  selectPatient: (patientId: string) => void;
  setActiveView: (view: ViewState) => void;
  setApiKey: (key: string) => void;
  runAnalysis: () => Promise<void>;
  addChatMessage: (message: ChatMessage) => void;
  sendChatMessage: (userMessage: string) => Promise<void>;
  clearChat: () => void;

  // ─── FHIR Actions ─────────────────────────────────
  setFhirServerUrl: (url: string) => void;
  connectToFhir: () => Promise<void>;
  searchFhirPatients: (query: string) => Promise<void>;
  loadFhirPatient: (patientId: string) => Promise<void>;
  disconnectFhir: () => void;
  setShowFhirModal: (show: boolean) => void;

  // ─── Audit Actions ────────────────────────────────
  refreshAuditLog: () => void;
}

const defaultPatient = ALL_PATIENTS[0];
const defaultOrder = ALL_ORDERS[defaultPatient.id];
const defaultResult = demoResultsCache.get(defaultPatient.id) ?? null;

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Initial State (pre-analyzed) ─────────────────
  selectedPatientId: defaultPatient.id,
  patient: defaultPatient,
  order: defaultOrder,
  analysisStatus: defaultResult ? "COMPLETE" : "IDLE",
  analysisResult: defaultResult,
  error: null,
  activeView: "APPROPRIATENESS_ANALYSIS", // Show verdict on first load
  apiKey: "",
  chatHistory: [],
  isCopilotLoading: false,
  copilotError: null,
  auditLog: getAuditLog(), // Already populated by precompute

  // ─── FHIR Initial State ───────────────────────────
  fhirServerUrl: "https://hapi.fhir.org/baseR4",
  fhirConnectionStatus: "disconnected",
  fhirServerName: "",
  fhirPatients: [],
  fhirSearchQuery: "",
  fhirError: null,
  isFromFhir: false,
  fhirPriorEvents: [],
  showFhirModal: false,

  // ─── Actions ──────────────────────────────────────

  selectPatient: (patientId: string) => {
    const patient = ALL_PATIENTS.find((p) => p.id === patientId);
    if (!patient) return;
    const order = ALL_ORDERS[patientId];
    clearRAGCache();

    // Check if we have a pre-computed result for this demo patient
    const cachedResult = demoResultsCache.get(patientId) ?? null;

    set({
      selectedPatientId: patientId,
      patient,
      order,
      analysisStatus: cachedResult ? "COMPLETE" : "IDLE",
      analysisResult: cachedResult,
      error: null,
      activeView: cachedResult ? "APPROPRIATENESS_ANALYSIS" : "SOURCE_EVIDENCE",
      chatHistory: [],
      copilotError: null,
      isFromFhir: false,
      fhirPriorEvents: [],
    });
  },

  setActiveView: (view: ViewState) => set({ activeView: view }),

  setApiKey: (key: string) => set({ apiKey: key }),

  runAnalysis: async () => {
    const { patient, order, apiKey, isFromFhir, fhirPriorEvents } = get();
    set({ analysisStatus: "EXTRACTING", error: null });

    const startTime = performance.now();

    try {
      const result = await analyzeImagingOrder(
        patient,
        order,
        apiKey,
        (status) => {
          set({ analysisStatus: status as AnalysisStatus });
        },
        isFromFhir ? fhirPriorEvents : undefined
      );

      const durationMs = Math.round(performance.now() - startTime);

      // Record in audit trail
      recordEvaluation(
        patient,
        order,
        result.appropriateness,
        RULES_DATABASE.length,
        durationMs,
        isFromFhir ? "fhir" : "demo"
      );

      set({
        analysisStatus: "COMPLETE",
        analysisResult: result,
        auditLog: getAuditLog(),
      });
    } catch (err) {
      const appError =
        err instanceof AppError
          ? err
          : new AppError(ErrorCategory.UNKNOWN, "Analysis failed", err);
      set({ analysisStatus: "ERROR", error: appError });
    }
  },

  addChatMessage: (message: ChatMessage) =>
    set((state) => ({ chatHistory: trimChatHistory([...state.chatHistory, message]) })),

  sendChatMessage: async (userMessage: string) => {
    const { patient, apiKey, chatHistory } = get();

    const userMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };
    set((state) => ({
      chatHistory: trimChatHistory([...state.chatHistory, userMsg]),
      isCopilotLoading: true,
      copilotError: null,
    }));

    try {
      const ragService = getRAGService(patient, apiKey);
      const { response, context } = await ragService.query(
        userMessage,
        chatHistory
      );

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: Date.now(),
        context,
      };

      set((state) => ({
        chatHistory: trimChatHistory([...state.chatHistory, assistantMsg]),
        isCopilotLoading: false,
      }));
    } catch (err) {
      const appError =
        err instanceof AppError
          ? err
          : new AppError(ErrorCategory.UNKNOWN, "Copilot query failed", err);

      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${appError.message}`,
        timestamp: Date.now(),
        isError: true,
      };

      set((state) => ({
        chatHistory: trimChatHistory([...state.chatHistory, errorMsg]),
        isCopilotLoading: false,
        copilotError: appError,
      }));
    }
  },

  clearChat: () => set({ chatHistory: [], copilotError: null }),

  // ─── FHIR Actions ─────────────────────────────────

  setFhirServerUrl: (url: string) => set({ fhirServerUrl: url }),

  setShowFhirModal: (show: boolean) => set({ showFhirModal: show }),

  connectToFhir: async () => {
    const { fhirServerUrl } = get();
    set({ fhirConnectionStatus: "connecting", fhirError: null });

    try {
      const { validateFhirServer } = await import("../services/fhirService");
      const capability = await validateFhirServer(fhirServerUrl);

      if (!capability.supportsPatient) {
        throw new AppError(
          ErrorCategory.VALIDATION,
          "Server does not support Patient resource"
        );
      }

      set({
        fhirConnectionStatus: "connected",
        fhirServerName: capability.serverName,
        fhirError: null,
      });

      // Auto-search for patients after connection
      get().searchFhirPatients("");
    } catch (err) {
      set({
        fhirConnectionStatus: "error",
        fhirError:
          err instanceof AppError
            ? err.message
            : `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  },

  searchFhirPatients: async (query: string) => {
    const { fhirServerUrl, fhirConnectionStatus } = get();
    if (fhirConnectionStatus !== "connected") return;

    set({ fhirSearchQuery: query });

    try {
      const { searchPatients } = await import("../services/fhirService");
      const patients = await searchPatients(fhirServerUrl, query || undefined);
      set({ fhirPatients: patients });
    } catch (err) {
      set({
        fhirError: `Patient search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  },

  loadFhirPatient: async (patientId: string) => {
    const { fhirServerUrl } = get();
    set({ analysisStatus: "EXTRACTING", error: null, showFhirModal: false });

    try {
      const { loadFhirPatient: loadPatient } = await import(
        "../services/fhirService"
      );
      const data = await loadPatient(fhirServerUrl, patientId);

      clearRAGCache();

      // Use the first pending order, or create a typed placeholder
      const order: ImagingOrder = data.pendingOrders[0] ?? {
        modality: ImagingModality.CT,
        bodyRegion: "Unspecified",
        studyDescription: "No active orders found",
        contrast: ContrastType.UNKNOWN,
        clinicalIndication: "Loaded from FHIR server",
        orderingPhysician: "Unknown",
        urgency: "ROUTINE" as const,
        patientId: data.patient.id,
      };

      set({
        selectedPatientId: data.patient.id,
        patient: data.patient,
        order,
        analysisStatus: "IDLE",
        analysisResult: null,
        error: null,
        activeView: "SOURCE_EVIDENCE",
        chatHistory: [],
        copilotError: null,
        isFromFhir: true,
        fhirPriorEvents: data.priorEvents,
      });
    } catch (err) {
      const appError =
        err instanceof AppError
          ? err
          : new AppError(ErrorCategory.UNKNOWN, "Failed to load FHIR patient", err);
      set({ analysisStatus: "ERROR", error: appError });
    }
  },

  disconnectFhir: () =>
    set({
      fhirConnectionStatus: "disconnected",
      fhirServerName: "",
      fhirPatients: [],
      fhirSearchQuery: "",
      fhirError: null,
    }),

  // ─── Audit Actions ────────────────────────────────

  refreshAuditLog: () => set({ auditLog: getAuditLog() }),
}));

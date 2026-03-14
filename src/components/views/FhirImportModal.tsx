/**
 * RadView — FHIR Import Modal
 *
 * Modal overlay for connecting to FHIR R4 servers and loading patients.
 * Demonstrates real clinical infrastructure integration.
 *
 * Flow:
 *   1. User enters a FHIR server URL (or picks a preset)
 *   2. Click "Connect" → validates CapabilityStatement
 *   3. Server responds with patient list
 *   4. User searches/selects a patient → loads full clinical data
 */

import { useState, useCallback } from "react";
import {
  X,
  Server,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plug,
  User,
  Unplug,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { FHIR_SANDBOX_SERVERS } from "../../services/fhirService";

export const FhirImportModal = () => {
  const showFhirModal = useAppStore((s) => s.showFhirModal);
  const setShowFhirModal = useAppStore((s) => s.setShowFhirModal);
  const fhirServerUrl = useAppStore((s) => s.fhirServerUrl);
  const setFhirServerUrl = useAppStore((s) => s.setFhirServerUrl);
  const fhirConnectionStatus = useAppStore((s) => s.fhirConnectionStatus);
  const fhirServerName = useAppStore((s) => s.fhirServerName);
  const fhirPatients = useAppStore((s) => s.fhirPatients);
  const fhirError = useAppStore((s) => s.fhirError);
  const connectToFhir = useAppStore((s) => s.connectToFhir);
  const searchFhirPatients = useAppStore((s) => s.searchFhirPatients);
  const loadFhirPatient = useAppStore((s) => s.loadFhirPatient);
  const disconnectFhir = useAppStore((s) => s.disconnectFhir);

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    searchFhirPatients(searchQuery);
  }, [searchQuery, searchFhirPatients]);

  const handleLoadPatient = useCallback(
    async (patientId: string) => {
      setLoadingPatientId(patientId);
      await loadFhirPatient(patientId);
      setLoadingPatientId(null);
    },
    [loadFhirPatient]
  );

  if (!showFhirModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowFhirModal(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                FHIR R4 Data Import
              </h2>
              <p className="text-xs text-gray-500">
                Connect to a FHIR server to load real patient data
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFhirModal(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Server connection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FHIR Server Endpoint
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={fhirServerUrl}
                onChange={(e) => setFhirServerUrl(e.target.value)}
                placeholder="https://hapi.fhir.org/baseR4"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={fhirConnectionStatus === "connecting"}
              />
              {fhirConnectionStatus === "connected" ? (
                <button
                  onClick={disconnectFhir}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  <Unplug className="w-4 h-4" />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectToFhir}
                  disabled={
                    fhirConnectionStatus === "connecting" || !fhirServerUrl.trim()
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fhirConnectionStatus === "connecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plug className="w-4 h-4" />
                  )}
                  Connect
                </button>
              )}
            </div>

            {/* Preset servers */}
            <div className="mt-2 flex flex-wrap gap-2">
              {FHIR_SANDBOX_SERVERS.map((server) => (
                <button
                  key={server.url + server.name}
                  onClick={() => setFhirServerUrl(server.url)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>

          {/* Connection status */}
          {fhirConnectionStatus === "connected" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Connected to {fhirServerName || "FHIR server"}
            </div>
          )}

          {fhirError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{fhirError}</span>
            </div>
          )}

          {/* Patient search (only when connected) */}
          {fhirConnectionStatus === "connected" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Patients
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search by patient name..."
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Patient list */}
              {fhirPatients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    {fhirPatients.length} patient{fhirPatients.length !== 1 ? "s" : ""} found
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg">
                    {fhirPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleLoadPatient(p.id)}
                        disabled={loadingPatientId !== null}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {loadingPatientId === p.id ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.gender} &middot; DOB: {p.birthDate}
                            {p.identifier && (
                              <span> &middot; ID: {p.identifier}</span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {fhirPatients.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  No patients found. Try a different search query.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          FHIR R4 compliant. Sandbox data only — no real PHI is transmitted.
        </div>
      </div>
    </div>
  );
};

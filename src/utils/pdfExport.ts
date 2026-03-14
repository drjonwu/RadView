/**
 * RadView — PDF Export Service
 *
 * Generates a polished, clinical-grade PDF report from an
 * appropriateness assessment result. Uses jsPDF for browser-side
 * PDF generation with no server round-trip.
 *
 * Layout mirrors the text report structure but adds:
 *   - Color-coded verdict banner (green/amber/red)
 *   - Severity-colored alert sections
 *   - Structured table for alert overview
 *   - Clinical safety context section
 *   - Footer with page numbers and disclaimer
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  AppropriatenessResult,
  AppropriatenessAlert,
  AppropriatenessRating,
  ImagingOrder,
  PatientProfile,
} from "../types";
import { formatDate } from "./constants";
import { sanitizeFilename } from "./sanitize";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Page margins in mm */
const MARGIN = {
  top: 20,
  bottom: 25,
  left: 20,
  right: 20,
} as const;

/** Color palette (RGB tuples) */
const COLORS = {
  primary: [30, 64, 175] as const,       // blue-800
  darkText: [17, 24, 39] as const,       // gray-900
  bodyText: [55, 65, 81] as const,       // gray-700
  lightText: [107, 114, 128] as const,   // gray-500
  divider: [209, 213, 219] as const,     // gray-300
  white: [255, 255, 255] as const,

  // Verdict banner backgrounds
  greenBg: [220, 252, 231] as const,     // green-100
  greenText: [22, 101, 52] as const,     // green-800
  greenBorder: [34, 197, 94] as const,   // green-500

  amberBg: [254, 243, 199] as const,     // amber-100
  amberText: [146, 64, 14] as const,     // amber-800
  amberBorder: [245, 158, 11] as const,  // amber-500

  redBg: [254, 226, 226] as const,       // red-100
  redText: [153, 27, 27] as const,       // red-800
  redBorder: [239, 68, 68] as const,     // red-500

  // Severity badge backgrounds
  highBg: [254, 226, 226] as const,
  mediumBg: [254, 243, 199] as const,
  lowBg: [243, 244, 246] as const,       // gray-100
} as const;

/** Verdict display config */
const VERDICT_CONFIG: Record<
  AppropriatenessRating,
  { label: string; bg: readonly [number, number, number]; text: readonly [number, number, number]; border: readonly [number, number, number] }
> = {
  USUALLY_APPROPRIATE: {
    label: "Usually Appropriate",
    bg: COLORS.greenBg,
    text: COLORS.greenText,
    border: COLORS.greenBorder,
  },
  MAY_BE_APPROPRIATE: {
    label: "May Be Appropriate",
    bg: COLORS.amberBg,
    text: COLORS.amberText,
    border: COLORS.amberBorder,
  },
  USUALLY_NOT_APPROPRIATE: {
    label: "Usually Not Appropriate",
    bg: COLORS.redBg,
    text: COLORS.redText,
    border: COLORS.redBorder,
  },
};

/** Severity badge config */
const SEVERITY_CONFIG: Record<string, { bg: readonly [number, number, number]; text: readonly [number, number, number] }> = {
  HIGH: { bg: COLORS.highBg, text: COLORS.redText },
  MEDIUM: { bg: COLORS.mediumBg, text: COLORS.amberText },
  LOW: { bg: COLORS.lowBg, text: COLORS.bodyText },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

type RGB = readonly [number, number, number];

/** Sets fill color from an RGB tuple */
function setFill(doc: jsPDF, color: RGB): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

/** Sets draw color from an RGB tuple */
function setDraw(doc: jsPDF, color: RGB): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

/** Sets text color from an RGB tuple */
function setTextColor(doc: jsPDF, color: RGB): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Returns the usable page width (total minus margins) */
function contentWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth() - MARGIN.left - MARGIN.right;
}

/**
 * Checks if adding `neededMm` would exceed the page.
 * If so, adds a new page and returns the reset Y position.
 */
function ensureSpace(doc: jsPDF, y: number, neededMm: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededMm > pageHeight - MARGIN.bottom) {
    doc.addPage();
    return MARGIN.top;
  }
  return y;
}

/**
 * Draws a horizontal divider line.
 */
function drawDivider(doc: jsPDF, y: number): number {
  setDraw(doc, COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(MARGIN.left, y, MARGIN.left + contentWidth(doc), y);
  return y + 4;
}

// ═══════════════════════════════════════════════════════════════
// SECTION RENDERERS
// ═══════════════════════════════════════════════════════════════

/**
 * Renders the report header with RadView branding.
 */
function renderHeader(doc: jsPDF): number {
  let y: number = MARGIN.top;

  // Title bar background
  setFill(doc, COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 16, "F");

  // Title text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTextColor(doc, COLORS.white);
  doc.text("RadView", MARGIN.left, 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Appropriateness Assessment Report", MARGIN.left + 32, 10.5);

  // Date on the right
  const dateStr = formatDate(new Date().toISOString().split("T")[0]);
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(
    dateStr,
    doc.internal.pageSize.getWidth() - MARGIN.right - dateWidth,
    10.5
  );

  y = 24;
  return y;
}

/**
 * Renders patient demographics and order details.
 */
function renderPatientInfo(
  doc: jsPDF,
  patient: PatientProfile,
  order: ImagingOrder,
  y: number
): number {
  const w = contentWidth(doc);
  const halfW = w / 2 - 2;

  // Patient info box
  setFill(doc, [249, 250, 251] as RGB); // gray-50
  doc.roundedRect(MARGIN.left, y, halfW, 36, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.lightText);
  doc.text("PATIENT", MARGIN.left + 4, y + 6);

  doc.setFontSize(11);
  setTextColor(doc, COLORS.darkText);
  doc.text(patient.name, MARGIN.left + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.bodyText);
  doc.text(`MRN: ${patient.mrn}`, MARGIN.left + 4, y + 19);
  doc.text(`DOB: ${formatDate(patient.dob)} (${patient.age}${patient.gender?.[0] ?? ""})`, MARGIN.left + 4, y + 24);

  const conditionsText = patient.conditions.length > 0
    ? patient.conditions.join(", ")
    : "No documented conditions";
  const wrappedConditions = doc.splitTextToSize(conditionsText, halfW - 8);
  doc.text(wrappedConditions.slice(0, 2), MARGIN.left + 4, y + 30);

  // Order info box
  const orderX = MARGIN.left + halfW + 4;
  setFill(doc, [249, 250, 251] as RGB);
  doc.roundedRect(orderX, y, halfW, 36, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.lightText);
  doc.text("ORDER UNDER REVIEW", orderX + 4, y + 6);

  doc.setFontSize(10);
  setTextColor(doc, COLORS.darkText);
  const studyLines = doc.splitTextToSize(order.studyDescription, halfW - 8);
  doc.text(studyLines.slice(0, 2), orderX + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.bodyText);

  const indicationLines = doc.splitTextToSize(
    `Indication: ${order.clinicalIndication}`,
    halfW - 8
  );
  doc.text(indicationLines.slice(0, 2), orderX + 4, y + 21);

  doc.text(
    `Physician: ${order.orderingPhysician} | Urgency: ${order.urgency} | Contrast: ${order.contrast.replace(/_/g, " ")}`,
    orderX + 4,
    y + 30
  );

  return y + 42;
}

/**
 * Renders clinical safety context (renal function, allergies, pregnancy).
 */
function renderClinicalContext(
  doc: jsPDF,
  patient: PatientProfile,
  y: number
): number {
  y = ensureSpace(doc, y, 20);

  const items: string[] = [];

  if (patient.renalFunction) {
    const eGFR = patient.renalFunction.eGFR;
    const label =
      eGFR < 30 ? " (Severe impairment)" :
      eGFR < 60 ? " (Moderate impairment)" : "";
    items.push(`Renal: eGFR ${eGFR} mL/min, Cr ${patient.renalFunction.creatinine} mg/dL${label}`);
  }

  if (patient.allergies.length > 0) {
    items.push(`Allergies: ${patient.allergies.join(", ")}`);
  } else {
    items.push("No known drug allergies (NKDA)");
  }

  if (patient.pregnancyStatus && patient.pregnancyStatus !== "UNKNOWN") {
    items.push(`Pregnancy: ${patient.pregnancyStatus.replace(/_/g, " ")}`);
  }

  if (items.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, COLORS.lightText);
    doc.text("CLINICAL SAFETY CONTEXT", MARGIN.left, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLORS.bodyText);
    for (const item of items) {
      doc.text(`\u2022  ${item}`, MARGIN.left + 2, y);
      y += 4;
    }
  }

  return y + 2;
}

/**
 * Renders the color-coded verdict banner.
 */
function renderVerdictBanner(
  doc: jsPDF,
  result: AppropriatenessResult,
  y: number
): number {
  y = ensureSpace(doc, y, 28);

  const config = VERDICT_CONFIG[result.overallVerdict];
  const w = contentWidth(doc);

  // Banner background
  setFill(doc, config.bg);
  setDraw(doc, config.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN.left, y, w, 22, 2, 2, "FD");

  // Verdict label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setTextColor(doc, config.text);
  const labelWidth = doc.getTextWidth(config.label);
  doc.text(config.label, MARGIN.left + (w - labelWidth) / 2, y + 9);

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const summaryText = `${result.alerts.length} alert${result.alerts.length !== 1 ? "s" : ""} identified \u2022 ${result.summary}`;
  const summaryLines = doc.splitTextToSize(summaryText, w - 16);
  doc.text(summaryLines.slice(0, 2), MARGIN.left + 8, y + 15);

  return y + 28;
}

/**
 * Renders the alerts summary table using jspdf-autotable.
 */
function renderAlertsTable(
  doc: jsPDF,
  alerts: AppropriatenessAlert[],
  y: number
): number {
  if (alerts.length === 0) return y;

  y = ensureSpace(doc, y, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, COLORS.darkText);
  doc.text("Alerts Summary", MARGIN.left, y);
  y += 4;

  const tableData = alerts.map((alert) => [
    alert.severity,
    alert.title,
    alert.rating.replace(/_/g, " "),
    alert.citation,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Severity", "Rule", "Rating", "Citation"]],
    body: tableData,
    margin: { left: MARGIN.left, right: MARGIN.right },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [55, 65, 81],
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      3: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      // Color-code severity column
      if (data.section === "body" && data.column.index === 0) {
        const severity = String(data.cell.raw);
        const cfg = SEVERITY_CONFIG[severity];
        if (cfg) {
          data.cell.styles.fillColor = [...cfg.bg] as [number, number, number];
          data.cell.styles.textColor = [...cfg.text] as [number, number, number];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // jspdf-autotable adds `lastAutoTable` to the doc instance at runtime.
  // There are no bundled type declarations for this property, so we use
  // a runtime property check instead of an unsafe `as any` cast.
  const docRecord = doc as unknown as Record<string, unknown>;
  const lastTable = docRecord.lastAutoTable as Record<string, unknown> | undefined;
  return typeof lastTable?.finalY === "number" ? lastTable.finalY : y + 30;
}

/**
 * Renders detailed alert cards — one per alert.
 */
function renderAlertDetails(
  doc: jsPDF,
  alerts: AppropriatenessAlert[],
  y: number
): number {
  if (alerts.length === 0) return y;

  y = ensureSpace(doc, y, 12);
  y = drawDivider(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, COLORS.darkText);
  doc.text("Alert Details", MARGIN.left, y);
  y += 6;

  for (const alert of alerts) {
    y = ensureSpace(doc, y, 30);

    const w = contentWidth(doc);

    // Alert card background
    const severityCfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW;
    setFill(doc, severityCfg.bg);
    doc.roundedRect(MARGIN.left, y, w, 2, 1, 1, "F");
    y += 4;

    // Title + severity badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextColor(doc, COLORS.darkText);
    doc.text(alert.title, MARGIN.left + 2, y);

    // Severity badge
    const badgeText = alert.severity;
    const badgeWidth = doc.getTextWidth(badgeText) + 6;
    const badgeX = MARGIN.left + w - badgeWidth - 2;
    setFill(doc, severityCfg.bg);
    doc.roundedRect(badgeX, y - 3, badgeWidth, 5, 1, 1, "F");
    doc.setFontSize(7);
    setTextColor(doc, severityCfg.text);
    doc.text(badgeText, badgeX + 3, y);
    y += 5;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLORS.bodyText);
    const descLines = doc.splitTextToSize(alert.description, w - 4);
    for (const line of descLines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN.left + 2, y);
      y += 3.5;
    }
    y += 1;

    // Recommendation
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, COLORS.darkText);
    doc.text("Recommendation:", MARGIN.left + 2, y);
    y += 3.5;

    doc.setFont("helvetica", "normal");
    setTextColor(doc, COLORS.bodyText);
    const recLines = doc.splitTextToSize(alert.recommendation, w - 4);
    for (const line of recLines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN.left + 2, y);
      y += 3.5;
    }
    y += 1;

    // Citation
    doc.setFontSize(7);
    setTextColor(doc, COLORS.lightText);
    doc.text(`Citation: ${alert.citation}`, MARGIN.left + 2, y);
    y += 3.5;

    if (alert.citationUrl) {
      setTextColor(doc, COLORS.primary);
      doc.textWithLink(alert.citationUrl, MARGIN.left + 2, y, {
        url: alert.citationUrl,
      });
      y += 3.5;
    }

    // Alternative studies
    if (alert.alternativeStudies && alert.alternativeStudies.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      setTextColor(doc, COLORS.lightText);
      doc.text(
        `Alternatives: ${alert.alternativeStudies.join(", ")}`,
        MARGIN.left + 2,
        y
      );
      y += 3.5;
    }

    y += 3;
  }

  return y;
}

/**
 * Renders prior scan summary section.
 */
function renderPriorScanSummary(
  doc: jsPDF,
  result: AppropriatenessResult,
  y: number
): number {
  if (!result.priorScanSummary) return y;

  y = ensureSpace(doc, y, 14);
  y = drawDivider(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.lightText);
  doc.text("PRIOR IMAGING SUMMARY", MARGIN.left, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextColor(doc, COLORS.bodyText);
  const lines = doc.splitTextToSize(result.priorScanSummary, contentWidth(doc));
  doc.text(lines, MARGIN.left, y);
  y += lines.length * 3.5 + 2;

  return y;
}

/**
 * Adds page footers with page numbers and disclaimer.
 */
function addFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Divider above footer
    setDraw(doc, COLORS.divider);
    doc.setLineWidth(0.2);
    doc.line(MARGIN.left, pageHeight - 15, pageWidth - MARGIN.right, pageHeight - 15);

    // Disclaimer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    setTextColor(doc, COLORS.lightText);
    doc.text(
      "This report was generated by RadView for decision-support purposes only. It does not constitute medical advice. Clinical judgment should always prevail.",
      MARGIN.left,
      pageHeight - 11
    );

    // Page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const pageText = `Page ${i} of ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - MARGIN.right - pageTextWidth, pageHeight - 7);

    // RadView branding
    doc.text("RadView v0.1.0", MARGIN.left, pageHeight - 7);
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Generates and triggers download of a PDF appropriateness report.
 *
 * @param result - The appropriateness analysis result
 * @param order - The current imaging order
 * @param patient - The patient profile
 */
export function exportAppropriatenessPDF(
  result: AppropriatenessResult,
  order: ImagingOrder,
  patient: PatientProfile
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  // ── Assemble the report ──
  let y = renderHeader(doc);
  y = renderPatientInfo(doc, patient, order, y);
  y = renderClinicalContext(doc, patient, y);
  y = renderVerdictBanner(doc, result, y);
  y = renderAlertsTable(doc, result.alerts, y);
  y = renderAlertDetails(doc, result.alerts, y);
  renderPriorScanSummary(doc, result, y);

  // ── Footer on every page ──
  addFooters(doc);

  // ── Download ──
  const filename = `radview-report-${sanitizeFilename(patient.name)}.pdf`;
  doc.save(filename);
}

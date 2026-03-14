/**
 * RadView — Precomputed Extraction Data
 *
 * Pre-extracted ImagingEvent[] arrays for each demo patient.
 * These bypass the LLM extraction step for instant, consistent demos.
 *
 * The deterministic rules engine still runs LIVE on this data —
 * so the appropriateness alerts are genuinely computed, not hardcoded.
 */

import type { ExtractionResult } from "../types";
import { ImagingModality, ImagingStatus, ContrastType } from "../types";

export const PRECOMPUTED_DATA: Record<string, ExtractionResult> = {

  // ═══════════════════════════════════════════════════════════════
  // PATIENT 1: MRS. LI-MEI ZHANG
  // 5 prior imaging studies + current order under review
  // ═══════════════════════════════════════════════════════════════

  "patient_zhang": {
    patientId: "patient_zhang",
    events: [
      {
        id: "img_zhang_0",
        date: "2024-09-20",
        modality: ImagingModality.XRAY,
        bodyRegion: "Abdomen",
        studyDescription: "X-Ray KUB (Kidneys, Ureters, Bladder)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "CKD monitoring, flank discomfort. Rule out renal calculi.",
        keyFindings: [
          "No radio-opaque calculi along the expected course of the ureters or within the bladder",
          "Both renal outlines appear normal",
          "Moderate aortic calcification",
          "Degenerative lumbar spondylosis"
        ],
        recommendation: "Correlate aortic calcification with vascular risk profile.",
        orderingPhysician: "Dr. Alan Foster",
        facility: "Riverside General Hospital",
        source_quote: "No radio-opaque calculi identified along the expected course of the ureters or within the bladder. Both renal outlines appear normal. Degenerative changes of the lumbar spine. Moderate aortic calcification.",
        quote_start: 6810,
        quote_end: 7020
      },
      {
        id: "img_zhang_1",
        date: "2025-04-02",
        modality: ImagingModality.XRAY,
        bodyRegion: "Knee",
        studyDescription: "X-Ray Both Knees (Standing AP, Lateral, and Skyline Views)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Bilateral knee pain. Assess for osteoarthritis.",
        keyFindings: [
          "Right knee: Kellgren-Lawrence Grade III — medial compartment joint space narrowing with subchondral sclerosis and marginal osteophytes",
          "Left knee: Kellgren-Lawrence Grade II-III — mild-to-moderate medial compartment narrowing",
          "No loose bodies or acute fracture bilaterally"
        ],
        recommendation: "Clinical correlation for surgical planning.",
        orderingPhysician: "Dr. R. Mehta",
        facility: "Riverside General Hospital",
        source_quote: "Right knee: Joint space narrowing of the medial compartment with subchondral sclerosis. Small marginal osteophytes at the medial femoral condyle and tibial plateau. Kellgren-Lawrence Grade III.\n\nLeft knee: Mild-to-moderate medial compartment joint space narrowing with early subchondral sclerosis. Kellgren-Lawrence Grade II-III.",
        quote_start: 6080,
        quote_end: 6420
      },
      {
        id: "img_zhang_2",
        date: "2025-11-12",
        modality: ImagingModality.ULTRASOUND,
        bodyRegion: "Abdomen",
        studyDescription: "Ultrasound Abdomen",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Mildly elevated ALT (42). Evaluate for fatty liver. Known CKD.",
        keyFindings: [
          "Hepatic steatosis (Grade 1 fatty liver)",
          "Incompletely characterized hypoechoic lesion in right hepatic lobe (~2cm) — likely simple cyst but not definitively characterized due to body habitus",
          "Bilateral simple renal cysts (right 1.0cm, left 0.7cm)",
          "Surgically absent gallbladder — no biliary dilatation"
        ],
        recommendation: "Recommend CT abdomen for further characterization of hepatic lesion if clinically indicated.",
        orderingPhysician: "Dr. Alan Foster",
        facility: "Riverside General Hospital",
        source_quote: "Mildly increased parenchymal echogenicity compared to the right renal cortex, consistent with hepatic steatosis (Grade 1 fatty liver). A small hypoechoic lesion was suspected in the right lobe (segment V/VI), approximately 2cm, but was incompletely visualized due to patient body habitus and overlying rib shadow.",
        quote_start: 5350,
        quote_end: 5660
      },
      {
        id: "img_zhang_3",
        date: "2026-01-15",
        modality: ImagingModality.CT,
        bodyRegion: "Abdomen/Pelvis",
        studyDescription: "CT Abdomen and Pelvis with IV Contrast",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.IV_CONTRAST,
        indication: "Abdominal pain, rule out appendicitis",
        keyFindings: [
          "No acute abdominal pathology. Normal appendix — no appendicitis.",
          "3.0cm simple hepatic cyst in segment VI — benign. Corresponds to lesion suspected on prior US.",
          "Hepatic steatosis, consistent with known NAFLD.",
          "Bilateral simple renal cortical cysts with cortical thinning consistent with CKD.",
          "Moderate atherosclerotic calcification of the abdominal aorta and iliac arteries. No aneurysm.",
          "Multilevel lumbar degenerative disc disease (L4-L5, L5-S1) with bilateral facet arthropathy.",
          "Surgically absent gallbladder — no complication."
        ],
        recommendation: "No follow-up needed for hepatic cyst. Correlate lumbar findings clinically if symptomatic.",
        orderingPhysician: "Dr. S. Tan",
        facility: "Riverside General Hospital",
        source_quote: "No acute abdominal pathology. Normal appendix — no appendicitis.\n2. 3.0cm simple hepatic cyst in segment VI — benign. Corresponds to the lesion suspected on prior US. No follow-up needed.\n3. Hepatic steatosis, consistent with known NAFLD.\n4. Bilateral simple renal cortical cysts with cortical thinning consistent with CKD.\n5. Moderate atherosclerotic disease of the aorta and iliac arteries.\n6. Multilevel lumbar degenerative disc disease — correlate clinically if symptomatic.\n7. Surgically absent gallbladder — no complication.",
        quote_start: 3930,
        quote_end: 4470
      },
      {
        id: "img_zhang_4",
        date: "2026-03-02",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest PA and Lateral",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Pre-operative assessment for right total knee replacement",
        keyFindings: [
          "No acute cardiopulmonary process",
          "Normal heart size (CTR 0.48)",
          "Degenerative changes of the thoracic spine"
        ],
        recommendation: "Normal pre-operative chest radiograph.",
        orderingPhysician: "Dr. R. Mehta",
        facility: "Riverside General Hospital",
        source_quote: "No acute cardiopulmonary process.\n2. Normal pre-operative chest radiograph.",
        quote_start: 4830,
        quote_end: 4905
      },
      // ── Pending / Scheduled studies (not yet completed) ──
      {
        id: "img_zhang_5",
        date: "2026-04-15",
        modality: ImagingModality.MRI,
        bodyRegion: "Knee",
        studyDescription: "MRI Right Knee without Contrast — Pre-TKR Planning",
        status: ImagingStatus.ORDERED,
        contrast: ContrastType.NONE,
        indication: "Pre-operative MRI for right total knee replacement. Map articular cartilage loss, meniscal status, and ligament integrity for surgical planning.",
        keyFindings: [],
        recommendation: "",
        orderingPhysician: "Dr. R. Mehta",
        facility: "Riverside General Hospital",
        source_quote: "If fails, will list for right TKR (worse side). Pre-op workup to be done closer to surgery date.",
        quote_start: 2890,
        quote_end: 2970
      },
      {
        id: "img_zhang_6",
        date: "2026-08-28",
        modality: ImagingModality.ULTRASOUND,
        bodyRegion: "Abdomen",
        studyDescription: "Ultrasound Abdomen — CKD Surveillance",
        status: ImagingStatus.PENDING,
        contrast: ContrastType.NONE,
        indication: "6-monthly renal surveillance for CKD Stage 3b. Monitor renal cortical thickness and exclude obstructive uropathy.",
        keyFindings: [],
        recommendation: "",
        orderingPhysician: "Dr. Alan Foster",
        facility: "Riverside General Hospital",
        source_quote: "eGFR 38 mL/min (stable from 41 in Aug 2025)",
        quote_start: 1720,
        quote_end: 1765
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PATIENT 2: MR. RAJESH VIKRAM PATEL
  // 3 prior imaging studies (none of the spine) + current order
  // ═══════════════════════════════════════════════════════════════

  "patient_patel": {
    patientId: "patient_patel",
    events: [
      {
        id: "img_patel_0",
        date: "2023-03-18",
        modality: ImagingModality.XRAY,
        bodyRegion: "Shoulder",
        studyDescription: "X-Ray Right Shoulder (AP, Axillary, and Y-View)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Right shoulder pain after a fall during recreational basketball.",
        keyFindings: [
          "No fracture or dislocation",
          "Glenohumeral joint alignment maintained",
          "Acromioclavicular joint normal"
        ],
        recommendation: "Clinical correlation for soft tissue injury (rotator cuff strain).",
        orderingPhysician: "Dr. Patricia Wong",
        facility: "Greenfield Medical Centre",
        source_quote: "No fracture or dislocation. Glenohumeral joint alignment is maintained. Acromioclavicular joint is normal. No calcific tendinitis.",
        quote_start: 3580,
        quote_end: 3710
      },
      {
        id: "img_patel_1",
        date: "2023-04-03",
        modality: ImagingModality.ULTRASOUND,
        bodyRegion: "Shoulder",
        studyDescription: "Ultrasound Right Shoulder",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Persistent right shoulder pain 2 weeks post-injury. Rule out rotator cuff tear.",
        keyFindings: [
          "Intact rotator cuff — no full- or partial-thickness tear",
          "Mild supraspinatus tendinosis — likely from acute strain",
          "Trace subacromial bursal fluid — likely physiological",
          "Biceps tendon in normal position, normal caliber"
        ],
        recommendation: "Should resolve with conservative management.",
        orderingPhysician: "Dr. Patricia Wong",
        facility: "Greenfield Medical Centre",
        source_quote: "Intact rotator cuff. No tear.\n2. Mild supraspinatus tendinosis — likely from acute strain. Should resolve with conservative management.\n3. Trace subacromial bursal fluid — likely physiological.",
        quote_start: 4210,
        quote_end: 4420
      },
      {
        id: "img_patel_2",
        date: "2024-08-05",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest PA",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Immigration medical examination",
        keyFindings: [
          "Normal chest radiograph",
          "Heart and mediastinum normal (CTR 0.44)",
          "Lungs clear bilaterally"
        ],
        recommendation: "",
        orderingPhysician: "Dr. M. Singh",
        facility: "Greenfield Medical Centre",
        source_quote: "Heart: Normal size and configuration. Cardiothoracic ratio 0.44.\nLungs: Clear bilaterally. No focal consolidation, pleural effusion, or mass.\n\nIMPRESSION:\nNormal chest radiograph.",
        quote_start: 3180,
        quote_end: 3380
      },
      // ── Recommended study from referral ──
      {
        id: "img_patel_3",
        date: "2026-04-21",
        modality: ImagingModality.MRI,
        bodyRegion: "Lumbar Spine",
        studyDescription: "MRI Lumbar Spine without Contrast — If Symptoms Persist",
        status: ImagingStatus.RECOMMENDED,
        contrast: ContrastType.NONE,
        indication: "Follow-up if conservative management (physiotherapy + analgesia) fails to resolve symptoms within 6 weeks. Reassess at 6-week mark.",
        keyFindings: [],
        recommendation: "Only proceed if red flags develop or symptoms persist beyond 6 weeks of conservative management.",
        orderingPhysician: "Dr. Patricia Wong",
        facility: "Greenfield Medical Centre",
        source_quote: "acute mechanical back pain typically resolves with conservative management within 4-6 weeks",
        quote_start: 3040,
        quote_end: 3115
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PATIENT 3: MS. CARMEN LUCIA RIVERA
  // 5 prior imaging studies + 1 recommended future study + current order
  // ═══════════════════════════════════════════════════════════════

  "patient_rivera": {
    patientId: "patient_rivera",
    events: [
      {
        id: "img_rivera_0",
        date: "2024-04-08",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest PA",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "COPD annual review",
        keyFindings: [
          "Hyperinflated lungs",
          "No focal consolidation or effusion",
          "Heart size at upper limit of normal"
        ],
        recommendation: "",
        orderingPhysician: "Dr. Nathan Brooks",
        facility: "Riverside General Hospital",
        source_quote: "Hyperinflated lungs. No focal consolidation or effusion. Heart size at upper limit of normal. Stable from 2023 study.\n\nIMPRESSION:\n1. Stable COPD. No acute findings.",
        quote_start: 8920,
        quote_end: 9090
      },
      {
        id: "img_rivera_1",
        date: "2025-03-15",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest PA",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Annual COPD follow-up. Baseline.",
        keyFindings: [
          "Stable hyperinflated lungs consistent with COPD",
          "No new focal parenchymal abnormality",
          "Heart size stable at upper limit of normal"
        ],
        recommendation: "",
        orderingPhysician: "Dr. Nathan Brooks",
        facility: "Riverside General Hospital",
        source_quote: "Stable hyperinflated lungs consistent with COPD. No new focal parenchymal abnormality. Heart size stable at upper limit of normal. No pleural effusion.",
        quote_start: 8430,
        quote_end: 8580
      },
      {
        id: "img_rivera_2",
        date: "2025-07-10",
        modality: ImagingModality.MAMMOGRAPHY,
        bodyRegion: "Breast",
        studyDescription: "Screening Mammogram (Bilateral Digital 2D + Tomosynthesis)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Routine screening. No symptoms. No family history of breast cancer.",
        keyFindings: [
          "Heterogeneously dense breast tissue (ACR density C)",
          "No suspicious mass, architectural distortion, or grouped microcalcifications bilaterally",
          "Stable 5mm well-circumscribed nodule in left upper outer quadrant — likely fibroadenoma, unchanged from 2023"
        ],
        recommendation: "BI-RADS 2 — Benign. Continue routine screening in 2 years.",
        orderingPhysician: "Dr. S. Varma",
        facility: "Riverside General Hospital",
        source_quote: "BI-RADS 2 — Benign findings bilaterally.\n2. Stable 5mm nodule in the left upper outer quadrant — likely fibroadenoma. No change from 2023.\n3. Continue routine screening in 2 years.",
        quote_start: 8090,
        quote_end: 8290
      },
      {
        id: "img_rivera_3",
        date: "2025-09-18",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest PA and Lateral",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "COPD exacerbation, productive cough x 5 days with yellow sputum. Fever 37.8°C. Rule out pneumonia.",
        keyFindings: [
          "Hyperinflated lungs with flattened hemidiaphragms consistent with COPD",
          "No focal consolidation to suggest pneumonia",
          "No pleural effusion",
          "Heart size at upper limit of normal — stable"
        ],
        recommendation: "",
        orderingPhysician: "Dr. Nathan Brooks",
        facility: "Riverside General Hospital",
        source_quote: "Hyperinflated lungs with flattened hemidiaphragms, consistent with known COPD. No focal consolidation to suggest pneumonia. No pleural effusion.\nHeart size is at the upper limit of normal. Stable compared to prior.",
        quote_start: 7620,
        quote_end: 7850
      },
      {
        id: "img_rivera_4",
        date: "2025-12-05",
        modality: ImagingModality.CT,
        bodyRegion: "Chest",
        studyDescription: "CT Pulmonary Angiography (CT-PA)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.IV_CONTRAST,
        indication: "Acute shortness of breath and left-sided pleuritic chest pain x 6 hours. D-dimer 1.2 mg/L FEU. Wells Score 4.5 (moderate probability). Query pulmonary embolism.",
        keyFindings: [
          "No pulmonary embolism — no filling defect in any pulmonary arteries",
          "Incidental 6mm solid non-calcified nodule in the right middle lobe — smooth margins, no spiculation, no ground glass halo",
          "Centrilobular emphysematous changes in both upper lobes consistent with COPD",
          "No pathologically enlarged mediastinal or hilar lymph nodes",
          "Nodule was NOT visible on September 2025 chest X-ray (expected given small size)"
        ],
        recommendation: "Follow-up CT Chest (low-dose, non-contrast) in 12 months per Fleischner Society 2017 guidelines. High-risk category: solid nodule 6-8mm, single, high-risk patient (30 pack-year smoking history). If stable at 12 months, no further follow-up required.",
        orderingPhysician: "Dr. H. Okonkwo",
        facility: "Riverside General Hospital",
        source_quote: "Incidental 6mm solid, non-calcified nodule is noted in the right middle lobe (series 4, image 187, axial location). The nodule has smooth margins and no surrounding ground glass halo. It is too small for reliable density measurement. No spiculation. No associated lymphadenopathy.",
        quote_start: 6520,
        quote_end: 6800
      },
      {
        id: "img_rivera_5",
        date: "2026-12-05",
        modality: ImagingModality.CT,
        bodyRegion: "Chest",
        studyDescription: "CT Chest Low-Dose Non-Contrast — Fleischner Follow-Up",
        status: ImagingStatus.RECOMMENDED,
        contrast: ContrastType.NONE,
        indication: "12-month follow-up for 6mm solid lung nodule per Fleischner Society 2017 guidelines",
        keyFindings: [],
        recommendation: "Due December 2026 (12 months from December 5, 2025 CT-PA). If stable, no further follow-up required.",
        orderingPhysician: "",
        facility: "",
        source_quote: "recommend follow-up CT Chest (low-dose, non-contrast) in 12 months per Fleischner Society 2017 guidelines",
        quote_start: 7060,
        quote_end: 7165
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PATIENT 4: BABY ETHAN JAMES KOWALSKI
  // 2 prior imaging studies + current order
  // ═══════════════════════════════════════════════════════════════

  "patient_kowalski": {
    patientId: "patient_kowalski",
    events: [
      {
        id: "img_kowalski_0",
        date: "2026-01-05",
        modality: ImagingModality.ULTRASOUND,
        bodyRegion: "Hip",
        studyDescription: "Ultrasound Hips (Bilateral) — Graf Method",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "Routine screening at 6 weeks. Breech presentation at 34 weeks. Father with childhood hip problems.",
        keyFindings: [
          "Right hip: Graf Type Ia (mature, normal). Alpha angle 64°.",
          "Left hip: Graf Type Ia (mature, normal). Alpha angle 62°.",
          "No subluxation or instability with dynamic stress bilaterally."
        ],
        recommendation: "No evidence of developmental dysplasia of the hip. No follow-up imaging required.",
        orderingPhysician: "Dr. M. Thompson",
        facility: "Riverside Children's Hospital",
        source_quote: "Right hip: Alpha angle: 64°. Classification: Graf Type Ia (mature, normal). No subluxation or instability with dynamic stress.\n\nLeft hip: Alpha angle: 62°. Classification: Graf Type Ia (mature, normal). No subluxation or instability with dynamic stress.",
        quote_start: 7450,
        quote_end: 7720
      },
      {
        id: "img_kowalski_1",
        date: "2026-01-20",
        modality: ImagingModality.XRAY,
        bodyRegion: "Chest",
        studyDescription: "X-Ray Chest AP (Supine)",
        status: ImagingStatus.COMPLETED,
        contrast: ContrastType.NONE,
        indication: "6-week-old infant with cough and nasal congestion x 3 days. Afebrile. Rule out pneumonia.",
        keyFindings: [
          "No focal consolidation to suggest pneumonia",
          "Mild perihilar peribronchial thickening — likely viral (bronchiolitis)",
          "Prominent but normal thymic shadow ('sail sign')"
        ],
        recommendation: "Consider bronchiolitis given clinical context.",
        orderingPhysician: "Dr. M. Thompson",
        facility: "Riverside Children's Hospital",
        source_quote: "No focal consolidation to suggest pneumonia.\n2. Mild perihilar peribronchial thickening — likely viral in etiology given the clinical context. Consider bronchiolitis.\n3. Prominent but normal thymic shadow.",
        quote_start: 7050,
        quote_end: 7280
      },
      // ── Recommended alternative from ED plan ──
      {
        id: "img_kowalski_2",
        date: "2026-03-11",
        modality: ImagingModality.ULTRASOUND,
        bodyRegion: "Head",
        studyDescription: "Ultrasound Cranial — via Anterior Fontanelle",
        status: ImagingStatus.RECOMMENDED,
        contrast: ContrastType.NONE,
        indication: "Alternative to CT Head in 3-month-old with open fontanelle. Evaluate for intracranial pathology as cause of irritability. No ionizing radiation.",
        keyFindings: [],
        recommendation: "Consider cranial US as first-line given open fontanelle — avoids ionizing radiation in infant.",
        orderingPhysician: "Dr. Lisa Greenwood",
        facility: "Riverside Children's Hospital",
        source_quote: "Anterior fontanelle open, soft, and flat — approximately 2.5 x 2.5cm (normal for age)",
        quote_start: 4620,
        quote_end: 4700
      }
    ]
  }
};

/**
 * Retrieve precomputed extraction data for a demo patient.
 * Returns null for unknown patient IDs (triggers live LLM extraction).
 */
export const getPrecomputedData = (patientId: string): ExtractionResult | null => {
  return PRECOMPUTED_DATA[patientId] ?? null;
};

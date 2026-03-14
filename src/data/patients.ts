/**
 * RadView — Patient Profiles & Current Imaging Orders
 *
 * Each patient is designed to trigger specific rules in the appropriateness engine.
 * The clinical details are realistic and internally consistent.
 */

import type { PatientProfile, ImagingOrder } from "../types";
import { ImagingModality, ContrastType } from "../types";

// ═══════════════════════════════════════════════════════════════
// PATIENT 1: MRS. LI-MEI ZHANG — "The Repeat Scan"
// Triggers: REPEAT_SCAN (CT A/P within 90 days) + CONTRAST_SAFETY (eGFR < 45)
// ═══════════════════════════════════════════════════════════════

export const PATIENT_ZHANG: PatientProfile = {
  id: "patient_zhang",
  mrn: "20261001",
  name: "Mrs. Li-Mei Zhang",
  dob: "1957-08-14",
  age: 68,
  gender: "Female",
  conditions: [
    "Hypertension",
    "Type 2 Diabetes Mellitus",
    "Chronic Kidney Disease Stage 3b",
    "Hyperlipidemia",
    "Osteoarthritis bilateral knees",
    "Hepatic steatosis (NAFLD)",
    "Iron deficiency anemia — resolved"
  ],
  allergies: ["Penicillin (maculopapular rash, 2018)"],
  renalFunction: {
    eGFR: 38,
    creatinine: 1.4,
    date: "2026-02-28"
  },
  pregnancyStatus: "NOT_PREGNANT",
  notes: `Mrs. Li-Mei Zhang
MRN: 20261001
DOB: 1957-08-14 (68 years old)
Sex: Female
NOK: Mr. Wei Zhang (Husband) — (65) 9234-8812

REFERRING PHYSICIAN: Dr. Alan Foster, Internal Medicine
FACILITY: Riverside General Hospital

===== PATIENT SUMMARY =====
Active Conditions: Hypertension, T2DM, CKD Stage 3b, Hyperlipidemia, NAFLD, OA bilateral knees.
Surgical History: Appendicectomy (1989), Cholecystectomy (2019 — laparoscopic, for symptomatic gallstones), Right carpal tunnel release (2022).
Social: Retired school teacher. Lives with husband. Non-smoker. Nil alcohol. Independent in ADLs.

Current Medications:
  - Metformin 1g BD (T2DM)
  - Gliclazide 80mg daily (T2DM)
  - Amlodipine 10mg daily (HTN)
  - Perindopril 5mg daily (HTN / renoprotection)
  - Atorvastatin 40mg nocte (Hyperlipidemia)
  - Ferrous sulfate 325mg daily (recently stopped — Hb normalized)
  - Paracetamol 1g QDS PRN (OA knees)
  - Glucosamine 1500mg daily (OA)

Allergies: Penicillin — maculopapular rash (documented 2018, Riverside General).

Recent Labs (February 28, 2026):
  Hb 12.1, WBC 7.2, Plt 245
  Na 139, K 4.6, Cr 1.4 (baseline 1.2-1.4), eGFR 38 mL/min (stable from 41 in Aug 2025)
  HbA1c 7.2%, Fasting glucose 8.1 mmol/L
  LFTs: ALT 28, AST 24, ALP 78, GGT 35, Bilirubin 12 — all normal
  Lipase 32 (normal)
  CRP 3, ESR 18
  Total cholesterol 4.8, LDL 2.4, HDL 1.3, TG 2.1
  Iron studies: Ferritin 45 (improved from 8 in June 2025), Fe 12, TIBC 55

===== REFERRAL LETTER =====
Date: March 8, 2026

Dear Radiology,

I am referring Mrs. Zhang for a CT Abdomen and Pelvis with IV contrast for evaluation of ongoing abdominal pain.

She reports intermittent right-sided abdominal discomfort that has been present on and off over the past 3 months. The pain is described as dull and aching, rated 3-4/10, worse after heavy meals, and occasionally radiating to the back. No associated nausea or vomiting. No change in bowel habits — she reports regular bowel motions once daily. No rectal bleeding or melena. No urinary symptoms. No unexplained weight loss — she has actually gained 2kg over the past 6 months. Appetite is good.

I note she had a cholecystectomy in 2019 for symptomatic gallstones, so biliary colic is unlikely. The pain is somewhat positional and may be musculoskeletal in origin given her known degenerative changes.

Background: HTN (well controlled on Amlodipine + Perindopril), T2DM (HbA1c 7.2%, on Metformin + Gliclazide), CKD Stage 3b (eGFR 38 mL/min — stable over last 12 months), Hyperlipidemia (on Atorvastatin), NAFLD (diagnosed on US Nov 2025).
Allergies: Penicillin (rash).

Physical examination today was unremarkable. Abdomen is soft, non-tender, no guarding, no palpable masses, no organomegaly. Well-healed laparoscopic scars. Hernial orifices intact. Bowel sounds present and normal. No peripheral edema.

Bloods from last week (Feb 28) show stable renal function, normal LFTs, normal lipase, and CRP of 3.

She had a CT Abdomen/Pelvis done about 2 months ago in the ED — I believe it was largely unremarkable but I do not have easy access to the full report in my clinic system (the ED report has not been linked to her outpatient file). I would appreciate repeat imaging to evaluate for any interval change and to investigate the persistent symptoms.

Thank you for your assistance.

Dr. Alan Foster
Internal Medicine
Riverside General Hospital

===== PROGRESS NOTES =====

--- NOTE: August 15, 2025 ---
CKD Clinic Review — Dr. Alan Foster
Mrs. Zhang reviewed for CKD monitoring. eGFR 41, stable. Cr 1.3. Potassium 4.5 (normal on Perindopril). No proteinuria on spot urine. Continue current management. Avoid NSAIDs — counseled again regarding OTC ibuprofen. She reports she only takes paracetamol now. Recheck bloods in 6 months.

--- NOTE: June 10, 2025 ---
Internal Medicine — Dr. Alan Foster
Seen for fatigue. Found to have iron deficiency anemia (Hb 10.2, Ferritin 8). No overt GI bleeding symptoms. Started on Ferrous sulfate 325mg daily. Referred for gastroscopy to exclude upper GI source — patient declined procedure, prefers to trial iron first and recheck. Will monitor.

--- NOTE: April 2, 2025 ---
Orthopaedic Surgery — Dr. R. Mehta
Reviewed for bilateral knee OA. Kellgren-Lawrence Grade III both knees on standing X-rays (done today — see below). Discussed options: conservative management, cortisone injections, eventual TKR. Patient keen to try cortisone injections first. If fails, will list for right TKR (worse side). Pre-op workup to be done closer to surgery date.

===== PREVIOUS RADIOLOGY REPORTS =====

--- REPORT 1 ---
EXAMINATION: CT Abdomen and Pelvis with IV Contrast
DATE: January 15, 2026
CLINICAL INDICATION: Abdominal pain, rule out appendicitis
ORDERING PHYSICIAN: Dr. S. Tan (Emergency Department)
ACCESSION: RAD-2026-00415

TECHNIQUE: Helical CT of the abdomen and pelvis was performed following administration of 100mL Omnipaque 350 intravenously. Portal venous phase acquisition. Oral contrast was not administered. Note was made of the patient's CKD (eGFR 41 at time of study) — IV hydration protocol was followed per department guidelines.

COMPARISON: Ultrasound abdomen November 12, 2025.

FINDINGS:
Liver: Normal in size (15.3cm craniocaudal). Mildly decreased attenuation compared to spleen, consistent with hepatic steatosis. There is a 3.0cm hypodense lesion in segment VI of the liver, demonstrating homogeneous low attenuation (approximately 5 HU) consistent with a simple hepatic cyst. This likely corresponds to the lesion suspected but incompletely characterized on the November 2025 ultrasound. No enhancing hepatic lesions identified. No intrahepatic biliary dilatation.

Gallbladder: Surgically absent (cholecystectomy). Surgical clips noted in the gallbladder fossa. No fluid collection.

Pancreas: Normal in size and attenuation. No pancreatic ductal dilatation. No peripancreatic stranding.

Spleen: Normal (11.2cm). Homogeneous.

Adrenals: Normal bilaterally. No adenoma or mass.

Kidneys: Right kidney 9.8cm, left kidney 9.5cm. No hydronephrosis. No renal calculi. Bilateral simple cortical cysts (right 1.2cm upper pole, left 0.8cm mid pole). Cortical thinning noted bilaterally, consistent with chronic kidney disease. Symmetric nephrogram.

Appendix: Normal caliber appendix identified in the right lower quadrant, measuring 5mm in diameter. No periappendiceal fat stranding or fluid. No appendicolith.

Bowel: Normal caliber small and large bowel. No bowel obstruction or wall thickening. No free fluid. No mesenteric lymphadenopathy.

Pelvic organs: Post-menopausal uterus. No adnexal mass. No free pelvic fluid.

Lymph nodes: No pathologically enlarged retroperitoneal, mesenteric, or pelvic lymph nodes.

Vasculature: Moderate atherosclerotic calcification of the abdominal aorta (infrarenal) and both common iliac arteries. No aneurysm — aorta measures 2.1cm infrarenally. Patent IVC. No thrombosis.

Musculoskeletal: Multilevel degenerative disc disease of the lumbar spine, most prominent at L4-L5 and L5-S1. Mild bilateral facet joint arthropathy L3-L5. No compression fracture. No suspicious osseous lesion.

Soft tissues: Unremarkable. No abdominal wall hernia.

IMPRESSION:
1. No acute abdominal pathology. Normal appendix — no appendicitis.
2. 3.0cm simple hepatic cyst in segment VI — benign. Corresponds to the lesion suspected on prior US. No follow-up needed.
3. Hepatic steatosis, consistent with known NAFLD.
4. Bilateral simple renal cortical cysts with cortical thinning consistent with CKD.
5. Moderate atherosclerotic disease of the aorta and iliac arteries.
6. Multilevel lumbar degenerative disc disease — correlate clinically if symptomatic.
7. Surgically absent gallbladder — no complication.

RADIOLOGIST: Dr. Karen Liu, MBBS FRANZCR
REPORTED: January 15, 2026

--- REPORT 2 ---
EXAMINATION: X-Ray Chest PA and Lateral
DATE: March 2, 2026
CLINICAL INDICATION: Pre-operative assessment for right total knee replacement
ORDERING PHYSICIAN: Dr. R. Mehta (Orthopaedic Surgery)
ACCESSION: RAD-2026-01890

COMPARISON: No prior chest radiograph on file.

FINDINGS:
Heart: Normal in size. Cardiothoracic ratio 0.48. No cardiomegaly.
Mediastinum: Normal contour. No widening. No mass.
Hila: Normal bilaterally.
Lungs: Clear lung fields. No focal consolidation, pleural effusion, or pneumothorax. No interstitial abnormality.
Bones: Degenerative changes of the thoracic spine with anterior osteophytes. No acute bony abnormality. No rib fracture.
Soft tissues: Unremarkable.

IMPRESSION:
1. No acute cardiopulmonary process.
2. Normal pre-operative chest radiograph.

RADIOLOGIST: Dr. James Park, MBBS FRANZCR
REPORTED: March 2, 2026

--- REPORT 3 ---
EXAMINATION: Ultrasound Abdomen
DATE: November 12, 2025
CLINICAL INDICATION: Mildly elevated ALT (42) on routine bloods. Evaluate for fatty liver. Known CKD.
ORDERING PHYSICIAN: Dr. Alan Foster (Internal Medicine)
ACCESSION: RAD-2025-09876

FINDINGS:
Liver: Mildly increased parenchymal echogenicity compared to the right renal cortex, consistent with hepatic steatosis (Grade 1 fatty liver). Liver span 15.5cm (mildly enlarged). A small hypoechoic lesion was suspected in the right lobe (segment V/VI), approximately 2cm, but was incompletely visualized due to patient body habitus and overlying rib shadow. This may represent a cyst but cannot be fully characterized on ultrasound.

Gallbladder: Surgically absent.
CBD: Not dilated (3mm). No choledocholithiasis.
Pancreas: Partially obscured by bowel gas. Visualized body and tail appear normal.
Spleen: Normal (10.8cm). Homogeneous.
Right kidney: 10.2cm. Normal cortical echotexture. No hydronephrosis. No calculus. A 1.0cm simple cortical cyst at the upper pole.
Left kidney: 9.8cm. Normal cortical echotexture. No hydronephrosis. No calculus. A 0.7cm simple cortical cyst at the mid pole.
Aorta: Not well visualized distal to the renal arteries due to body habitus and bowel gas.
No ascites.

IMPRESSION:
1. Hepatic steatosis (Grade 1 fatty liver).
2. Incompletely characterized hypoechoic lesion in the right hepatic lobe — likely a simple cyst but not definitively characterized. Recommend CT abdomen for further evaluation if clinically indicated.
3. Bilateral simple renal cysts. No hydronephrosis.
4. Surgically absent gallbladder — no biliary dilatation.

RADIOLOGIST: Dr. Sarah Chen, MBBS FRANZCR
REPORTED: November 12, 2025

--- REPORT 4 ---
EXAMINATION: X-Ray Both Knees (Standing AP, Lateral, and Skyline Views)
DATE: April 2, 2025
CLINICAL INDICATION: Bilateral knee pain. Assess for osteoarthritis.
ORDERING PHYSICIAN: Dr. R. Mehta (Orthopaedic Surgery)
ACCESSION: RAD-2025-03120

FINDINGS:
Right knee: Joint space narrowing of the medial compartment with subchondral sclerosis. Small marginal osteophytes at the medial femoral condyle and tibial plateau. Patellofemoral compartment shows mild joint space narrowing. No loose bodies. No fracture. Kellgren-Lawrence Grade III.

Left knee: Mild-to-moderate medial compartment joint space narrowing with early subchondral sclerosis. Small osteophytes. Patellofemoral compartment is relatively preserved. No loose bodies. No fracture. Kellgren-Lawrence Grade II-III.

IMPRESSION:
1. Bilateral knee osteoarthritis, right worse than left.
2. Right knee: Kellgren-Lawrence Grade III.
3. Left knee: Kellgren-Lawrence Grade II-III.
4. No acute fracture or effusion.

RADIOLOGIST: Dr. James Park, MBBS FRANZCR
REPORTED: April 2, 2025

--- REPORT 5 ---
EXAMINATION: X-Ray KUB (Kidneys, Ureters, Bladder)
DATE: September 20, 2024
CLINICAL INDICATION: CKD monitoring, flank discomfort. Rule out renal calculi.
ORDERING PHYSICIAN: Dr. Alan Foster (Internal Medicine)
ACCESSION: RAD-2024-08451

FINDINGS:
No radio-opaque calculi identified along the expected course of the ureters or within the bladder. Both renal outlines appear normal. Degenerative changes of the lumbar spine. Moderate aortic calcification. No bowel obstruction. No free air.

IMPRESSION:
1. No radio-opaque renal calculi.
2. Aortic calcification — correlate with vascular risk profile.
3. Degenerative lumbar spondylosis.

RADIOLOGIST: Dr. T. Nakamura, MBBS FRANZCR
REPORTED: September 20, 2024`,

  priorReports: "" // Combined into notes for this demo
};

export const ORDER_ZHANG: ImagingOrder = {
  modality: ImagingModality.CT,
  bodyRegion: "Abdomen/Pelvis",
  studyDescription: "CT Abdomen and Pelvis with IV Contrast",
  contrast: ContrastType.IV_CONTRAST,
  clinicalIndication: "Abdominal pain, follow-up. Intermittent right-sided abdominal discomfort x 3 months. Prior CT 2 months ago reportedly unremarkable — referring physician requesting repeat for interval change.",
  orderingPhysician: "Dr. Alan Foster",
  urgency: "ROUTINE",
  patientId: "patient_zhang"
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 2: MR. RAJESH VIKRAM PATEL — "The Low Back Pain"
// Triggers: ACR_LUMBAR_SPINE_ACUTE_LBP (MRI for acute LBP < 6 weeks, no red flags)
// ═══════════════════════════════════════════════════════════════

export const PATIENT_PATEL: PatientProfile = {
  id: "patient_patel",
  mrn: "20264502",
  name: "Mr. Rajesh Vikram Patel",
  dob: "1980-11-03",
  age: 45,
  gender: "Male",
  conditions: [
    "Acute mechanical low back pain",
    "Seasonal allergic rhinitis",
    "Mild myopia (corrected)"
  ],
  allergies: ["Nil known drug allergies"],
  pregnancyStatus: undefined,
  notes: `Mr. Rajesh Vikram Patel
MRN: 20264502
DOB: 1980-11-03 (45 years old)
Sex: Male
NOK: Mrs. Priya Patel (Wife) — (65) 8841-2290

REFERRING PHYSICIAN: Dr. Patricia Wong, Family Medicine
FACILITY: Greenfield Medical Centre

===== PATIENT SUMMARY =====
Active Conditions: Acute mechanical low back pain (onset Feb 24, 2026). Seasonal allergic rhinitis.
Surgical History: Nil.
Social: Software engineer at a financial services firm. Sedentary occupation — sits at a desk 8-10 hours/day. Married with two children (ages 12, 9). Non-smoker. Social alcohol (1-2 drinks on weekends). No recreational drugs. Regular gym-goer (3x/week) until back pain onset.

Current Medications: Nil regular.
  - Ibuprofen 400mg TDS PRN (self-purchased, started 2 weeks ago for back pain)
  - Cetirizine 10mg PRN (seasonal allergies)

Allergies: NKDA.

Recent Labs (March 5, 2026 — ordered by Dr. Wong as part of workup):
  Hb 15.2, WBC 6.8, Plt 220
  CRP 2, ESR 8
  Ca 2.35, ALP 65 — normal
  PSA 0.8 (normal — screening given age)

===== REFERRAL LETTER =====
Date: March 10, 2026

Dear Radiology,

I am requesting an MRI Lumbar Spine without contrast for Mr. Patel who presents with a 2-week history of acute low back pain.

The pain started on February 24, 2026, after he spent a weekend helping a friend move house — involving repeated heavy lifting and carrying boxes up three flights of stairs. He woke the following morning with severe lower back stiffness and pain. Since then, the pain has gradually improved from 8/10 to approximately 5-6/10, but has not fully resolved.

He describes a constant dull aching pain across the lower back, centered at the belt line, worse with bending forward, prolonged sitting (particularly at his office desk), and getting out of bed in the morning. The pain is somewhat relieved by lying flat, gentle walking, and hot showers. He denies any radiation of pain to the legs. No numbness, tingling, or weakness in the lower extremities. No bowel or bladder dysfunction. No saddle area numbness.

Importantly, there are no red flag symptoms:
  - No history of cancer.
  - No unexplained weight loss.
  - No fever, rigors, or night sweats.
  - No history of IV drug use.
  - No recent infection.
  - No history of osteoporosis or steroid use.
  - No significant trauma (the lifting was voluntary, not a fall or accident).

He has tried OTC ibuprofen 400mg TDS for the past 2 weeks with modest improvement. He has not yet tried physiotherapy. He has been sleeping poorly due to discomfort and is finding it difficult to concentrate at work.

Mr. Patel is an anxious patient and is worried that he may have "slipped a disc" or that something more serious is going on. He has read extensively online about disc herniations and is specifically requesting an MRI. I have counseled him that acute mechanical back pain typically resolves with conservative management within 4-6 weeks, and that imaging at this stage is generally not recommended without red flag symptoms. However, he remains keen to proceed and I am referring at his request.

Past medical history: Nil significant. No prior back injuries. No prior spinal imaging.
Family history: Father had lumbar disc surgery at age 60. Mother — T2DM, HTN. No cancer.

On examination today:
  - Gait: Normal. No antalgic gait.
  - Spine: Mild lumbar lordosis flattening. Paravertebral muscle tenderness L4-S1 bilaterally, right > left. No midline bony tenderness. No step deformity.
  - Range of motion: Full flexion and extension with discomfort at end-range flexion. Lateral flexion and rotation preserved.
  - Neurological: Straight leg raise negative bilaterally (70 degrees without radicular pain). Femoral stretch test negative. Motor power 5/5 in all L2-S1 myotomes (hip flexion, knee extension, ankle dorsiflexion, great toe extension, ankle plantarflexion). Sensation intact to light touch in all dermatomes. Knee jerks 2+ symmetric. Ankle jerks 2+ symmetric. Babinski downgoing bilaterally.
  - Abdominal: Soft, non-tender. No pulsatile mass.

Assessment: Acute mechanical low back pain, 2 weeks duration, no red flags. Likely musculoligamentous strain.

I would appreciate your assistance with this MRI request.

Thank you,
Dr. Patricia Wong
Family Medicine
Greenfield Medical Centre

===== PREVIOUS RADIOLOGY REPORTS =====

(No prior imaging of the spine on file for this patient.)

--- REPORT 1 ---
EXAMINATION: X-Ray Chest PA
DATE: August 5, 2024
CLINICAL INDICATION: Immigration medical examination
ORDERING PHYSICIAN: Dr. M. Singh (Panel Physician)
ACCESSION: RAD-2024-06213

FINDINGS:
Heart: Normal size and configuration. Cardiothoracic ratio 0.44.
Mediastinum: Normal. No widening.
Lungs: Clear bilaterally. No focal consolidation, pleural effusion, or mass.
Costophrenic angles: Sharp bilaterally.
Bones: No acute bony abnormality.

IMPRESSION:
Normal chest radiograph.

RADIOLOGIST: Dr. T. Nakamura, MBBS FRANZCR
REPORTED: August 5, 2024

--- REPORT 2 ---
EXAMINATION: X-Ray Right Shoulder (AP, Axillary, and Y-View)
DATE: March 18, 2023
CLINICAL INDICATION: Right shoulder pain after a fall during recreational basketball.
ORDERING PHYSICIAN: Dr. Patricia Wong (Family Medicine)
ACCESSION: RAD-2023-02405

FINDINGS:
No fracture or dislocation. Glenohumeral joint alignment is maintained. Acromioclavicular joint is normal. No calcific tendinitis. Soft tissues unremarkable.

IMPRESSION:
1. No acute fracture or dislocation of the right shoulder.
2. Normal radiographic appearance — clinical correlation for soft tissue injury (rotator cuff strain).

RADIOLOGIST: Dr. Sarah Chen, MBBS FRANZCR
REPORTED: March 18, 2023

--- REPORT 3 ---
EXAMINATION: Ultrasound Right Shoulder
DATE: April 3, 2023
CLINICAL INDICATION: Persistent right shoulder pain 2 weeks post-injury. Rule out rotator cuff tear.
ORDERING PHYSICIAN: Dr. Patricia Wong (Family Medicine)
ACCESSION: RAD-2023-02890

FINDINGS:
Supraspinatus: Intact. No full- or partial-thickness tear. Mild tendinosis with mildly heterogeneous echotexture.
Infraspinatus: Intact. Normal appearance.
Subscapularis: Intact. Normal appearance.
Biceps tendon: In the bicipital groove. Normal caliber. No effusion around the tendon.
Subacromial-subdeltoid bursa: Trace fluid — likely physiological.
Acromioclavicular joint: Normal. No effusion.

IMPRESSION:
1. Intact rotator cuff. No tear.
2. Mild supraspinatus tendinosis — likely from acute strain. Should resolve with conservative management.
3. Trace subacromial bursal fluid — likely physiological.

RADIOLOGIST: Dr. Karen Liu, MBBS FRANZCR
REPORTED: April 3, 2023`,

  priorReports: ""
};

export const ORDER_PATEL: ImagingOrder = {
  modality: ImagingModality.MRI,
  bodyRegion: "Lumbar Spine",
  studyDescription: "MRI Lumbar Spine without Contrast",
  contrast: ContrastType.NONE,
  clinicalIndication: "Acute low back pain x 2 weeks after heavy lifting. No red flags. Patient anxious, requesting MRI. Rule out disc herniation.",
  orderingPhysician: "Dr. Patricia Wong",
  urgency: "ROUTINE",
  patientId: "patient_patel"
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 3: MS. CARMEN LUCIA RIVERA — "The Incidental Finding Follow-Up"
// Triggers: FLEISCHNER_LUNG_NODULE (follow-up CT at 3 months instead of 12)
// ═══════════════════════════════════════════════════════════════

export const PATIENT_RIVERA: PatientProfile = {
  id: "patient_rivera",
  mrn: "20263107",
  name: "Ms. Carmen Lucia Rivera",
  dob: "1970-06-22",
  age: 55,
  gender: "Female",
  conditions: [
    "COPD (GOLD Stage II, FEV1 65% predicted)",
    "Current smoker (30 pack-year history)",
    "Hypertension",
    "Generalized anxiety disorder",
    "Gastroesophageal reflux disease (GERD)",
    "Vitamin D deficiency"
  ],
  allergies: ["Sulfonamides (anaphylaxis — documented 2015, Riverside ED)"],
  renalFunction: {
    eGFR: 85,
    creatinine: 0.8,
    date: "2026-01-10"
  },
  pregnancyStatus: "NOT_PREGNANT",
  notes: `Ms. Carmen Lucia Rivera
MRN: 20263107
DOB: 1970-06-22 (55 years old)
Sex: Female
NOK: Mr. Diego Rivera (Brother) — (65) 7710-4523

REFERRING PHYSICIAN: Dr. Nathan Brooks, Pulmonology
FACILITY: Riverside General Hospital

===== PATIENT SUMMARY =====
Active Conditions: COPD GOLD Stage II (FEV1 65% predicted, diagnosed 2020), Current smoker (30 pack-years — started age 18, ~1 pack/day), HTN, GAD, GERD, Vitamin D deficiency.
Surgical History: Laparoscopic cholecystectomy (2018), Diagnostic laparoscopy for pelvic pain (2012 — no pathology found).
Social: Works as a hotel receptionist (shift work). Divorced, lives alone. Estranged from adult daughter (age 32). Active smoker — has attempted quitting 3 times (patches, gum, Champix — each lasted <3 months). Occasional wine (2-3 glasses/week). No recreational drugs.

Current Medications:
  - Tiotropium Respimat 2.5mcg/actuation, 2 puffs daily (COPD maintenance)
  - Salbutamol MDI 100mcg, 2 puffs PRN (rescue inhaler — using ~3-4x/week)
  - Amlodipine 5mg daily (HTN)
  - Sertraline 50mg daily (GAD — started 2023)
  - Pantoprazole 40mg daily (GERD)
  - Cholecalciferol 1000IU daily (Vitamin D deficiency)

Allergies: Sulfonamides — ANAPHYLAXIS (documented 2015). Patient carries EpiPen.

Recent Labs (January 10, 2026):
  Hb 13.8, WBC 8.1, Plt 278
  Cr 0.8, eGFR 85, Na 141, K 4.1
  CRP 5, ESR 22
  HbA1c 5.4% (non-diabetic)
  Vitamin D 52 nmol/L (improving from 28 in June 2025)

Spirometry (October 15, 2025 — Dr. Brooks):
  FEV1: 1.72L (65% predicted)
  FVC: 2.95L (88% predicted)
  FEV1/FVC: 0.58 (reduced)
  Post-bronchodilator: FEV1 improved by 8% (not significant)
  Interpretation: Moderate obstructive pattern, consistent with COPD GOLD Stage II. No significant bronchodilator response.

===== REFERRAL LETTER =====
Date: March 9, 2026

Dear Radiology,

Requesting CT Chest without contrast for follow-up of a pulmonary nodule found incidentally on prior CT.

Ms. Rivera is a 55-year-old woman with COPD and a significant 30-pack-year smoking history who was seen in the Emergency Department in December 2025 with acute shortness of breath and pleuritic left-sided chest pain. CT pulmonary angiography at that time was negative for pulmonary embolism, but incidentally revealed a 6mm solid, non-calcified nodule in the right middle lobe.

The reporting radiologist (Dr. Liu) recommended follow-up CT Chest in 12 months per Fleischner Society 2017 guidelines, classifying Ms. Rivera as a high-risk patient (>30 pack-year smoking history, solid nodule 6-8mm, single).

However, Ms. Rivera has been extremely anxious about this finding since she was told about it. She has attended my clinic three times since December specifically to discuss the nodule. She reports intrusive thoughts about lung cancer, difficulty sleeping, and has been Googling "lung nodule cancer risk" extensively. Her existing GAD has worsened — Dr. Kim (her psychiatrist) has noted this in a recent letter and increased her Sertraline to 75mg pending reassessment.

From a respiratory standpoint, she reports no new symptoms. Her dyspnea on exertion is at her baseline — she can walk approximately 200 meters on flat ground before needing to rest. No hemoptysis. No new cough (her chronic productive morning cough is unchanged). No chest pain. No weight loss — she has actually gained 1.5kg. No night sweats. No bone pain.

I recognize that the Fleischner guidelines recommend 12-month follow-up for this scenario and that 3 months is earlier than recommended. I am referring primarily to address the patient's significant anxiety and to provide reassurance, as her psychological distress is becoming a clinical issue in itself. I would appreciate your assessment.

Current medications: Tiotropium, Salbutamol PRN, Amlodipine 5mg, Sertraline 75mg (recently increased), Pantoprazole 40mg, Cholecalciferol 1000IU.

Thank you for your assistance.

Dr. Nathan Brooks
Respiratory Medicine
Riverside General Hospital

===== PROGRESS NOTES =====

--- NOTE: February 20, 2026 ---
Pulmonology Clinic — Dr. Nathan Brooks
Ms. Rivera presents again to discuss lung nodule. Third visit since December. Continues to be very anxious. No new respiratory symptoms. Examination stable — chest clear, O2 sat 96% RA. Discussed Fleischner guidelines again — explained that 6mm nodule in a high-risk patient warrants 12-month follow-up, not earlier. Patient tearful, says she "can't wait that long." Counseled that the risk of a 6mm solid nodule being malignant is <2%. Will refer for CT at 3 months to address anxiety, acknowledging this is earlier than guidelines recommend. Letter to psychiatrist Dr. Kim.

--- NOTE: January 8, 2026 ---
Pulmonology Clinic — Dr. Nathan Brooks
Post-ED follow-up. Ms. Rivera reviewed after her December ED visit. Discussed CT-PA findings: no PE (reassuring), but incidental 6mm lung nodule found. Explained that small nodules are very common and most are benign. Given her smoking history, follow-up is recommended per Fleischner guidelines — next CT in December 2026 (12 months). Patient very anxious about this. Lengthy discussion about smoking cessation — she is "thinking about trying again." Offered Quitline referral — she will consider.

--- NOTE: October 15, 2025 ---
Pulmonology Clinic — Dr. Nathan Brooks
Annual COPD review. Spirometry shows stable FEV1 at 65% predicted (was 67% in 2024 — within test-to-test variability). Continues to smoke despite counseling. Using Tiotropium daily and Salbutamol PRN. Salbutamol use ~3-4x/week — at the upper end of acceptable, not yet requiring step-up. No exacerbations in past 6 months. Vaccinations up to date (influenza and COVID). Continue current regimen. Review in 6 months or sooner if exacerbation.

===== PREVIOUS RADIOLOGY REPORTS =====

--- REPORT 1 ---
EXAMINATION: CT Pulmonary Angiography (CT-PA)
DATE: December 5, 2025
CLINICAL INDICATION: Acute shortness of breath and left-sided pleuritic chest pain x 6 hours. Tachycardic (HR 108). D-dimer elevated at 1.2 mg/L FEU. Wells Score 4.5 (moderate probability). Query pulmonary embolism.
ORDERING PHYSICIAN: Dr. H. Okonkwo (Emergency Department)
ACCESSION: RAD-2025-10452

TECHNIQUE: CT pulmonary angiography performed following IV administration of 70mL Ultravist 370, bolus-tracked to the main pulmonary artery. Scan from lung apices to adrenals.

COMPARISON: Chest X-ray September 18, 2025.

FINDINGS:
Pulmonary arteries: No filling defect identified in the main, right, left, lobar, segmental, or subsegmental pulmonary arteries to suggest pulmonary embolism. Main pulmonary artery diameter is 28mm (normal, <29mm).

Lungs: Centrilobular emphysematous changes in both upper lobes, consistent with the known history of COPD. No consolidation. No ground glass opacification. No pleural effusion.

Incidental finding: A 6mm solid, non-calcified nodule is noted in the right middle lobe (series 4, image 187, axial location). The nodule has smooth margins and no surrounding ground glass halo. It is too small for reliable density measurement. No spiculation. No associated lymphadenopathy.

The nodule was NOT visible on the September 2025 chest X-ray, which is not unexpected given its small size and location (projected over the right hilum on frontal radiograph).

Heart: Normal cardiac size (cardiothoracic ratio difficult to assess on CT). No pericardial effusion. No coronary artery calcification.
Mediastinum: No pathologically enlarged mediastinal or hilar lymph nodes (largest subcarinal node 8mm, short axis — within normal limits).
Bones: Mild degenerative changes of the thoracic spine. No suspicious lytic or blastic lesions.
Upper abdomen (limited view): Liver, spleen, adrenals appear normal on limited images.

IMPRESSION:
1. No pulmonary embolism.
2. Incidental 6mm solid, non-calcified nodule in the right middle lobe. In a patient with significant smoking history (30 pack-years), this is classified as a high-risk scenario. Recommend follow-up CT Chest (low-dose, non-contrast) in 12 months per Fleischner Society 2017 guidelines (solid nodule 6-8mm, single, high-risk patient). If the nodule is stable at 12 months, no further follow-up is required.
3. Centrilobular emphysema consistent with COPD.
4. No other acute thoracic abnormality.

RADIOLOGIST: Dr. Karen Liu, MBBS FRANZCR
REPORTED: December 5, 2025

--- REPORT 2 ---
EXAMINATION: X-Ray Chest PA and Lateral
DATE: September 18, 2025
CLINICAL INDICATION: COPD exacerbation, productive cough x 5 days with yellow sputum. Fever 37.8°C. Rule out pneumonia.
ORDERING PHYSICIAN: Dr. Nathan Brooks (Pulmonology)
ACCESSION: RAD-2025-08230

COMPARISON: Chest X-ray March 15, 2025.

FINDINGS:
Lungs: Hyperinflated lungs with flattened hemidiaphragms, consistent with known COPD. No focal consolidation to suggest pneumonia. No pleural effusion. No pneumothorax.
Heart: Heart size is at the upper limit of normal. Stable compared to prior.
Mediastinum: Normal. No widening.
Bones: Degenerative changes. No acute bony abnormality.

IMPRESSION:
1. COPD with hyperinflation. No consolidation to suggest pneumonia.
2. Heart size at upper limit of normal — stable.

RADIOLOGIST: Dr. James Park, MBBS FRANZCR
REPORTED: September 18, 2025

--- REPORT 3 ---
EXAMINATION: X-Ray Chest PA
DATE: March 15, 2025
CLINICAL INDICATION: Annual COPD follow-up. Baseline.
ORDERING PHYSICIAN: Dr. Nathan Brooks (Pulmonology)
ACCESSION: RAD-2025-02540

COMPARISON: Chest X-ray April 8, 2024.

FINDINGS:
Stable hyperinflated lungs consistent with COPD. No new focal parenchymal abnormality. Heart size stable at upper limit of normal. No pleural effusion.

IMPRESSION:
1. Stable COPD. No acute findings compared to prior.

RADIOLOGIST: Dr. T. Nakamura, MBBS FRANZCR
REPORTED: March 15, 2025

--- REPORT 4 ---
EXAMINATION: Screening Mammogram (Bilateral Digital 2D + Tomosynthesis)
DATE: July 10, 2025
CLINICAL INDICATION: Routine screening. No symptoms. No family history of breast cancer. No prior breast surgery.
ORDERING PHYSICIAN: Dr. S. Varma (Gynaecology / BreastScreen)
ACCESSION: RAD-2025-06220

FINDINGS:
Breast composition: Heterogeneously dense (ACR density C).
Right breast: No suspicious mass, architectural distortion, or grouped microcalcifications. Scattered benign-appearing calcifications.
Left breast: No suspicious mass, architectural distortion, or grouped microcalcifications. A 5mm well-circumscribed isodense nodule in the upper outer quadrant — likely a benign fibroadenoma or cyst. This was also seen on the 2023 screening mammogram and is unchanged.

IMPRESSION:
1. BI-RADS 2 — Benign findings bilaterally.
2. Stable 5mm nodule in the left upper outer quadrant — likely fibroadenoma. No change from 2023.
3. Continue routine screening in 2 years.

RADIOLOGIST: Dr. A. Montoya, MBBS FRANZCR (Breast Imaging)
REPORTED: July 10, 2025

--- REPORT 5 ---
EXAMINATION: X-Ray Chest PA
DATE: April 8, 2024
CLINICAL INDICATION: COPD annual review.
ORDERING PHYSICIAN: Dr. Nathan Brooks (Pulmonology)
ACCESSION: RAD-2024-03118

FINDINGS:
Hyperinflated lungs. No focal consolidation or effusion. Heart size at upper limit of normal. Stable from 2023 study.

IMPRESSION:
1. Stable COPD. No acute findings.

RADIOLOGIST: Dr. Sarah Chen, MBBS FRANZCR
REPORTED: April 8, 2024`,

  priorReports: ""
};

export const ORDER_RIVERA: ImagingOrder = {
  modality: ImagingModality.CT,
  bodyRegion: "Chest",
  studyDescription: "CT Chest without Contrast (Low-Dose)",
  contrast: ContrastType.NONE,
  clinicalIndication: "Follow-up 6mm solid lung nodule found incidentally on CT-PA December 2025. Right middle lobe. High-risk patient (30 pack-year smoker). Prior report recommended 12-month follow-up per Fleischner. Patient requesting early scan due to significant anxiety.",
  orderingPhysician: "Dr. Nathan Brooks",
  urgency: "ROUTINE",
  patientId: "patient_rivera"
};


// ═══════════════════════════════════════════════════════════════
// PATIENT 4: BABY ETHAN JAMES KOWALSKI — "The Pediatric Radiation"
// Triggers: PEDS_CT_HEAD_INFANT (CT Head in infant with open fontanelle)
// ═══════════════════════════════════════════════════════════════

export const PATIENT_KOWALSKI: PatientProfile = {
  id: "patient_kowalski",
  mrn: "20269903",
  name: "Baby Ethan James Kowalski",
  dob: "2025-12-10",
  age: 0.25, // 3 months
  gender: "Male",
  conditions: [
    "Irritability and poor feeding (acute presentation)",
    "Born at 38+2 weeks gestation",
    "Birth weight 3.2kg (appropriate for gestational age)",
    "Mild physiological jaundice (resolved day 5 of life)"
  ],
  allergies: [],
  pregnancyStatus: undefined,
  notes: `Baby Ethan James Kowalski
MRN: 20269903
DOB: 2025-12-10 (3 months old)
Sex: Male
NOK: Mrs. Anna Kowalski (Mother) — (65) 9002-5511
     Mr. Thomas Kowalski (Father) — (65) 9002-5512

REFERRING PHYSICIAN: Dr. Lisa Greenwood, Pediatric Emergency Medicine
FACILITY: Riverside Children's Hospital

===== PATIENT SUMMARY =====
Birth History:
  - Born at 38+2 weeks via spontaneous vaginal delivery at Riverside Maternity Unit
  - Mother: Anna Kowalski, 31 years old, G2P2. Pregnancy uncomplicated. GBS negative.
  - Birth weight: 3.2kg (50th percentile). Length: 49cm. Head circumference: 34.5cm (50th percentile).
  - Apgar scores: 8 at 1 minute, 9 at 5 minutes.
  - No resuscitation required. Cried at birth.
  - Neonatal period: Mild physiological jaundice (total bilirubin peaked at 210 µmol/L on day 3 — below phototherapy threshold). Resolved spontaneously by day 5. Newborn hearing screen: PASS bilateral. Newborn bloodspot screen: All normal.
  - No NICU admission.

Feeding: Exclusively breastfed. Was feeding well until 24 hours ago. Weight at 2-month check: 5.4kg (50th percentile) — tracking well on growth chart.

Immunizations: Up to date for age.
  - 6 weeks: Infanrix Hexa (DTaP-IPV-HepB-Hib), Prevenar 13 (PCV13), Rotarix (oral)
  - 2 months: As above (second dose due at 4 months)

Medications: Vitamin D drops 400IU daily (as per pediatric guidelines).

Allergies: Nil known.

Siblings: Older sister Sophie (age 3) — well, no current illness.

Family History:
  - Mother: Seasonal allergic rhinitis. No significant medical history.
  - Father: Childhood febrile convulsions (resolved, no epilepsy). Asthma (mild, well controlled).
  - Maternal grandmother: Type 2 Diabetes.
  - No family history of bleeding disorders, metabolic disease, or childhood cancer.

===== EMERGENCY DEPARTMENT NOTES =====
Date: March 11, 2026
Time: 14:30
Triage Category: 3 (Urgent)
Triaged by: RN S. O'Brien

PRESENTING COMPLAINT: Irritability and poor feeding x 24 hours.

HISTORY OF PRESENTING ILLNESS:
Mother brought in 3-month-old Ethan because he has been "fussy and not himself" since yesterday morning. She reports:
  - Crying more than usual — higher-pitched than normal but still consolable
  - Refusing breastfeeds — will latch for 1-2 minutes then pulls off and cries. Previously feeding 8-10 times per day for 10-15 minutes each side
  - Sleeping more than normal — had 2 long naps yesterday (2.5 hours each vs usual 1-1.5 hours)
  - Mild nasal congestion noted yesterday — clear rhinorrhea
  - Wet nappies slightly reduced (4 today vs usual 6-8) but still wet
  - No history of trauma or fall from height
  - No witnessed seizures, abnormal eye movements, or limb jerking
  - No fever — mother checked temperature several times (36.7-36.9°C axillary)
  - No vomiting or projectile vomiting
  - No diarrhea — last stool this morning, normal consistency
  - No rash
  - No sick contacts at home — sister Sophie is well
  - No recent travel
  - No new medications or supplements
  - Older sister started daycare 2 weeks ago

Mother is a first-time attendee to ED with this child. She states she is "probably overreacting" but her maternal health nurse advised her to come in given the poor feeding.

EXAMINATION:
General: Alert but irritable infant. Consolable with pacifier and swaddling but cries when being examined (undressed). Well-hydrated — moist mucous membranes, tears present, skin turgor normal. Normal skin color — no pallor, cyanosis, or mottling. No bruising, petechiae, or marks anywhere on the body.

Vitals:
  HR: 148 bpm (normal for age: 100-160)
  RR: 38 breaths/min (normal for age: 30-60)
  Temp: 36.9°C (tympanic)
  SpO2: 99% on room air
  Weight: 5.6kg (consistent with growth trajectory — 50th percentile)
  BP: Not measured (not routine in this age group without indication)

Head: Anterior fontanelle open, soft, and flat — approximately 2.5 x 2.5cm (normal for age). Posterior fontanelle closed (normal by 2-3 months). Normal head circumference at 40.5cm (50th percentile — was 39.2cm at 2-month check, tracking along curve). No cephalohematoma. No scalp swelling or boggy areas. No cranial bruit. Sutures palpable but not separated.

Eyes: Pupils equal at 3mm, reactive to light bilaterally. No sunset sign (sclera not visible above iris). Red reflex present bilaterally. No conjunctival injection. Tracks faces and follows objects across midline (age-appropriate).

ENT: TMs visualized bilaterally using otoscope — mild erythema of the RIGHT tympanic membrane. No bulging. No effusion visible. Left TM normal. Throat clear. Mild clear nasal discharge bilaterally. No oral lesions.

Chest: Clear to auscultation bilaterally. No wheeze, crackles, or stridor. Equal air entry. No respiratory distress — no subcostal or intercostal recession. No tracheal tug.

CVS: Normal S1/S2. No murmur. Femoral pulses palpable and equal bilaterally. Capillary refill <2 seconds centrally.

Abdomen: Soft, non-distended. No hepatosplenomegaly. Normal bowel sounds. Umbilicus healed and clean. No inguinal hernias.

Neuro: Spontaneous movement of all 4 limbs — symmetric. Normal tone — no hypo- or hypertonia. Head control: developing, can briefly hold head up (age-appropriate for 3 months). Moro reflex present and symmetric. Palmar grasp reflex intact bilaterally. Tonic neck reflex present. Suck reflex present but infant is fussy at the breast. No clonus. No abnormal posturing.

Skin: Thorough skin survey performed. No bruising. No petechiae. No rash. No café-au-lait spots. Normal Mongolian spot over sacrum (documented at birth). No signs of non-accidental injury.

ASSESSMENT:
3-month-old male presenting with irritability and poor feeding for 24 hours. Examination is largely reassuring:
  - Anterior fontanelle is open, soft, and flat — no signs of raised ICP.
  - No focal neurological deficit.
  - Head circumference tracking normally on growth chart — no macrocephaly.
  - No evidence of non-accidental injury on thorough examination.
  - Mild erythema of right TM — possible early acute otitis media, which would explain irritability and feeding difficulty (ear pain worsens with sucking).
  - Mild URI symptoms (nasal congestion, clear rhinorrhea) — sister recently started daycare.

Differential diagnosis (in order of likelihood):
  1. Early acute otitis media (most likely — explains irritability, poor feeding, mild URI prodrome)
  2. Viral upper respiratory infection with feeding difficulty
  3. Colic (though unusual to have such an acute change at 3 months)
  4. Urinary tract infection (need to exclude in febrile/irritable infants)
  5. Intracranial pathology (low probability given reassuring neuro exam, but must consider)

PLAN:
  - Bloods: FBC, CRP, blood culture — RESULTS: Hb 11.2, WBC 12.4 (mild leukocytosis), Plt 310, CRP 8 (mildly elevated, consistent with viral/bacterial infection)
  - Urine: Bag specimen for urinalysis and culture — RESULT: Clear, no leucocytes, no nitrites, no bacteria on dipstick. Culture pending.
  - I have a low threshold for imaging given the non-specific nature of the presentation in a young infant.
  - Requesting CT Head non-contrast to rule out intracranial pathology as a cause of irritability.
  - If CT is normal, will treat for presumed early AOM with oral amoxicillin and observe for 4-6 hours to ensure feeding improves before discharge.

Dr. Lisa Greenwood
Pediatric Emergency Medicine
Riverside Children's Hospital

===== PREVIOUS RADIOLOGY REPORTS =====

--- REPORT 1 ---
EXAMINATION: X-Ray Chest AP (Supine)
DATE: January 20, 2026
CLINICAL INDICATION: 6-week-old infant with cough and nasal congestion x 3 days. Afebrile. Rule out pneumonia.
ORDERING PHYSICIAN: Dr. M. Thompson (General Pediatrics)
ACCESSION: RAD-2026-00623

FINDINGS:
Heart: Normal size and configuration for age.
Thymus: Prominent but normal thymic shadow, creating a "sail sign" — this is a normal finding in a 6-week-old infant and should not be mistaken for mediastinal mass or cardiomegaly.
Lungs: Mild perihilar peribronchial thickening — may represent mild viral bronchiolitis vs normal prominent vascularity in an infant. No focal consolidation. No pleural effusion. No pneumothorax.
Bones: No fracture. Normal skeletal survey appearance for age.
Soft tissues: Unremarkable.

IMPRESSION:
1. No focal consolidation to suggest pneumonia.
2. Mild perihilar peribronchial thickening — likely viral in etiology given the clinical context. Consider bronchiolitis.
3. Prominent but normal thymic shadow.

RADIOLOGIST: Dr. Sarah Chen, MBBS FRANZCR
REPORTED: January 20, 2026

--- REPORT 2 ---
EXAMINATION: Ultrasound Hips (Bilateral) — Graf Method
DATE: January 5, 2026
CLINICAL INDICATION: Routine screening at 6 weeks. Breech presentation was documented at 34 weeks (subsequently turned to cephalic by 36 weeks). Family history: Father had childhood hip problems.
ORDERING PHYSICIAN: Dr. M. Thompson (General Pediatrics)
ACCESSION: RAD-2026-00098

TECHNIQUE: Real-time ultrasound of both hips performed using the Graf technique. Infant positioned in lateral decubitus. Both hips assessed at rest and with dynamic stress (Barlow and Ortolani maneuvers performed under ultrasound guidance).

FINDINGS:
Right hip:
  Alpha angle: 64° (normal >60°)
  Beta angle: 48° (normal <55°)
  Femoral head coverage: >50%
  Classification: Graf Type Ia (mature, normal)
  No subluxation or instability with dynamic stress.

Left hip:
  Alpha angle: 62° (normal >60°)
  Beta angle: 50° (normal <55°)
  Femoral head coverage: >50%
  Classification: Graf Type Ia (mature, normal)
  No subluxation or instability with dynamic stress.

IMPRESSION:
1. Normal bilateral hip ultrasound. Graf Type Ia bilaterally.
2. No evidence of developmental dysplasia of the hip.
3. No follow-up imaging required.

RADIOLOGIST: Dr. James Park, MBBS FRANZCR
REPORTED: January 5, 2026`,

  priorReports: ""
};

export const ORDER_KOWALSKI: ImagingOrder = {
  modality: ImagingModality.CT,
  bodyRegion: "Head",
  studyDescription: "CT Head non-contrast",
  contrast: ContrastType.NONE,
  clinicalIndication: "3-month-old infant with irritability and poor feeding x 24 hours. Open fontanelle. Neuro exam reassuring but non-specific presentation in young infant — requesting CT to rule out intracranial pathology.",
  orderingPhysician: "Dr. Lisa Greenwood",
  urgency: "URGENT",
  patientId: "patient_kowalski"
};


// ═══════════════════════════════════════════════════════════════
// EXPORTS: All patients and orders for the demo
// ═══════════════════════════════════════════════════════════════

export const ALL_PATIENTS: readonly PatientProfile[] = Object.freeze([
  PATIENT_ZHANG,
  PATIENT_PATEL,
  PATIENT_RIVERA,
  PATIENT_KOWALSKI,
]);

export const ALL_ORDERS: Readonly<Record<string, ImagingOrder>> = Object.freeze({
  patient_zhang: ORDER_ZHANG,
  patient_patel: ORDER_PATEL,
  patient_rivera: ORDER_RIVERA,
  patient_kowalski: ORDER_KOWALSKI,
});

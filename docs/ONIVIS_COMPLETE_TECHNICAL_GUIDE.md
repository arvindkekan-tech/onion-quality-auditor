# ONIVIS — Complete Technical Guide & System Manual

**ONIVIS** (Onion Intelligent Visual Inspection System) is an enterprise-grade, AI-assisted visual quality assessment and certification platform engineered for agricultural procurement centers, APMC mandis, cold storage facilities, and government procurement operations.

---

## 1. Executive Summary & Mission

Agricultural procurement of perishable commodities—specifically onions (*Allium cepa*)—has historically relied upon subjective visual inspection, leading to severe price realization disputes between farmers and procurement authorities, high lot rejection variance, and lack of verifiable audit trails.

ONIVIS delivers an automated, transparent, and auditable system founded on four principles:
1. **Real Computer Vision Pipeline**: Utilizes authentic YOLOv8 detection and deep defect classification trained on ground-truth onion images. Zero mock inference or synthetic detections.
2. **Strict Human Governance**: AI Recommends &rarr; Officer Reviews &rarr; Officer Decides &rarr; Evidence Recorded &rarr; Farmer Verifies. The AI never finalizes commercial certificates autonomously.
3. **Objective Standards-to-Evidence Separation**: Delineates optical surface evidence (rot, sprouting, caliber diameter) from destructive/physical tests (internal rot cut tests, electronic moisture probe, neck firmness penetrometer) in compliance with official APMC standards.
4. **Adaptive Intelligence & Farmer Transparency**: Preserves an immutable cryptographic audit trail of all officer overrides, recommends historical consensus for borderline cases without risky model retraining, and provides a public QR verification portal with an integrated dispute appeal mechanism for farmers.

---

## 2. System Overview & Technology Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend UI/UX** | React 19, TypeScript, Vite, Tailwind CSS, Radix UI | Mobile-first responsive UI, real-time bounding box canvas, camera capture with guidance overlays, dual-assessment comparison |
| **State & Data Fetching** | TanStack Query v5, Zustand | Optimistic mutations, cached audit responses, background polling of asynchronous ML inferences |
| **Backend API** | FastAPI, Python 3.11+, Pydantic v2 | Asynchronous ASGI server, OpenAPI 3.1 documentation, strict request/response validation |
| **AI/ML Engine** | PyTorch, Ultralytics YOLOv8, OpenCV, NumPy | Two-stage pipeline: Detection (`detection_model.pt`) & Classification (`best_classification_model.pt`), 500x500mm metric calibration |
| **Database & Persistence** | PostgreSQL / Supabase, SQLite3 fallback | Complete relational schema, Row-Level Security (RLS), verified feedback log, review requests storage |
| **Security & Auth** | Supabase Auth, JWT Bearer Tokens, Bcrypt | Role-based access control (Procurement Officer vs Inspector vs Auditor), tenant data isolation |
| **Document Generation** | ReportLab, PyMuPDF, QRCodegen | Cryptographically verifiable PDF inspection certificates embedded with high-resolution signed QR tokens |

---

## 3. High-Level System Architecture

```
                                  +---------------------------------------+
                                  |         ONIVIS Frontend (PWA)         |
                                  | React 19 + TypeScript + Tailwind CSS  |
                                  +-------------------+-------------------+
                                                      |
                                         HTTPS / REST | API Calls
                                                      v
                                  +---------------------------------------+
                                  |         ONIVIS Backend (FastAPI)      |
                                  |      Asynchronous ASGI Controller     |
                                  +---------+-------------------+---------+
                                            |                   |
                     +----------------------+                   +----------------------+
                     v                                                                 v
+---------------------------------------+                             +---------------------------------------+
|          Real ML Provider             |                             |           Storage & DB                |
|  - Pre-capture Quality Gate (Laplace) |                             |  - Supabase PostgreSQL (Production)  |
|  - YOLOv8 Detection (detection_model) |                             |  - SQLite3 DB Engine (Local Fallback) |
|  - Crop Defect Classifier             |                             |  - Secure Blob Storage (Local/Bucket) |
|  - Calibrated Metric Scaling (500mm)  |                             +---------------------------------------+
|  - AI Attention Queue Generator       |                                              |
|  - Explainability Engine (Why Grade)  |                                              v
+---------------------------------------+                             +---------------------------------------+
                     |                                                |      Verification & Transparency      |
                     v                                                |  - Public QR Authenticity Endpoint    |
+---------------------------------------+                             |  - Farmer Dispute Appeal System       |
|          Human Review Gate            |                             |  - Signed PDF Certificate Exporter    |
|  - Dual Assessment (AI vs Officer)    |                             +---------------------------------------+
|  - Individual Bulb Audit & Override   |
|  - Adaptive Consensus Insight         |
|  - Cryptographic Audit Trail Log      |
+---------------------------------------+
```

---

## 4. End-to-End Inspection Lifecycle

1. **Lot Intake & Initialization**:
   - Inspector initiates lot registration with mandatory metadata: Crop Variety (`Nashik Red`, `Garwa`, etc.), Lot Weight (kg), Procurement Center Location, and Farmer/Lot identifier.
2. **Optical Sampling & Framing**:
   - User places representative sample (typically 40–60 bulbs) on calibrated 500x500mm contrasting tray.
   - Real-time client camera guide validates framing, non-overlap, and lighting angle.
3. **Automated Image Quality Gate**:
   - Backend OpenCV algorithms compute:
     - Focus & Sharpness: Laplacian variance score (&ge; 50.0 threshold).
     - Lighting Uniformity: Multi-quadrant mean standard deviation (&le; 35.0 threshold).
     - Color Contrast: RMS pixel luminance deviation (&ge; 25.0 threshold).
     - Frame Geometry: Minimum 350x350px resolution coverage.
4. **Real AI ML Inference**:
   - **Stage 1 (Detection)**: YOLOv8 model localizes each onion bulb, generating normalized bounding boxes `[x1, y1, x2, y2]` and detection confidences.
   - **Stage 2 (Classification)**: High-resolution crops of localized bulbs are routed to the defect classifier (`healthy`, `rotten_damaged`, `sprouted`, `uncertain`).
   - **Stage 3 (Physical Caliber Estimation)**: Pixel dimensions are scaled relative to tray reference geometry to estimate physical diameter in millimeters.
5. **AI Recommendation & Attention Queue**:
   - Commercial grading engine computes initial defect ratio: `(Rotten + Sprouted) / Total`.
   - Assigns provisional grade: Grade A (&le; 5.0%), URS (5.1%–15.0%), or Rejected (> 15.0%).
   - Generates prioritized **AI Attention Queue** flagging uncertain classifications, low-confidence scores (< 65%), and borderline size calibers (38–42mm and 68–72mm).
   - Generates structured **Why This Grade?** quantitative narrative.
6. **Mandatory Human Review Gate**:
   - Inspector audits detected bulbs via interactive bounding box cards.
   - Overrides classifications where necessary (e.g., surface blemish vs deep rot).
   - Receives **Adaptive Review Intelligence** recommendations based on verified historical consensus.
   - Real-time recalculation engine dynamically updates lot grade, defect ratio, and explainability narrative.
7. **Certification & Issuance**:
   - Authorized officer enters digital sign-off and optional notes.
   - Certificate issued with immutable UUID and cryptographic QR verification token.
   - Audit trail freezes: initial AI prediction, officer override count, and exact timestamp.
8. **Public Verification & Farmer Rights**:
   - Any stakeholder (farmer, trader, auditor) scans QR code to access the public verification page.
   - Displays authentic APMC grade, complete standards-to-evidence matrix, and decision rationale.
   - Farmers have the right to file an administrative re-audit appeal via the integrated dispute form.

---

## 5. Deployment Guidelines

### Backend Configuration
Ensure the following production environment variables are configured:
```env
APP_ENV=production
ENABLE_REAL_ML=true
DETECTION_MODEL_PATH=models/detection_model.pt
CLASSIFICATION_MODEL_PATH=models/best_classification_model.pt
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CORS_ORIGINS=https://onivis.app,http://localhost:5173
CALIBRATION_WINDOW_WIDTH_MM=500.0
CALIBRATION_WINDOW_HEIGHT_MM=500.0
```

### Starting the Services
- **Backend**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
  ```
- **Frontend**:
  ```bash
  npm run build
  npm run preview -- --host 0.0.0.0 --port 5173
  ```

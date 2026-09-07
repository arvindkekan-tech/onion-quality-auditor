# ONIVIS — Technical Handover Document

## 1. System Overview
ONIVIS is an enterprise-grade agricultural computer vision and quality inspection system engineered for Agricultural Produce Market Committees (APMC), Mandis, and NAFED procurement centres. It transforms qualitative, subjective visual appraisal into objective, auditable, and transparent quality certification.

---

## 2. Repository Layout & Architecture

### Backend (`C:\Users\ARVIND\Documents\onion-quality-auditor-2`)
- `backend/app/main.py`: FastAPI application entry point, CORS configuration, exception handlers, and static image mounting.
- `backend/app/core/config.py`: Central settings, model resolution, environment variables, and calibration dimensions.
- `backend/app/core/auth.py`: JWT generation, PBKDF2 password hashing, and user authentication dependencies.
- `backend/app/api/`:
  - `auth.py`: Registration, login, and session profile endpoints.
  - `inspections.py`: Inspection CRUD, multi-image upload, OpenCV quality checking, recalculation, and review submission.
  - `analysis.py`: AI inference orchestration and polling status.
  - `certificates.py`: Certificate retrieval, official ReportLab PDF generation, and public QR verification.
- `backend/app/analysis_provider.py`: Model loader and normalizer bridging YOLO detection and classification.
- `backend/app/grading.py`: Deterministic APMC / Agmark commercial grading thresholds, AI Attention Queue builder, and "Why This Grade?" explainability narrative generator.
- `backend/app/store.py` & `backend/app/local_store.py`: ACID dual-layer persistence (Supabase PostgreSQL + local SQLite fallback).
- `backend/app/pdf.py`: Official tamper-evident PDF certificate generator with QR codes.

### Frontend (`C:\Users\ARVIND\Documents\onion-quality-auditor-frontend`)
- `src/features/inspection-results/`: Inspection Results screen displaying commercial grade, AI Attention Queue, and Why This Grade breakdown.
- `src/features/human-review/`: Officer dual-assessment UI, individual bulb override dialog, and adaptive intelligence recommendation panel.
- `src/features/qr-verification/`: Public farmer transparency verification page with interactive re-audit dispute appeal submission.
- `src/components/shared/`: Reusable components including `StandardsMatrix.tsx` and `WhyThisGradeCard.tsx`.
- `src/lib/api/`: API clients, Zod schemas, and TanStack Query hooks.

---

## 3. How to Safely Maintain & Extend

### Modifying Grading Thresholds
- Locate `backend/app/grading.py`.
- Constants `GRADE_A_DEFECT_THRESHOLD` (0.05) and `URS_DEFECT_THRESHOLD` (0.15) define commercial tiers. Modifying these updates both grading logic and the explainability engine.

### Updating AI Models
- Baseline models are stored in `backend/models/`:
  - `detection_model.pt`: YOLOv8 object detector for locating onion bulbs.
  - `best_classification_model.pt`: Defect classifier categorizing crops into Healthy, Rotten/Damaged, Sprouted, or Uncertain.
- Always validate new candidate models against ground truth trays before deployment.

### Running Local Development
```bash
# Backend (Port 8000)
cd C:\Users\ARVIND\Documents\onion-quality-auditor-2\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend (Port 5173)
cd C:\Users\ARVIND\Documents\onion-quality-auditor-frontend
npm run dev -- --port 5173 --host 127.0.0.1
```\n
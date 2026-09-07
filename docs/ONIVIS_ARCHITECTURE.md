# ONIVIS — System Architecture & Component Design

This document details the architectural design, communication protocols, state models, and security boundaries of the **ONIVIS** platform.

---

## 1. Architectural Philosophy & Design Principles

ONIVIS is designed around four core architectural tenets:
1. **Decoupled ML & Domain Rules**: Machine learning models produce raw detections, confidences, and geometric attributes. All business grading logic, APMC threshold comparisons, and attention queue determinations occur in clean, isolated domain modules (`grading.py`).
2. **Dual Assessment Contract**: Initial AI recommendations are perpetually isolated from the final human officer assessment. The system captures both vectors simultaneously, enabling auditing and dispute analysis.
3. **Resilient Persistence with Zero-Config Fallback**: In cloud deployments with configured Supabase credentials, the system uses managed PostgreSQL with Row-Level Security. In disconnected or edge environments without Supabase credentials, it falls back to a self-healing local SQLite database (`onivis_local.db`) with identical schema semantics.
4. **Sub-second Client Interaction**: Heavy ML inference is asynchronous and polled via background workers; subsequent officer overrides, caliber recalibrations, and explainability updates occur in sub-10ms memory recalculations.

---

## 2. Component Decomposition

### 2.1 Frontend Architecture (`frontend/arvind`)
The frontend is a Progressive Web Application (PWA) built with **React 19**, **TypeScript**, and **Tailwind CSS**.

- **Routing & Navigation (`src/app/router.tsx`)**:
  - `ProtectedRoute` checks Supabase authentication token.
  - Linear inspection step layout: Capture &rarr; Quality Check &rarr; Analysis &rarr; Results &rarr; Human Review &rarr; Certificate.
  - Public verification route (`/verify/:token`) accessible without credentials.
- **State Management & Data Layer**:
  - `TanStack Query (React Query v5)`: Handles caching, optimistic updates, background polling, and cache invalidation.
  - `Zustand (`inspectionDraftStore`)`: Retains active lot capture artifacts, image blobs, and temporary camera previews across step transitions.
- **UI Components**:
  - `WhyThisGradeCard`: Quantitative threshold visualization with dynamic narrative breakdown.
  - `StandardsMatrix`: Dual-tier APMC compliance table distinguishing optical evidence from physical testing.
  - `InspectionStepLayout`: Step indicator enforcing the procurement workflow.

### 2.2 Backend Architecture (`backend/rutuja`)
The backend is an asynchronous REST service built with **FastAPI** and **Pydantic v2**.

- **Core Application Server (`app/main.py`)**:
  - Configures CORS middleware for allowed frontend origins.
  - Mounts API routers (`/api/v1` and unversioned fallbacks for backward compatibility).
  - Configures static file serving for local image uploads and annotated visualizations.
- **Domain Grading Engine (`app/grading.py`)**:
  - Pure functional algorithms calculating commercial grade (`Grade A`, `URS`, `Rejected`).
  - Generates the **AI Attention Queue** based on uncertainty, low confidence, and diameter boundaries.
  - Produces structured explainability narratives.
  - Builds the **Standards-to-Evidence Matrix**.
- **Data Persistence Layer (`app/store.py` & `app/local_store.py`)**:
  - Abstract interface routing operations between Supabase REST client and local SQLite connection pool.
  - Handles automated table migrations (`verified_feedback`, `review_requests`, `attention_queue`).
  - Auto-logs verified officer corrections into feedback table for adaptive intelligence.

---

## 3. Data Flow & Communication Sequence

```
User / Camera           Frontend UI           FastAPI Backend           ML Inference Pipeline       Storage / DB
     |                       |                       |                            |                      |
     |--- Capture Image ---->|                       |                            |                      |
     |                       |--- POST /images ----->|                            |                      |
     |                       |                       |------------------------------------ Save Image -->|
     |                       |<-- Image ID ----------|                            |                      |
     |                       |                       |                            |                      |
     |                       |--- POST /quality ---->|                            |                      |
     |                       |                       |--- Laplace / Contrast ---->|                      |
     |                       |<-- Quality Checks ----|                            |                      |
     |                       |                       |                            |                      |
     |                       |--- POST /analyze ---->|                            |                      |
     |                       |                       |--- Background Task ------->|                      |
     |                       |<-- Status: Processing-|                            |                      |
     |                       |                       |                            |-- YOLO Detection --->|
     |                       |                       |                            |-- Defect Classifier->|
     |                       |                       |                            |-- Metric Scaling --->|
     |                       |                       |                            |-- Build Matrix ----->|
     |                       |--- Poll Status ------>|                            |                      |
     |                       |<-- Status: Completed -|<-- Normalized Results -----|                      |
     |                       |                       |                                                   |
     |                       |--- GET /results ----->|                                                   |
     |                       |<-- Results Data ------|-------------------------------- Fetch Results --->|
     |                       |    (Detections,       |                                                   |
     |                       |     Attention Queue,  |                                                   |
     |                       |     Matrix, Grade)    |                                                   |
     |                       |                       |                                                   |
     |--- Audit & Override ->|                       |                                                   |
     |                       |--- POST /recalculate->|                                                   |
     |                       |<-- Dynamic Grade -----|-- Re-compute in memory --->|                      |
     |                       |    & Narrative        |                                                   |
     |                       |                       |                                                   |
     |--- Final Approve ---->|--- PATCH /review ---->|                                                   |
     |                       |                       |-- Freeze Dual Track ----------------------------->|
     |                       |                       |-- Insert Verified Feedback ---------------------->|
     |                       |                       |-- Issue Cryptographic Certificate --------------->|
     |                       |<-- Certificate ID ----|                                                   |
```

---

## 4. Security, Tenancy & Governance Model

1. **Role-Based Access Control (RBAC)**:
   - **Procurement Officer**: Full authority to conduct inspections, override AI classifications, sign certificates, and review farmer appeals.
   - **Sampling Assistant**: Authorized to take photos, perform quality checks, and record lot weights.
   - **Auditor / Vigilance Officer**: Read-only access to immutable audit timelines, raw vs annotated images, and override logs.
   - **Public Stakeholder / Farmer**: Authenticated via single-use QR token to view specific inspection certificate and submit re-audit disputes.
2. **Cryptographic Certificate Verification**:
   - Each certificate is assigned an unpredictable 32-character hex QR token (`secrets.token_urlsafe(32)`).
   - Public endpoint `/api/v1/verify/{token}` resolves authentic certification status without exposing private tenant records.
3. **Adaptive Review Intelligence Safety**:
   - Historical officer corrections stored in `verified_feedback` provide statistical advisory context only.
   - The production YOLO weights are **never automatically mutated or retrained in-place**, eliminating model poisoning and drift risks.

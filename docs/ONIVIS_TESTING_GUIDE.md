# ONIVIS — Verification, Quality Assurance & Testing Guide

This guide establishes the comprehensive test suite, automated verification procedures, and release gate criteria for the **ONIVIS** platform.

---

## 1. Testing Philosophy & Standards

ONIVIS employs a strict zero-mock testing protocol for all release verifications:
1. **Real Image Execution**: Automated tests utilize actual photographic tray samples from the onion dataset.
2. **Immutable Traceability**: Verification must prove that every officer decision writes an immutable audit record and recalculates commercial grades in real time.
3. **Two-Pass Release Gate**: The platform must pass the complete test suite twice—once in standard execution, followed by a clean service restart and re-execution to verify persistence durability and zero startup side-effects.

---

## 2. Backend Automated Test Suite (Pytest)

The backend test suite comprises **26 targeted test cases** organized across 6 test modules:

| Test Module | Coverage & Invariants |
| :--- | :--- |
| `test_inspection_flow.py` | Full inspection lifecycle: create, image upload, quality check, analysis polling, review submission, certificate generation, QR verify, and deletion cascade. |
| `test_attention_adaptive_and_transparency.py` | AI Attention Queue generation, Why This Grade recalculation, adaptive consensus insight retrieval from `verified_feedback`, and farmer review dispute submission. |
| `test_real_ml_integration.py` | Production YOLOv8 detection & classification pipeline, commercial grade threshold boundaries (Grade A / URS / Rejected), zero detection fallback handling, and local SQLite persistence fallback. |
| `test_multi_image_and_overrides.py` | Multi-tray sample aggregation, individual bulb overrides, and real-time recalculation synchronization. |
| `test_auth_and_isolation.py` | User signup/login, multi-tenant data isolation, and password reset flows. |
| `test_real_pdf_and_quality.py` | PDF certificate generation, signed QR code embedding, and pre-capture image quality checks (Laplacian focus, quadrant lighting uniformity, contrast). |

### Running Backend Tests
Execute within `c:\Users\ARVIND\Documents\onion-quality-auditor-2`:
```bash
pytest -v
```
*Requirement*: **26/26 tests must pass with 0 failures.**

---

## 3. Frontend Static Verification & Quality Gates

The frontend enforces strict linting, formatting, and TypeScript compilation checks:

1. **TypeScript Strict Typechecking**:
   ```bash
   npx tsc --noEmit
   ```
   *Requirement*: Exits with code 0 (zero compiler errors).

2. **Oxlint High-Performance Linter**:
   ```bash
   npm run lint
   ```
   *Requirement*: Exits with code 0 (zero linting errors).

3. **Vite Production Build**:
   ```bash
   npm run build
   ```
   *Requirement*: Generates production bundles in `dist/` cleanly.

---

## 4. End-to-End Browser QA Automation

Real browser testing is automated using headless/headed Chromium browser runners (Playwright / Puppeteer):

- **Script Path**: `scratch/browser_full_release_qa.cjs`
- **Workflow Verified**:
  1. Login as authorized procurement officer.
  2. Create lot intake record (`Nashik Red`, 500kg, Lasalgaon Mandi).
  3. Upload real ground-truth tray sample image.
  4. Perform pre-analysis optical quality gate check.
  5. Run real YOLOv8 detection and defect classification.
  6. Verify results screen: commercial grade, total counts, bounding box overlays, physical diameter estimations, AI Attention Queue, and Standards Matrix.
  7. Transition to Human Review: verify Dual Assessment cards, filter tabs (All, Attention, Healthy, Defects), select an uncertain bulb, observe Adaptive Review Intelligence recommendation, apply override, and verify instant recalculation.
  8. Finalize review & issue certificate.
  9. Download cryptographic PDF and verify embedded QR code.
  10. Access public QR verification portal (`/verify/{token}`), confirm authentic status, and submit a farmer re-audit dispute appeal.
  11. Verify dashboard metrics update and reflect completed inspection.

---

## 5. Two-Pass Release Gate Protocol

To achieve final release certification:

```
+-----------------------------------------------------------+
| PASS 1: Execution                                         |
| 1. Run backend pytest suite (26/26 passing)               |
| 2. Run frontend typecheck & build (0 errors)              |
| 3. Execute full automated browser QA flow                 |
| 4. Capture and store verification screenshots             |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| CLEAN RESTART: Server Bounce                              |
| 1. Gracefully terminate backend and frontend processes    |
| 2. Re-initialize services from cold start                 |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| PASS 2: Cold-Start Re-Verification                        |
| 1. Re-run backend test suite on cold database             |
| 2. Re-run browser QA flow against restarted services      |
| 3. Verify database durability & zero orphaned state       |
+-----------------------------------------------------------+
```

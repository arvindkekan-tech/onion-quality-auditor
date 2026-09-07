# ONIVIS — Feature to Implementation Traceability Map

This matrix provides complete traceability between product capabilities, backend implementation files, frontend components, and automated test cases.

---

## 1. Traceability Matrix

| Capability / Feature | Backend Implementation | Frontend Implementation | Automated Verification Tests |
| :--- | :--- | :--- | :--- |
| **Real ML YOLO Detection** | `app/real_ml.py` (`RealYoloPipeline.detect`) | `features/ai-analysis/AiAnalysisPage.tsx` | `test_real_ml_integration.py::test_real_provider_normalizes_real_ml_result` |
| **Defect Classification** | `app/real_ml.py` (`RealYoloPipeline.classify`) | `features/inspection-results/InspectionResultsPage.tsx` | `test_real_ml_integration.py::test_real_provider_selection_uses_real_when_enabled` |
| **Image Quality Gate (Laplace/Lighting)** | `app/api/inspections.py` (`check_image_quality`) | `features/image-quality-check/ImageQualityCheckPage.tsx` | `test_real_pdf_and_quality.py::test_image_quality_check_metrics` |
| **Physical Size Scaling (500x500mm)** | `app/real_ml.py` (`estimate_sizes_from_detections`) | `features/inspection-results/InspectionResultsPage.tsx` | `test_real_ml_integration.py::test_commercial_grading_thresholds` |
| **AI Attention Queue** | `app/grading.py` (`build_attention_queue`) | `features/inspection-results/InspectionResultsPage.tsx`, `HumanReviewPage.tsx` | `test_attention_adaptive_and_transparency.py::test_attention_queue_and_standards_matrix` |
| **Standards-to-Evidence Matrix** | `app/grading.py` (`build_standards_matrix`) | `components/shared/StandardsMatrix.tsx` | `test_attention_adaptive_and_transparency.py::test_attention_queue_and_standards_matrix` |
| **"Why This Grade?" Explainability** | `app/grading.py` (`generate_why_this_grade`) | `components/shared/WhyThisGradeCard.tsx` | `test_attention_adaptive_and_transparency.py::test_why_this_grade_recalculation` |
| **Individual Bulb Audit & Overrides** | `app/api/inspections.py` (`recalculate_inspection`) | `features/human-review/HumanReviewPage.tsx` | `test_multi_image_and_overrides.py::test_multi_image_aggregation_and_overrides` |
| **Adaptive Review Intelligence** | `app/local_store.py` (`get_adaptive_recommendation`) | `features/human-review/HumanReviewPage.tsx` (Override Modal) | `test_attention_adaptive_and_transparency.py::test_adaptive_review_intelligence_and_farmer_request` |
| **Cryptographic PDF Certificate** | `app/pdf.py` (`generate_certificate_pdf`) | `features/certificates/CertificatePage.tsx` | `test_real_pdf_and_quality.py::test_pdf_certificate_generation` |
| **Public QR Authenticity Verification** | `app/api/certificates.py` (`verify_certificate`) | `features/qr-verification/QrVerificationPage.tsx` | `test_inspection_flow.py::test_full_inspection_flow` |
| **Farmer Dispute Appeal Flow** | `app/api/inspections.py` (`request_farmer_review`) | `features/qr-verification/QrVerificationPage.tsx` (Appeal Modal) | `test_attention_adaptive_and_transparency.py::test_adaptive_review_intelligence_and_farmer_request` |
| **Multi-Tenant User Isolation** | `app/api/auth.py`, `app/local_store.py` | `features/auth/ProtectedRoute.tsx` | `test_auth_and_isolation.py::test_user_data_isolation` |
| **Dual Persistence Engine (Supabase/SQLite)**| `app/store.py`, `app/local_store.py` | Transparent to client | `test_real_ml_integration.py::test_local_store_sqlite_fallback` |

---

## 2. API Route & Contract Reference

```
POST   /api/v1/inspections                               -> Create lot intake record
GET    /api/v1/inspections                               -> List inspections (newest first, tenant-filtered)
DELETE /api/v1/inspections/{id}                          -> Delete lot with cascade removal
POST   /api/v1/inspections/{id}/images                   -> Upload sample photograph
POST   /api/v1/inspections/{id}/images/{imgId}/quality  -> Automated optical quality check
POST   /api/v1/inspections/{id}/analyze                  -> Trigger background AI pipeline
GET    /api/v1/inspections/{id}/analysis-status          -> Query polling status & progress
GET    /api/v1/inspections/{id}/results                  -> Fetch full AI inspection results
POST   /api/v1/inspections/{id}/recalculate              -> Sub-millisecond grade recalculation
GET    /api/v1/inspections/{id}/adaptive-recommendations -> Fetch verified consensus insights
PATCH  /api/v1/inspections/{id}/review                   -> Final officer sign-off & certificate issuance
GET    /api/v1/certificates/{id}                         -> Fetch issued certificate details
GET    /api/v1/certificates/{id}/pdf                     -> Download signed ReportLab PDF
GET    /api/v1/verify/{token}                            -> Public authenticity & transparency endpoint
POST   /api/v1/inspections/{id}/request-review           -> Submit farmer dispute appeal ticket
GET    /api/v1/inspections/{id}/review-requests          -> Fetch registered appeal tickets
```

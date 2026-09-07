# ONIVIS — Test Evidence & Verification Log

**Environment:** Windows Local Test Environment / Headless Chrome  
**Test Date:** September 7, 2026  

---

## 1. Automated Unit & Integration Tests (`pytest`)
```
backend/tests/test_attention_adaptive_and_transparency.py::test_attention_queue_and_standards_matrix PASSED
backend/tests/test_attention_adaptive_and_transparency.py::test_why_this_grade_recalculation PASSED
backend/tests/test_attention_adaptive_and_transparency.py::test_adaptive_review_intelligence_and_farmer_request PASSED
backend/tests/test_auth_and_isolation.py::test_auth_signup_login_flow PASSED
backend/tests/test_auth_and_isolation.py::test_user_data_isolation PASSED
backend/tests/test_auth_and_isolation.py::test_password_reset_flow PASSED
backend/tests/test_inspection_flow.py::test_health_and_root PASSED
backend/tests/test_inspection_flow.py::test_full_inspection_flow PASSED
backend/tests/test_inspection_flow.py::test_analysis_status_uses_same_persisted_inspection_id PASSED
backend/tests/test_inspection_flow.py::test_inspection_history_is_newest_first_and_maps_analysis PASSED
backend/tests/test_inspection_flow.py::test_inspection_history_exposes_resume_state PASSED
backend/tests/test_inspection_flow.py::test_png_upload_and_error_handling PASSED
backend/tests/test_inspection_flow.py::test_certificate_and_verify_errors PASSED
backend/tests/test_inspection_flow.py::test_delete_inspection_removes_storage_and_persisted_record PASSED
backend/tests/test_inspection_flow.py::test_delete_missing_inspection_returns_not_found PASSED
backend/tests/test_inspection_flow.py::test_analysis_provider_failure_persists_failed_status PASSED
backend/tests/test_inspection_flow.py::test_unversioned_prefix_matches_frontend_default_base_url PASSED
backend/tests/test_inspection_flow.py::test_cors_allows_frontend_origins PASSED
backend/tests/test_inspection_flow.py::test_review_rejection_marks_inspection_rejected_without_certificate PASSED
backend/tests/test_multi_image_and_overrides.py::test_multi_image_aggregation_and_overrides PASSED
backend/tests/test_real_ml_integration.py::test_real_provider_normalizes_real_ml_result PASSED
backend/tests/test_real_ml_integration.py::test_real_provider_selection_uses_real_when_enabled PASSED
backend/tests/test_real_ml_integration.py::test_commercial_grading_thresholds PASSED
backend/tests/test_real_ml_integration.py::test_zero_detection_summary_and_grade PASSED
backend/tests/test_real_ml_integration.py::test_local_store_sqlite_fallback PASSED
backend/tests/test_real_pdf_and_quality.py::test_pdf_certificate_generation PASSED

26 passed, 2 warnings in 5.20s
```

---

## 2. Release Gates Test Harness Execution
```
[TEST] Root API OK: ONIVIS API is running
[TEST] Health API OK: ok
[TEST] Officer Auth OK: role=OFFICER, email=officer_803803@onivis.gov.in
[TEST] Farmer Auth OK: role=FARMER, email=farmer_803803@apmc.org
[TEST] Inspection Isolation Created: A=insp-ecdb2ae1, B=insp-e03790a6
[TEST] Inspection Data Isolation Verified!
[TEST] Uploading Image A (8a6aa57f-8030-4c10-b3de-eb644d3261ae.png) to insp-ecdb2ae1...
[TEST] Uploading Image B (sample_b_unhealthy.jpg) to insp-ecdb2ae1...
[TEST] Image 1 Quality Check: passed=True, score=94.0
[TEST] Image 2 Quality Check: passed=True, score=89.0
[TEST] Triggering AI Analysis on insp-ecdb2ae1...
[TEST] YOLO ML Inference completed successfully!
[TEST] AI Results: Grade=Rejected, Total=65 (Healthy=53, Rot=9, Sprout=2, Unc=1)
[TEST] Multi-Tray Verification: Tray 1=53 + Tray 2=12 = 65 (Exact match, NO double counting)
[TEST] Calibrated Sizing: avg_diameter=66.54mm, sample_count=65
[TEST] AI Attention Queue: 7 item(s) flagged
[TEST] Standards-to-Evidence Matrix: 7 parameters (4 Camera-Measurable, 3 Lab-Only)
[TEST] Why This Grade narrative generated dynamically
[TEST] Adaptive Intelligence fetched: 11 recommendations
[TEST] Overriding ONLY ONE bulb: #51 to 'healthy' with reason
[TEST] Officer Recalculation: recalculated_grade=Rejected, overrideCount=1
[TEST] Inspection Approved & Certificate Issued: cert-260c9d5e
[TEST] Official Certificate Data: ID=cert-260c9d5e, Grade=Rejected, Token=qr-cert-260c9d5e
[TEST] Official PDF Certificate Verified: 5530 bytes generated!
[TEST] Public QR Verification Authenticated: valid=True, grade=Rejected (Zero PII leaked)
[TEST] Farmer Public QR View Verified!
[TEST] Farmer Role Restriction Enforced: Unauthorized override rejected with HTTP 403
[TEST] Farmer Dispute Appeal Registered: appeal_id=req-58c2ebd1, status=PENDING
[TEST] ALL 15-29 MASTER RELEASE GATES PASSED CLEANLY!
```

---

## 3. Chrome Visual Regression Verification
All screenshots captured in `scratch/screenshots/`:
- `31_landing_page.png`: Welcome screen with feature overview and APMC branding.
- `32_login_page.png`: Role-based authentication modal.
- `33_dashboard_authenticated.png`: Inspection dashboard showing active batches.
- `34_new_inspection_form.png`: Batch registration form with mandatory location and variety fields.
- `35_multi_tray_captured.png`: Two sample trays uploaded and displayed.
- `36_opencv_quality_checked.png`: Laplacian sharpness and lighting uniformity check.
- `37_results_yolo_analyzed.png`: Full AI assessment with attention items and Why This Grade cards.
- `38_review_dual_assessment.png`: Human Review side-by-side assessment comparison.
- `39_override_dialog.png`: Bulb override modal with Adaptive Consensus recommendations.
- `40_review_after_override.png`: Real-time recalculated metrics following officer correction.
- `41_certificate_issued.png`: Issued digital certificate with QR code and PDF download.
- `42_public_qr_verified.png`: Public authenticity verification page.
- `42b_farmer_appeal_registered.png`: Farmer re-audit dispute appeal registration dialog.
- `43_profile_page.png`: User profile and role verification.
- `44_logged_out_welcome.png`: Secure logout state.\n
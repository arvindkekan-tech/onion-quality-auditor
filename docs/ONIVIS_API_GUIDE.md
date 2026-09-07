# ONIVIS — REST API Specification & Integration Guide

The ONIVIS backend exposes an OpenAPI 3.1 compliant asynchronous REST interface mounted at `/api/v1` (with root backward-compatibility mirrors for legacy clients).

---

## 1. Authentication & Security Headers

| Header | Description | Required By |
| :--- | :--- | :--- |
| `Authorization: Bearer <token>` | Supabase JWT or local HMAC session token | Authenticated inspector & officer routes |
| `Content-Type: application/json` | Request payload format | JSON mutation endpoints |
| `Content-Type: multipart/form-data` | Image binary upload format | `/images` upload endpoints |

---

## 2. Inspections & Workflow Endpoints

### 2.1 Create Inspection
- **Method & Route**: `POST /api/v1/inspections`
- **Request Body**:
  ```json
  {
    "variety": "Nashik Red",
    "weightKg": 500.0,
    "location": "Lasalgaon Mandi Centre 1"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "variety": "Nashik Red",
    "weightKg": 500.0,
    "location": "Lasalgaon Mandi Centre 1",
    "createdAt": "2026-09-07T12:00:00Z",
    "status": "draft"
  }
  ```

### 2.2 Upload Sample Image
- **Method & Route**: `POST /api/v1/inspections/{id}/images`
- **Form Data**: `file: <binary image>` (PNG, JPEG, WebP)
- **Response (200 OK)**:
  ```json
  {
    "id": "img_01f8",
    "url": "/uploads/img_01f8.png",
    "uploadedAt": "2026-09-07T12:01:00Z"
  }
  ```

### 2.3 Automated Image Quality Check
- **Method & Route**: `POST /api/v1/inspections/{id}/images/{imageId}/quality-check`
- **Response (200 OK)**:
  ```json
  {
    "imageId": "img_01f8",
    "passed": true,
    "score": 92.0,
    "issues": [],
    "checks": [
      {
        "key": "focus",
        "label": "Focus & Sharpness",
        "score": 88.0,
        "passed": true,
        "explanation": "Laplacian variance 142.5 >= threshold 50.0"
      },
      {
        "key": "lighting",
        "label": "Lighting Uniformity",
        "score": 94.0,
        "passed": true,
        "explanation": "Quadrant standard deviation 12.3 <= 35.0"
      }
    ]
  }
  ```

### 2.4 Trigger AI Analysis
- **Method & Route**: `POST /api/v1/inspections/{id}/analyze`
- **Response (200 OK)**:
  ```json
  {
    "inspectionId": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "status": "processing",
    "progress": 10.0,
    "message": "AI analysis started in background"
  }
  ```

### 2.5 Get Analysis Status
- **Method & Route**: `GET /api/v1/inspections/{id}/analysis-status`
- **Response (200 OK)**:
  ```json
  {
    "inspectionId": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "status": "completed",
    "progress": 100.0,
    "message": "Analysis completed"
  }
  ```

### 2.6 Get Inspection Results
- **Method & Route**: `GET /api/v1/inspections/{id}/results`
- **Response (200 OK)**:
  ```json
  {
    "inspectionId": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "grade": "Grade A",
    "confidence": 0.942,
    "totalOnions": 53,
    "healthyCount": 50,
    "rottenDamagedCount": 1,
    "sproutedCount": 1,
    "uncertainCount": 1,
    "annotatedImageUrl": "/uploads/annotated_c3933c04.png",
    "whyThisGrade": {
      "sampleSize": 53,
      "healthyCount": 50,
      "healthyPct": 94.3,
      "defectsCount": 2,
      "defectPct": 3.8,
      "grade": "Grade A",
      "gradeCode": "grade_a",
      "narrative": "From an optical sample of 53 onion bulb(s), 50 (94.3%) were assessed as healthy..."
    },
    "attentionQueue": [
      {
        "id": "att_unc_onion_53",
        "onionId": "onion_53",
        "severity": "high",
        "title": "Uncertain Bulb #53",
        "reason": "AI model could not definitively classify defect type or sound tissue.",
        "recommendation": "Inspect bulb directly in Human Review and assign definitive classification."
      }
    ],
    "standardsMatrix": [ ... ]
  }
  ```

---

## 3. Human Review, Recalculation & Adaptive Intelligence

### 3.1 In-Memory Grade Recalculation
- **Method & Route**: `POST /api/v1/inspections/{id}/recalculate`
- **Request Body**:
  ```json
  {
    "onionDecisions": [
      {
        "onionId": "onion_53",
        "aiClass": "uncertain",
        "officerClass": "healthy",
        "reason": "Superficial peel only, sound flesh"
      }
    ]
  }
  ```
- **Response (200 OK)**: Returns updated `RecalculateResponse` with adjusted defect ratio, recalculated `whyThisGrade`, and updated grade.

### 3.2 Fetch Adaptive Review Recommendations
- **Method & Route**: `GET /api/v1/inspections/{id}/adaptive-recommendations`
- **Response (200 OK)**:
  ```json
  {
    "recommendations": {
      "onion_53": {
        "hasAdaptiveInsight": true,
        "similarCasesCount": 14,
        "correctedCount": 12,
        "fromClass": "uncertain",
        "toClass": "healthy",
        "insightText": "In 14 previously verified similar cases, officers reclassified this pattern to healthy in 85.7% of audits.",
        "recommendation": "Verify surface peel before confirming defect.",
        "commonReasons": ["Superficial skin peel, no shoot"]
      }
    }
  }
  ```

### 3.3 Final Human Review Submission
- **Method & Route**: `PATCH /api/v1/inspections/{id}/review`
- **Request Body**:
  ```json
  {
    "approved": true,
    "notes": "Lot meets Grade A export quality after officer verification.",
    "overrideGrade": "Grade A",
    "onionDecisions": [ ... ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "inspectionId": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "certificateId": "cert_981aef12",
    "approved": true,
    "finalGrade": "Grade A",
    "overrideCount": 1
  }
  ```

---

## 4. Certificates, Public Verification & Farmer Transparency

### 4.1 Verify QR Token
- **Method & Route**: `GET /api/v1/verify/{token}`
- **Authentication**: None (Public endpoint).
- **Response (200 OK)**:
  ```json
  {
    "valid": true,
    "message": "Certificate is valid and has not been revoked.",
    "certificate": {
      "id": "cert_981aef12",
      "grade": "Grade A",
      "issuedAt": "2026-09-07T12:05:00Z",
      "batchLabel": "Nashik Red - Lot 104",
      "sampleSize": 53,
      "confidence": 0.942,
      "overrideCount": 1
    },
    "farmerTransparency": {
      "lotId": "Nashik Red - Lot 104",
      "verifiedStatus": "AUTHENTIC - APMC APPROVED",
      "aiGrade": "Grade A",
      "finalGrade": "Grade A"
    },
    "whyThisGrade": { ... },
    "standardsMatrix": [ ... ]
  }
  ```

### 4.2 Submit Farmer Review / Dispute Request
- **Method & Route**: `POST /api/v1/inspections/{id}/request-review`
- **Request Body**:
  ```json
  {
    "farmerName": "Suresh Patil",
    "phoneNumber": "+91 98220 12345",
    "reasonCategory": "Bulb Size / Caliber Disagreement",
    "comments": "Request optical recalibration or physical secondary composite sampling."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "rev_req_e07f",
    "inspectionId": "c3933c04-f81d-44a6-bebe-08f3348126b8",
    "farmerName": "Suresh Patil",
    "reasonCategory": "Bulb Size / Caliber Disagreement",
    "status": "PENDING",
    "createdAt": "2026-09-07T12:10:00Z"
  }
  ```

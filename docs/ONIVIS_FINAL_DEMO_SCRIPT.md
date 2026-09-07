# ONIVIS — Live Demonstration & Evaluator Walkthrough Script

**Duration**: 5–7 Minutes  
**Target Audience**: Smart India Hackathon (SIH) Evaluators, APMC Mandi Directors, Procurement Officers, Agricultural Engineers.

---

## 1. Scene Setup & Pre-Requisites
- Frontend URL: `http://localhost:5173` (or production URL).
- Backend API: `http://localhost:8000` (FastAPI operational).
- Test Image Asset: `backend/uploads/8a6aa57f-8030-4c10-b3de-eb644d3261ae.png` (53-bulb real tray sample).
- Officer Persona: Authorized APMC Procurement Officer.

---

## 2. Minute-by-Minute Demonstration Flow

### Minute 0:00 – 1:00: Problem Context & Dashboard
1. **Presenter Statement**:
   > *"India produces over 30 million metric tons of onions annually, yet 20% to 30% of post-harvest value is lost to subjective quality disputes, uncalibrated grading, and lack of auditable evidence. Welcome to ONIVIS—the AI-Assisted Onion Visual Inspection Platform."*
2. **Action**: Open Dashboard (`/dashboard`).
3. **Highlight**:
   - Procurement statistics: Today's inspections, completed batches, pending human reviews, and historical grade breakdown.
   - Clean, professional agricultural theme designed for field tablets and rugged mobile devices.

### Minute 1:00 – 2:00: Lot Intake & Automated Quality Gate
1. **Action**: Click **"Start New Inspection"** (`/inspections/new`).
2. **Form Entry**:
   - Crop Variety: `Nashik Red (Garwa)`
   - Lot Weight: `500 kg`
   - Location: `Lasalgaon APMC Sub-Yard 3`
3. **Capture / Upload**:
   - Upload real tray sample (`8a6aa57f-8030-4c10-b3de-eb644d3261ae.png`).
4. **Automated Quality Gate**:
   - Show instantaneous OpenCV pre-check metrics: Focus & Sharpness (Laplacian score: 142.5), Lighting Uniformity (variance: 12.1), and Color Contrast.
   - **Key Point**: Explain that blurry or poorly lit images are rejected *before* consuming ML inference resources.

### Minute 2:00 – 3:30: Real AI YOLO Analysis & Explainability Engine
1. **Action**: Click **"Analyze Image"**.
2. **Observation**:
   - Smooth progress bar polling the asynchronous background worker.
   - In ~1.5 seconds, the results page renders.
3. **Results Showcase**:
   - **Real YOLO Bounding Boxes**: Exactly 53 bulbs detected on the tray (50 healthy, 1 rot, 1 sprout, 1 uncertain). Zero synthetic or mock data.
   - **Calibrated Caliber Sizing**: Shows average diameter (56.4 mm), min/max distributions scaled against the 500x500mm tray reference.
   - **"Why This Grade?" Decision Engine**: Displays the dynamic narrative explaining *why* the 3.8% defect ratio earns Grade A under official APMC rules (&le; 5.0% defect tolerance).
   - **AI Attention Queue**: Highlights Bulb #53 flagged with High Priority because the classifier noted borderline surface features.
   - **Standards-to-Evidence Matrix**: Shows which APMC criteria are optically verified vs which require destructive knife cut tests or moisture probes.

### Minute 3:30 – 5:00: Human Governance & Adaptive Intelligence
1. **Action**: Click **"Continue to Human Review"** (`/inspections/:id/review`).
2. **Governance Principle**:
   > *"Notice that ONIVIS never generates a certificate without human oversight. The AI recommends; the authorized officer decides."*
3. **Dual Quality Track**:
   - Shows the side-by-side comparison: `AI Initial: Grade A` vs `Officer Final: Grade A`.
4. **Attention Queue Filter & Override**:
   - Click the **"Attention (1)"** tab. Notice the list filters immediately to the flagged uncertain bulb.
   - Click on Bulb #53 to open the audit modal.
   - **Adaptive Review Intelligence Callout**:
     > *"Notice this intelligence box: The system informs the officer that in 14 similar historical cases, officers reclassified this pattern to Healthy because of superficial dry peel. The system recommends the consensus action without any dangerous model retraining!"*
   - Click **"Apply Consensus (healthy)"** &rarr; Click **"Apply Override"**.
5. **Instant Recalculation**:
   - Observe the live recalculation: defect ratio drops from 3.8% to 1.9%, the override count increments to 1, and the explanation updates in real time.

### Minute 5:00 – 6:30: Certification & Public Farmer Transparency
1. **Action**: Click **"Approve & Issue Certificate"**.
2. **Certificate Screen**:
   - Official APMC Certificate generated with unique ID (`cert_...`), signed timestamp, lot details, dual assessment record, and high-resolution QR code.
   - Click **"Download PDF"** to preview the tamper-evident ReportLab document.
3. **Public QR Verification**:
   - Click **"Verify Certificate"** to simulate a farmer or buyer scanning the QR code with their mobile phone.
   - Public page (`/verify/:token`) loads with the green **"Certificate Valid & Authentic"** badge.
   - Displays complete transparency: bulb counts, Why This Grade narrative, and the full Standards-to-Evidence Matrix.
4. **Farmer Rights & Dispute Appeal**:
   - Highlight the **"Farmer Transparency & Rights"** section.
   - Click **"Request Re-Audit / File Review Appeal"**.
   - Enter farmer name ("Ramesh Patil"), contact number, select "Bulb Size / Caliber Disagreement", and submit.
   - Instant confirmation: registered ticket `rev_req_...` appears with status `PENDING APMC INVESTIGATION`.

---

## 3. Concluding Remarks & Impact Summary
> *"ONIVIS replaces subjective manual disputes with verifiable, transparent, and auditable visual intelligence. By combining real YOLO models, strict human governance, mathematical explainability, and farmer appeal rights, we deliver the future of transparent agricultural procurement."*

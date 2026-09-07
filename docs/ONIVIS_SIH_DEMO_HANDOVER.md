# ONIVIS — Smart India Hackathon (SIH) Demo & Pitch Handover

## 1. The Core Problem
In Indian APMC mandis, onion procurement worth thousands of crores annually relies on hurried visual estimation. This creates three critical failures:
1. **Subjective Grading:** Quality disputes between farmers and procurement agents lead to unfair deductions or lot rejections.
2. **Slow Throughput:** Manual cut-and-count checks create mandi bottlenecks during peak harvest arrivals.
3. **Zero Audit Trail:** Paper receipts lack verifiable evidence, enabling corruption and post-harvest dispute litigation.

---

## 2. The ONIVIS Solution
ONIVIS is an AI-assisted, human-governed onion quality inspection platform featuring:
- **Real Multi-Tray YOLO AI:** Accurately counts 50+ bulbs per tray and classifies defects (healthy, rot/damage, vegetative sprouting) in under 3 seconds.
- **Strict Human Governance:** AI acts strictly as an advisory assistant. The procurement officer retains legal authority to confirm or override individual predictions.
- **Adaptive Review Intelligence:** The system learns from historical officer decisions to highlight borderline bulbs and suggest consensus actions.
- **Farmer Transparency Portal:** Farmers scan an on-certificate QR code to see exact photographic evidence, defect ratios, and file re-audit appeals.

---

## 3. Step-by-Step 3-Minute Demo Script

1. **Step 1: One-Click Inspector Login (0:00 - 0:20)**
   - Open app, click "1-Click Demo Inspector Login".
   - Highlight the APMC Lasalgaon inspector profile.
2. **Step 2: Create Batch & Controlled Capture (0:20 - 0:50)**
   - Click "New Inspection", enter "Nashik Red Export - Lot #104".
   - Upload 2 sample trays. Show the OpenCV quality gate checking sharpness, lighting, and framing in real time.
3. **Step 3: Real AI Analysis & Attention Queue (0:50 - 1:30)**
   - Click "Proceed to AI Analysis". Watch YOLO detect and classify 65 bulbs across both trays.
   - Show the **"AI Attention Queue"** flagging low-confidence bulb #51 and borderline caliber bulbs.
   - Point out the **"Why This Grade?"** engine explaining exact mathematical threshold triggers.
4. **Step 4: Human Review & Adaptive Intelligence (1:30 - 2:15)**
   - Switch to Human Review. Click flagged bulb #51 in the Attention Queue.
   - Show **"Adaptive Review Intelligence"** surfacing historical officer consensus.
   - Override bulb to "Healthy" with note: "Surface peel only; sound flesh."
   - Point out real-time officer metric recalculation without changing the original AI record.
5. **Step 5: Certificate, PDF & Public QR Verification (2:15 - 3:00)**
   - Click "Approve & Issue Certificate".
   - View official certificate with cryptographic SHA-256 tamper hash and downloadable PDF.
   - Click public QR verification. Show the **Farmer Transparency Portal** and submit a re-audit dispute appeal.

---

## 4. Top Judge Questions & Technical Answers

**Q1: What happens if the AI makes an incorrect prediction?**  
*Answer:* ONIVIS follows a strict Human-in-the-Loop governance model. The AI never approves or rejects a lot autonomously. Every detected bulb is auditable, and the officer can override any classification. The original AI prediction and officer decision are stored independently in an immutable audit timeline.

**Q2: Can farmers trust this system?**  
*Answer:* Yes. Every certificate includes a public QR code. Any smartphone can scan the code to view the exact annotated tray photos, caliber size distribution, defect counts, and officer override rationale. If dissatisfied, the farmer can register a re-audit appeal directly through the verification screen.

**Q3: Does the system work without internet in rural mandis?**  
*Answer:* Yes. ONIVIS features an ACID-compliant dual-layer persistence architecture. If cloud Supabase connectivity drops, it seamlessly falls back to local SQLite and local image storage without disrupting the inspection workflow.

**Q4: How does it measure onion size?**  
*Answer:* Using a standard 500mm x 500mm calibrated APMC sample tray grid, the vision pipeline calculates the pixel-to-millimeter ratio and estimates individual bulb diameters, categorizing them into Small, Medium (Grade A), or Large sizes.\n
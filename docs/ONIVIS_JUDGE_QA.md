# ONIVIS — Judge, Evaluator & Technical Stakeholder Q&A

This document prepares the engineering and product team for rigorous technical scrutiny by Smart India Hackathon (SIH) evaluators, government procurement committees, agricultural researchers, and APMC inspectors.

---

### Q1: Can an RGB camera detect internal onion rot (smut, soft rot, sour skin) without cutting the bulb?
**Answer**:
No, and any system claiming that standard optical RGB cameras can detect internal bacterial soft rot (*Pectobacterium carotovorum*) or onion smut through intact dry outer tunic scales is scientifically false. Optical cameras can only evaluate surface features: visible soft rot tears, outer mold sporulation, skin staining, and apical vegetative sprouts.

**How ONIVIS handles this truthfully**:
ONIVIS implements a formal **Standards-to-Evidence Matrix**. It explicitly categorizes:
- **Optical Evidence Available**: Surface Rot, Vegetative Sprouting, Caliber Diameter, Tray Dirt Presentation.
- **Physical Field Check Required**: Internal Rot (requires destructive knife cut test on a 5-bulb sub-sample), Outer Scale Moisture (requires calibrated probe), and Neck Firmness (requires manual tactile squeeze).
By clearly separating these checks on the official certificate, ONIVIS provides real-world integrity that agricultural procurement officers can legally defend.

---

### Q2: Why did you choose a Two-Stage Pipeline (YOLOv8 Detection + Crop Classifier) over the candidate YOLO11s-OBB model?
**Answer**:
We conducted rigorous ground-truth benchmarking on actual tray samples (e.g., 53-bulb ground truth tray):
1. **Recall**: The baseline production model achieved **100% recall (53/53 bulbs detected)**. The candidate YOLO11s-OBB model missed 10 bulbs (**~19% false negative rate**), which is unacceptable in commercial trade where undercounting directly harms farmers.
2. **Defect Specialization**: The candidate artifact in `models/best/` was trained exclusively for single-class object localization (`{0: 'onion'}`) with zero defect classification capability.
3. **Decoupled Resolution**: A two-stage pipeline allows the detection stage to process full-tray geometry at 640x640, while the classification stage processes high-resolution zoomed crops (224x224 per bulb) to identify minute fungal spots and micro-sprouts that downscaled full-image detectors miss.

---

### Q3: If procurement officers override AI classifications, doesn't that open the door to human corruption and bias?
**Answer**:
No, because ONIVIS implements **Dual Assessment & Cryptographic Traceability**:
1. Initial AI predictions are permanently frozen in the immutable audit log.
2. Every manual override requires an explicit reason (selected from APMC presets or typed) and the officer's digital credential signature.
3. Certificates clearly display both: `AI Recommended Grade` and `Officer Final Grade`, accompanied by the exact count of overrides.
4. If an officer exhibits an abnormal override deviation pattern (e.g., systematically reclassifying URS lots to Grade A), vigilance auditors can run discrepancy analytics to detect anomalies.

---

### Q4: How does Adaptive Review Intelligence work, and does it risk model poisoning?
**Answer**:
Adaptive Review Intelligence operates strictly as a **non-retraining contextual recommender**:
- When officers verify and override borderline classifications (e.g., distinguishing harmless outer dust from true fungal decay), the consensus is recorded in `verified_feedback`.
- When future inspectors encounter a low-confidence or uncertain bulb, the system retrieves historical consensus (e.g., *"In 14 similar cases, officers determined this was healthy in 85.7% of audits"*).
- The core weights of the deep learning model are **never modified dynamically or in-place**, eliminating model poisoning, catastrophic forgetting, and algorithmic drift.

---

### Q5: How do you prevent overlapping onions on the tray from skewing the count and diameter measurements?
**Answer**:
1. **Pre-Capture Framing Guidance**: The client camera interface renders active boundary guides and visual reminders instructing the assistant to distribute bulbs in a single layer on the 500x500mm tray.
2. **Non-Maximum Suppression (NMS)**: The detection stage uses IoU thresholds tuned specifically for abutting round objects.
3. **Anomalous Size Filtering**: Bulbs whose detected bounding box aspect ratio or area deviates significantly from biological norms are automatically flagged in the **AI Attention Queue** for manual inspection.

---

### Q6: How can ONIVIS operate in remote agricultural mandis with poor or nonexistent internet connectivity?
**Answer**:
ONIVIS features a **Self-Healing Dual Persistence Engine**:
- When internet connection is absent, the backend operates entirely against a local, zero-config SQLite database (`onivis_local.db`).
- All ML inference runs locally on the host machine using PyTorch and CPU/GPU acceleration (taking < 500ms per tray).
- Certificates and QR codes are generated and printed locally.
- When network connectivity is restored, lot records can be synchronized to the central cloud repository.

---

### Q7: What are the exact APMC commercial grading thresholds codified in ONIVIS?
**Answer**:
Per standard Agricultural Produce Market Committee (APMC) and Directorate of Marketing & Inspection (DMI) guidelines for onions:
- **Defect Ratio Formula**:
  $$\text{Defect Ratio} = \frac{\text{Rotten/Damaged Bulbs} + \text{Sprouted Bulbs}}{\text{Total Sampled Bulbs}}$$
- **Grade A**: Defect ratio $\le 5.0\%$, vegetative sprouts = $0\%$, diameter within $40\text{mm} - 70\text{mm}$.
- **URS (Under-sized / Re-sorted / Standard)**: Defect ratio between $5.1\%$ and $15.0\%$, sprouts $\le 5.0\%$.
- **Rejected**: Defect ratio $> 15.0\%$ (unfit for commercial storage or export).
- **Unrated**: If zero onions are detected or image quality gate fails.

---

### Q8: What recourse does a farmer have if they disagree with the quality certificate?
**Answer**:
Every ONIVIS certificate features an open-access public QR verification link. When scanned by the farmer's smartphone:
1. The farmer views the complete objective inspection record, including bulb counts, defect photos, diameter statistics, and officer notes.
2. If dissatisfied, the farmer can click **"Request Re-Audit / File Review Appeal"** directly on the verification page.
3. Submitting the appeal registers a dispute ticket (`review_requests` table) that alerts the mandi's chief arbitration officer for a mandatory secondary sampling.

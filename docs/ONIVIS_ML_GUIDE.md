# ONIVIS — Machine Learning & Computer Vision Engineering Guide

This document provides a thorough technical analysis of the ONIVIS computer vision pipeline, empirical model evaluations, physical size estimation formulas, and benchmarking data between the production baseline models and the newly evaluated candidate model.

---

## 1. Production Pipeline Overview

The production ONIVIS visual inspection pipeline employs a **two-stage architecture**:

```
Raw Tray Image (RGB)
        |
        v
+-------------------------------------------------------+
| Stage 1: Onion Localization (YOLOv8 Detection)        |
| Model: models/detection_model.pt                      |
| Input: 640x640 letterboxed image                      |
| Output: Bounding boxes [x1, y1, x2, y2], Confidences  |
+-------------------------------------------------------+
        |
        +-----------------------------------+
        |                                   |
        v                                   v
+-----------------------------------+ +-----------------------------------+
| Stage 2: Defect Classification    | | Stage 3: Physical Size Estimation |
| Model: best_classification_model  | | Metric reference: 500x500mm frame |
| Input: Cropped bulb patches       | | Formula: d_mm = (w_px / W_tray)   |
| Classes: healthy, rotten_damaged, | |                 * 500.0           |
|          sprouted, uncertain      | | Output: Caliber diameter (mm)     |
+-----------------------------------+ +-----------------------------------+
        |                                   |
        +-----------------+-----------------+
                          |
                          v
+-------------------------------------------------------+
| Stage 4: Feature Aggregation & Decision Engine        |
| - Total counts, healthy count, defect counts          |
| - Commercial grade: Grade A / URS / Rejected          |
| - AI Attention Queue generation                       |
| - Structured explainability narrative                 |
+-------------------------------------------------------+
```

---

## 2. Model Specifications

### 2.1 Detection Model (`detection_model.pt`)
- **Base Architecture**: Ultralytics YOLOv8s (Standard Object Detection).
- **Task**: Object Localization (`task: detect`).
- **Target Classes**: `{0: 'onion'}`.
- **Input Resolution**: 640 &times; 640 pixels.
- **NMS Threshold**: IoU 0.45; Confidence threshold 0.25.
- **Role**: High-recall boundary detection of tightly packed, touching, or partially occluded onion bulbs on inspection trays.

### 2.2 Classification Model (`best_classification_model.pt`)
- **Base Architecture**: Deep Convolutional Classifier / Fine-tuned ResNet-50 / YOLO-cls.
- **Input**: 224 &times; 224 cropped bounding box patches.
- **Classes**:
  1. `healthy`: Clean, firm tunic scales without vegetative growth or mechanical tears.
  2. `rotten_damaged`: Surface soft rot, black mold (*Aspergillus niger*), bacterial soft rot (*Pectobacterium*), or deep punctures.
  3. `sprouted`: Visible green shoot emergence from the apical stem or neck split.
  4. `uncertain`: Borderline or occluded cases where model softmax confidence is below threshold (< 0.65).

---

## 3. Physical Size Estimation & Geometric Calibration

Accurate size grading is critical for APMC standards (Grade A onions typically require diameters between 40mm and 70mm).

### Calibration Principle
The procurement station uses a standardized sampling tray of known physical dimensions:
- **Reference Tray Width ($W_{\text{ref}}$)**: $500.0\text{ mm}$
- **Reference Tray Height ($H_{\text{ref}}$)**: $500.0\text{ mm}$

### Formula
For any detected bulb $i$ with bounding box width $w_i$ and height $h_i$ in an image of dimensions $W_{\text{img}} \times H_{\text{img}}$:
$$\text{Scale Factor } S_x = \frac{W_{\text{ref}}}{W_{\text{img}}}, \quad S_y = \frac{H_{\text{ref}}}{H_{\text{img}}}$$
$$\text{Diameter } d_i = \sqrt{(w_i \cdot S_x) \times (h_i \cdot S_y)}$$

### Caliber Categories
- **Small**: $d_i < 45.0\text{ mm}$
- **Medium**: $45.0\text{ mm} \le d_i \le 65.0\text{ mm}$
- **Large**: $d_i > 65.0\text{ mm}$

---

## 4. Evaluation of Candidate Artifact (`backend/models/best/`)

### 4.1 Candidate Artifact Inspection
During our comprehensive audit, we investigated the candidate artifact located in `backend/models/best/` (unpacked from `latest_onion_detection.pt.zip`).

Key findings from PyTorch metadata extraction:
- **Architecture**: **YOLO11s-OBB** (`task: obb`, Oriented Bounding Boxes).
- **Trained Date**: 2026-09-07T09:47:11.
- **Classes**: `{0: 'onion'}` only.
- **Defect Capability**: **None**. The candidate model is an OBB localization model only; it does not classify defects (healthy vs rot vs sprout).
- **File Container Format**: PyTorch 1.6+ zip container lacking standard `archive/` top-level directory prefix.

### 4.2 Empirical Ground-Truth Benchmark
We conducted side-by-side comparative benchmarking on a real, ground-truth onion tray capture (`uploads/8a6aa57f-8030-4c10-b3de-eb644d3261ae.png`):

| Metric | Production Baseline Pipeline | Candidate Artifact (`YOLO11s-OBB`) |
| :--- | :--- | :--- |
| **Model Type** | YOLOv8 Detect + Multi-Class Classifier | YOLO11s-OBB (Oriented Bounding Box) |
| **Total Bulbs Present (Ground Truth)** | **53 bulbs** | **53 bulbs** |
| **Total Bulbs Detected** | **53 bulbs (100.0% recall)** | **43 bulbs (81.1% recall)** |
| **Missed Bulbs (False Negatives)** | **0 missed (0.0%)** | **10 missed (18.9%)** |
| **Defect Classification** | **50 Healthy, 1 Rot, 1 Sprout, 1 Uncertain** | **None** (Requires secondary model) |
| **Average Inference Latency** | 420 ms (End-to-End pipeline) | 380 ms (Localization only) |
| **Commercial Grade Assigned** | **Grade A** (3.8% defect ratio) | **Incomputable** (Missing defect classes) |

### 4.3 Conclusion & Release Decision
Per **Section 11 (Model Selection Rules)** of the master requirements:
1. The baseline production models (`models/detection_model.pt` + `models/best_classification_model.pt`) achieve **100% detection recall (53/53 bulbs)** and provide full defect classification.
2. The candidate YOLO11s-OBB model exhibits an unacceptable **~19% false negative rate (missed 10 bulbs)** and provides zero defect classification.
3. **Decision**: The baseline production models are retained for release. The candidate model is preserved for future research.

---

## 5. Future Roadmap: OBB Adapter Architecture

While the baseline models remain production-standard, Oriented Bounding Boxes (OBB) provide improved rotational caliber estimation for elongated varieties. In a future major release, an OBB adapter can be integrated as follows:

```python
# Conceptual OBB Adapter Pipeline
def run_obb_hybrid_inference(image_path: str):
    # 1. Oriented bounding boxes capture exact rotational axis
    obb_results = yolo11_obb_model(image_path)
    
    # 2. De-rotate each bulb patch to standard vertical axis
    derotated_crops = []
    for obb in obb_results.boxes:
        angle = obb.theta
        crop = extract_rotated_patch(image_path, obb.corners)
        derotated_crops.append(crop)
        
    # 3. Route de-rotated crops to defect classifier
    classifications = defect_classifier(derotated_crops)
    return merge_results(obb_results, classifications)
```

"""Teammate YOLO-based onion detection and classification engine."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)


class OnionInferenceEngine:
    PADDING_RATIO = 0.20
    MIN_PADDING = 8
    MAX_PADDING = 80

    HEALTHY_COLOR = (50, 205, 50)
    ROTTEN_COLOR = (50, 50, 220)
    SPROUTED_COLOR = (0, 165, 255)
    UNKNOWN_COLOR = (0, 215, 255)

    BOX_THICKNESS = 2
    LABEL_SCALE = 0.45
    LABEL_THICKNESS = 1
    LABEL_TEXT_COLOR = (255, 255, 255)

    DISPLAY_LABELS = {
        "healthy": "H",
        "rotten_damaged": "RD",
        "sprouted": "S",
        "uncertain": "?",
    }

    EXPECTED_CLASSES = {"healthy", "rotten_damaged", "sprouted"}
    DETECTION_IMG_SIZE = 800
    CLASSIFICATION_IMG_SIZE = 224

    def __init__(
        self,
        detection_model_path: Path | str,
        classification_model_path: Path | str,
        device: str = "cpu",
        detection_conf: float = 0.10,
        classification_conf_threshold: float = 0.50,
    ) -> None:
        self.detection_model_path = Path(detection_model_path)
        self.classification_model_path = Path(classification_model_path)
        self.device = device
        self.detection_conf = detection_conf
        self.classification_conf_threshold = classification_conf_threshold
        self.detector = None
        self.classifier = None

        if self.detection_model_path.exists() and self.classification_model_path.exists():
            self._load_models()
        else:
            logger.warning(
                "YOLO model files not found yet; real analysis remains unavailable until models are present. "
                "Expected detection=%s and classification=%s",
                self.detection_model_path,
                self.classification_model_path,
            )

    def _load_models(self) -> None:
        self._validate_model_files()
        logger.info("Loading detection model from %s", self.detection_model_path)
        self.detector = YOLO(str(self.detection_model_path))

        logger.info("Loading classification model from %s", self.classification_model_path)
        self.classifier = YOLO(str(self.classification_model_path))

        self._validate_classifier()
        logger.info("Onion inference engine ready (device=%s).", self.device)

    def is_ready(self) -> bool:
        return self.detector is not None and self.classifier is not None

    def _validate_model_files(self) -> None:
        if not self.detection_model_path.exists():
            raise FileNotFoundError(f"Detection model not found: {self.detection_model_path}")
        if not self.classification_model_path.exists():
            raise FileNotFoundError(f"Classification model not found: {self.classification_model_path}")

    def _validate_classifier(self) -> None:
        names = self.classifier.names
        actual_classes = set(names.values()) if isinstance(names, dict) else set(names)
        missing_classes = self.EXPECTED_CLASSES - actual_classes
        if missing_classes:
            raise ValueError(
                f"Classification model is missing expected classes: {missing_classes}. "
                f"Model classes: {actual_classes}"
            )

    @staticmethod
    def get_class_name(names: Any, class_id: int) -> str:
        class_id = int(class_id)
        if isinstance(names, dict):
            return names.get(class_id, f"class_{class_id}")
        if 0 <= class_id < len(names):
            return names[class_id]
        return f"class_{class_id}"

    def calculate_padded_box(
        self,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        image_width: int,
        image_height: int,
    ) -> Tuple[int, int, int, int]:
        box_width = x2 - x1
        box_height = y2 - y1

        padding_x = int(box_width * self.PADDING_RATIO)
        padding_y = int(box_height * self.PADDING_RATIO)
        padding_x = max(self.MIN_PADDING, min(padding_x, self.MAX_PADDING))
        padding_y = max(self.MIN_PADDING, min(padding_y, self.MAX_PADDING))

        crop_x1 = max(0, x1 - padding_x)
        crop_y1 = max(0, y1 - padding_y)
        crop_x2 = min(image_width, x2 + padding_x)
        crop_y2 = min(image_height, y2 + padding_y)
        return crop_x1, crop_y1, crop_x2, crop_y2

    def classify_crop(self, crop: np.ndarray) -> Tuple[str | None, float, Dict[str, float]]:
        result = self.classifier.predict(
            source=crop,
            imgsz=self.CLASSIFICATION_IMG_SIZE,
            device=self.device,
            verbose=False,
        )[0]

        if result.probs is None:
            return None, 0.0, {}

        top1_index = int(result.probs.top1)
        confidence = float(result.probs.top1conf)
        predicted_class = self.get_class_name(self.classifier.names, top1_index)

        probabilities: Dict[str, float] = {}
        if result.probs.data is not None:
            probability_values = result.probs.data.detach().cpu().numpy()
            for class_id, probability in enumerate(probability_values):
                class_name = self.get_class_name(self.classifier.names, class_id)
                probabilities[class_name] = float(probability)

        return predicted_class, confidence, probabilities

    def determine_final_class(self, predicted_class: str | None, confidence: float) -> str:
        if predicted_class is None:
            return "uncertain"
        if predicted_class not in self.EXPECTED_CLASSES:
            return "uncertain"
        if confidence < self.classification_conf_threshold:
            return "uncertain"
        return predicted_class

    def get_visual_style(self, final_class: str) -> Tuple[str, Tuple[int, int, int]]:
        if final_class == "healthy":
            return "H", self.HEALTHY_COLOR
        if final_class == "rotten_damaged":
            return "RD", self.ROTTEN_COLOR
        if final_class == "sprouted":
            return "S", self.SPROUTED_COLOR
        return "?", self.UNKNOWN_COLOR

    def draw_box(
        self,
        image: np.ndarray,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        label: str,
        color: Tuple[int, int, int],
    ) -> np.ndarray:
        cv2.rectangle(image, (x1, y1), (x2, y2), color, self.BOX_THICKNESS)
        if not label:
            return image

        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, self.LABEL_SCALE, self.LABEL_THICKNESS)[0]
        text_width, text_height = text_size
        padding = 5
        label_width = text_width + padding * 2
        label_height = text_height + padding * 2

        label_x1 = max(0, x1)
        label_y1 = max(0, y1 - label_height)
        label_x2 = min(image.shape[1], label_x1 + label_width)
        label_y2 = min(image.shape[0], label_y1 + label_height)

        overlay = image.copy()
        cv2.rectangle(overlay, (label_x1, label_y1), (label_x2, label_y2), color, -1)
        image = cv2.addWeighted(overlay, 0.80, image, 0.20, 0)

        cv2.putText(
            image,
            label,
            (label_x1 + padding, label_y2 - padding - 1),
            cv2.FONT_HERSHEY_SIMPLEX,
            self.LABEL_SCALE,
            self.LABEL_TEXT_COLOR,
            self.LABEL_THICKNESS,
            cv2.LINE_AA,
        )
        return image

    def get_detections(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        result = self.detector.predict(
            source=image,
            imgsz=self.DETECTION_IMG_SIZE,
            conf=self.detection_conf,
            device=self.device,
            verbose=False,
        )[0]

        if result.obb is not None and len(result.obb) > 0:
            boxes = result.obb.xyxy.detach().cpu().numpy()
            confidences = result.obb.conf.detach().cpu().numpy()
            return boxes, confidences

        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes.xyxy.detach().cpu().numpy()
            confidences = result.boxes.conf.detach().cpu().numpy()
            return boxes, confidences

        return np.empty((0, 4)), np.empty((0,))

    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        if image is None:
            raise ValueError("Input image is empty.")
        if not isinstance(image, np.ndarray):
            raise TypeError("Input image must be a NumPy array.")
        if image.ndim != 3:
            raise ValueError("Input image must be a color image.")
        if not self.is_ready():
            raise RuntimeError(
                "Real ML provider is unavailable because the YOLO model files were not found. "
                f"Detection={self.detection_model_path}, Classification={self.classification_model_path}"
            )

        original_image = image.copy()
        display_image = image.copy()
        image_height, image_width = original_image.shape[:2]

        boxes, detection_confidences = self.get_detections(original_image)
        detections: List[Dict[str, Any]] = []
        summary = {"healthy": 0, "rotten_damaged": 0, "sprouted": 0, "uncertain": 0}

        for onion_index, (box, detection_confidence) in enumerate(zip(boxes, detection_confidences), start=1):
            x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
            x1 = max(0, min(x1, image_width - 1))
            y1 = max(0, min(y1, image_height - 1))
            x2 = max(1, min(x2, image_width))
            y2 = max(1, min(y2, image_height))

            if x2 <= x1 or y2 <= y1:
                continue

            crop_x1, crop_y1, crop_x2, crop_y2 = self.calculate_padded_box(
                x1, y1, x2, y2, image_width, image_height
            )
            crop = original_image[crop_y1:crop_y2, crop_x1:crop_x2]
            if crop.size == 0:
                continue

            try:
                predicted_class, classification_confidence, probabilities = self.classify_crop(crop)
            except Exception:
                logger.exception("Classification failed for onion #%s", onion_index)
                predicted_class = None
                classification_confidence = 0.0
                probabilities = {}

            final_class = self.determine_final_class(predicted_class, classification_confidence)
            summary[final_class] += 1

            short_label, box_color = self.get_visual_style(final_class)
            display_label = (
                f"{short_label} {classification_confidence * 100:.0f}%"
                if classification_confidence > 0
                else short_label
            )
            display_image = self.draw_box(display_image, x1, y1, x2, y2, display_label, box_color)

            detections.append(
                {
                    "id": onion_index,
                    "bbox": [x1, y1, x2, y2],
                    "crop_bbox": [crop_x1, crop_y1, crop_x2, crop_y2],
                    "detection_confidence": round(float(detection_confidence), 5),
                    "predicted_class": predicted_class,
                    "final_class": final_class,
                    "display_label": short_label,
                    "classification_confidence": round(float(classification_confidence), 5),
                    "probabilities": {
                        key: round(float(value), 5) for key, value in probabilities.items()
                    },
                }
            )

        success, encoded_image = cv2.imencode(".jpg", display_image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not success:
            raise RuntimeError("Failed to encode annotated image.")

        return {
            "total_onions": len(detections),
            "summary": summary,
            "detections": detections,
            "annotated_image": encoded_image.tobytes(),
            "image_width": image_width,
            "image_height": image_height,
        }


class SizeEstimator:
    def __init__(self, window_width_mm: float | None, window_height_mm: float | None) -> None:
        self.window_width_mm = window_width_mm
        self.window_height_mm = window_height_mm

    def estimate(self, detections: List[Dict[str, Any]], image_width_px: int, image_height_px: int) -> Dict[str, Any]:
        calibration = {
            "window_width_mm": self.window_width_mm,
            "window_height_mm": self.window_height_mm,
            "image_width_px": image_width_px,
            "image_height_px": image_height_px,
        }

        if not self.window_width_mm or not self.window_height_mm:
            for detection in detections:
                detection["estimated_diameter_mm"] = None
            return {
                "average_diameter_mm": None,
                "minimum_diameter_mm": None,
                "maximum_diameter_mm": None,
                "sample_count": 0,
                "status": "unavailable",
                "message": "Physical size estimation requires WINDOW_WIDTH_MM and WINDOW_HEIGHT_MM to be configured.",
                "calibration": calibration,
            }

        mm_per_pixel_x = self.window_width_mm / image_width_px if image_width_px > 0 else None
        mm_per_pixel_y = self.window_height_mm / image_height_px if image_height_px > 0 else None
        diameters_mm: List[float] = []

        for detection in detections:
            x1, y1, x2, y2 = detection["bbox"]
            bbox_width_px = x2 - x1
            bbox_height_px = y2 - y1
            if mm_per_pixel_x is None or mm_per_pixel_y is None:
                detection["estimated_diameter_mm"] = None
                continue
            width_mm = bbox_width_px * mm_per_pixel_x
            height_mm = bbox_height_px * mm_per_pixel_y
            diameter_mm = round((width_mm + height_mm) / 2, 2)
            detection["estimated_diameter_mm"] = diameter_mm
            diameters_mm.append(diameter_mm)

        if not diameters_mm:
            return {
                "average_diameter_mm": None,
                "minimum_diameter_mm": None,
                "maximum_diameter_mm": None,
                "sample_count": 0,
                "status": "no_detections",
                "calibration": calibration,
            }

        return {
            "average_diameter_mm": round(sum(diameters_mm) / len(diameters_mm), 2),
            "minimum_diameter_mm": round(min(diameters_mm), 2),
            "maximum_diameter_mm": round(max(diameters_mm), 2),
            "sample_count": len(diameters_mm),
            "status": "estimated",
            "calibration": calibration,
        }

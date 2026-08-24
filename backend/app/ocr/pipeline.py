from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np

from app.ocr.anchor import (
    FIELD_KIND,
    ROW_LABELS,
    SCORE_RE,
    assign_side_values,
    find_header_info,
    find_label_anchors,
)
from app.ocr.parse import parse_field
from app.ocr.recognize import DetectedText, TextDetector, get_detector

LOW_CONFIDENCE_CEILING = 0.3  # a field that fails format validation is
# capped at this confidence regardless of what the OCR engine reported —
# an implausible reading shouldn't look "confident" to the review UI.


@dataclass(frozen=True)
class FieldExtraction:
    field: str
    kind: str
    raw_text: str
    value: Any
    confidence: float


@dataclass(frozen=True)
class ExtractionResult:
    home: dict[str, FieldExtraction] = field(default_factory=dict)
    away: dict[str, FieldExtraction] = field(default_factory=dict)
    away_team: FieldExtraction | None = None
    home_team: FieldExtraction | None = None
    labels_found: int = 0  # out of len(ROW_LABELS) — a quick overall-quality signal


def _decode_image(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def _to_field_extraction(field_name: str, detected: DetectedText | None) -> FieldExtraction:
    kind = FIELD_KIND[field_name]
    if detected is None:
        return FieldExtraction(field=field_name, kind=kind, raw_text="", value=None, confidence=0.0)

    value, is_valid = parse_field(kind, detected.text)
    confidence = detected.confidence
    if not is_valid:
        confidence = min(confidence, LOW_CONFIDENCE_CEILING)
    return FieldExtraction(
        field=field_name, kind=kind, raw_text=detected.text, value=value, confidence=confidence
    )


def extract_stats(image_bytes: bytes, detector: TextDetector | None = None) -> ExtractionResult:
    img = _decode_image(image_bytes)
    active_detector = detector or get_detector()

    detections = active_detector.detect(img)
    anchors = find_label_anchors(detections)
    away_matches, home_matches = assign_side_values(detections, anchors)

    away = {f: _to_field_extraction(f, away_matches[f]) for f, _ in ROW_LABELS}
    home = {f: _to_field_extraction(f, home_matches[f]) for f, _ in ROW_LABELS}

    score_box, away_team_det, home_team_det = find_header_info(detections, anchors)
    away_goals_det, home_goals_det = _split_score(score_box)
    away["goals"] = _to_field_extraction("goals", away_goals_det)
    home["goals"] = _to_field_extraction("goals", home_goals_det)

    away_team = _to_field_extraction("team_abbreviation", away_team_det)
    home_team = _to_field_extraction("team_abbreviation", home_team_det)

    return ExtractionResult(
        home=home,
        away=away,
        away_team=away_team,
        home_team=home_team,
        labels_found=len(anchors),
    )


def _split_score(
    score_box: DetectedText | None,
) -> tuple[DetectedText | None, DetectedText | None]:
    """The score box is a single detection like "2-1" — split it into two
    synthetic per-side detections (same confidence/center, different text)
    so it flows through `_to_field_extraction` like any other field."""
    if score_box is None:
        return None, None
    match = SCORE_RE.match(score_box.text.replace(" ", ""))
    if not match:
        return None, None
    away_text, home_text = match.group(1), match.group(2)
    conf, center = score_box.confidence, score_box.center
    away_det = DetectedText(text=away_text, confidence=conf, center=center)
    home_det = DetectedText(text=home_text, confidence=conf, center=center)
    return away_det, home_det


def result_to_dict(result: ExtractionResult) -> dict[str, Any]:
    def side_to_dict(side: dict[str, FieldExtraction]) -> dict[str, Any]:
        return {
            name: {"raw_text": fe.raw_text, "value": fe.value, "confidence": fe.confidence}
            for name, fe in side.items()
        }

    def field_to_dict(fe: FieldExtraction | None) -> dict[str, Any] | None:
        if fe is None:
            return None
        return {"raw_text": fe.raw_text, "value": fe.value, "confidence": fe.confidence}

    return {
        "home": side_to_dict(result.home),
        "away": side_to_dict(result.away),
        "away_team": field_to_dict(result.away_team),
        "home_team": field_to_dict(result.home_team),
        "labels_found": result.labels_found,
    }

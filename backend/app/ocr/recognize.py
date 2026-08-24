from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

import numpy as np


@dataclass(frozen=True)
class DetectedText:
    text: str
    confidence: float  # 0-1
    center: tuple[float, float]  # (x, y) in the image's pixel space


class TextDetector(Protocol):
    """Swappable whole-image text detector — takes the raw photo, returns
    every text box found with its recognized text, confidence, and centroid.
    No perspective correction or field-cropping needed: PaddleOCR's
    detection stage handles real-world angle/rotation directly (validated
    against all 3 real sample photos — see the plan's OCR benchmark notes).
    Implement this to plug in a different engine without touching the rest
    of the pipeline (label-anchoring in anchor.py)."""

    def detect(self, image: np.ndarray) -> list[DetectedText]: ...


class PaddleTextDetector:
    """Full PaddleOCR pipeline (text detection + recognition), as opposed to
    the single-line `TextRecognition`-only approach originally tried: that
    approach needed accurate perspective-corrected crops to work, and
    automatic corner detection proved unreliable on every real test photo.
    Running detection+recognition on the whole image sidesteps that
    entirely — see anchor.py for how field values get matched to their
    labels afterward."""

    def __init__(self) -> None:
        from paddleocr import PaddleOCR

        self._model = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )

    def detect(self, image: np.ndarray) -> list[DetectedText]:
        results = self._model.predict(image)
        detected: list[DetectedText] = []
        for res in results:
            texts = res.get("rec_texts", [])
            scores = res.get("rec_scores", [])
            polys = res.get("rec_polys", [])
            for text, score, poly in zip(texts, scores, polys, strict=True):
                cx = sum(p[0] for p in poly) / len(poly)
                cy = sum(p[1] for p in poly) / len(poly)
                detected.append(
                    DetectedText(text=text.strip(), confidence=float(score), center=(cx, cy))
                )
        return detected


@lru_cache(maxsize=1)
def get_detector() -> TextDetector:
    """Model load takes a few seconds — cache the singleton so it only
    happens once per process, not once per request."""
    return PaddleTextDetector()

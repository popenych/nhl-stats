import pytest

from app.ocr.pipeline import extract_stats
from app.ocr.recognize import TextDetector, get_detector
from app.ocr.tests.fixtures.ground_truth import FIXTURES

pytestmark = pytest.mark.parametrize("image_id", sorted(FIXTURES.keys()))


@pytest.fixture(scope="module")
def detector() -> TextDetector:
    # Loading PaddleOCR's models takes a few seconds — do it once per module.
    return get_detector()


def _assert_side_matches(extracted: dict, expected: dict, image_id: int, side: str) -> None:
    for field_name, expected_value in expected.items():
        fe = extracted[field_name]
        assert fe.value == expected_value, (
            f"image {image_id} {side}.{field_name}: got {fe.value!r} "
            f"(raw text {fe.raw_text!r}, confidence {fe.confidence:.2f}), "
            f"expected {expected_value!r}"
        )


def test_extract_stats_matches_ground_truth(image_id: int, detector: TextDetector) -> None:
    fixture = FIXTURES[image_id]
    image_bytes = fixture["file"].read_bytes()

    result = extract_stats(image_bytes, detector=detector)

    assert result.labels_found == 9, f"image {image_id}: only found {result.labels_found}/9 labels"
    _assert_side_matches(result.away, fixture["away"], image_id, "away")
    _assert_side_matches(result.home, fixture["home"], image_id, "home")

    assert result.away_team is not None and result.away_team.value == fixture["away_team"], (
        f"image {image_id} away_team: got {result.away_team}"
    )
    assert result.home_team is not None and result.home_team.value == fixture["home_team"], (
        f"image {image_id} home_team: got {result.home_team}"
    )


def test_all_fields_parse_with_real_confidence(image_id: int, detector: TextDetector) -> None:
    """Correctly-parsed fields should carry the recognizer's real confidence
    (not the validation-failure-capped value) — i.e. nothing here silently
    failed to parse."""
    fixture = FIXTURES[image_id]
    image_bytes = fixture["file"].read_bytes()

    result = extract_stats(image_bytes, detector=detector)

    for side in (result.away, result.home):
        for fe in side.values():
            assert fe.value is not None, f"{fe.field} failed to parse (raw: {fe.raw_text!r})"

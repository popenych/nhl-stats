from pathlib import Path

from app.ocr.pipeline import extract_stats
from app.ocr.recognize import get_detector

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_merged_adjacent_rows_are_flagged_not_trusted() -> None:
    """Real photo (stats_example_4.jpg) where the detector merges away
    shots ("14") and hits ("25") into a single box read as "1425" — the
    label anchors are close enough together on this photo's framing that
    both rows' nearest-candidate search lands on the same merged box.
    Regression for a real production bug: both fields must come back
    correctly flagged as unreadable (value=None, low confidence) rather
    than silently accepting the implausible merged value for either field."""
    image_bytes = (FIXTURES_DIR / "stats_example_4.jpg").read_bytes()

    result = extract_stats(image_bytes, detector=get_detector())

    assert result.labels_found == 9
    for field_name in ("shots", "hits"):
        fe = result.away[field_name]
        assert fe.value is None, f"away.{field_name}: expected unparseable, got {fe.value!r}"
        assert (
            fe.confidence <= 0.3
        ), f"away.{field_name}: expected low confidence, got {fe.confidence}"
    # The unaffected side/fields on the same photo should still read correctly.
    assert result.home["shots"].value == 14
    assert result.home["hits"].value == 18
    assert result.away_team is not None and result.away_team.value == "CAR"
    assert result.home_team is not None and result.home_team.value == "COL"

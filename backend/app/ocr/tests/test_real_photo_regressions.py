"""Regression tests from real historical photos, found by diffing the OCR
pipeline's output against the app's own DB after the user manually reviewed
and corrected every one of their 84 imported games. Each fixture here is a
genuine mismatch that was caught this way — not a synthetic example."""

from pathlib import Path

import pytest

from app.ocr.pipeline import extract_stats
from app.ocr.recognize import get_detector

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_two_numbers_in_one_box_are_flagged_not_trusted() -> None:
    """stats_example_5 (real photo, away shots=23/hits=12 per the corrected
    DB): the detector puts both rows' values in one box as "23 12" — before
    the parse_int fix, `_INT_RE.search()` took the first regex match and
    silently returned shots=23 for BOTH the shots and hits fields (hits
    should have been 12). Now any raw text with more than one separate
    digit run is treated as unparseable rather than guessing which one."""
    image_bytes = (FIXTURES_DIR / "stats_example_5_merged_hits.jpeg").read_bytes()

    result = extract_stats(image_bytes, detector=get_detector())

    assert result.labels_found == 9
    for field_name in ("shots", "hits"):
        fe = result.away[field_name]
        assert fe.value is None, f"away.{field_name}: expected unparseable, got {fe.value!r}"
        assert fe.confidence <= 0.3
    # Unaffected fields on the same photo still read correctly.
    assert result.away["faceoffs_won"].value == 12
    assert result.away_team is not None and result.away_team.value == "USA"
    assert result.home_team is not None and result.home_team.value == "CAN"


def test_differently_formatted_value_anchored_to_wrong_field_is_flagged() -> None:
    """stats_example_6 (real photo, a hard one — only 7/9 labels detected):
    three separate fields each picked up a value that visually belongs to a
    *different* row, formatted accordingly — a mm:ss TIME ON ATTACK reading
    ("07:39") anchored to PASSING, a PASSING percentage ("72.7%") anchored
    to FACEOFFS WON, and a POWERPLAY MINUTES reading ("02:53") anchored to
    SHORTHANDED GOALS. Before the parse_int/parse_pct fixes, each of these
    silently returned a plausible-looking number (7.0, 72, 2) instead of
    being flagged — the true DB values are 72.7, 9, and 0 respectively.
    This one photo is kept as a fixture specifically because it stresses the
    label-anchoring step, not just the parsers: worth re-checking after any
    future anchor.py change."""
    image_bytes = (FIXTURES_DIR / "stats_example_6_multi_mismatch.jpeg").read_bytes()

    result = extract_stats(image_bytes, detector=get_detector())

    assert result.away["passing_pct"].value is None
    assert result.away["faceoffs_won"].value is None
    assert result.away["shorthanded_goals"].value is None
    assert result.home["faceoffs_won"].value is None
    # Plain, correctly-anchored fields on the same photo are unaffected.
    assert result.away["shots"].value == 20
    assert result.home["shots"].value == 16
    assert result.away_team is not None and result.away_team.value == "WPG"
    assert result.home_team is not None and result.home_team.value == "TBL"


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Known, unfixed anchor-matching bug: on this real photo the 'shots' "
        "label anchors to the HITS row's value instead of its own row (both "
        "are plain, correctly-formatted integers — '20' — so parse.py's "
        "format-based defenses can't catch it; the true away shots value, "
        "confirmed against the user-corrected DB, is 15, and 20 is actually "
        "the away hits value). Fixing this needs anchor.py's proximity "
        "matching to get stricter about row order, not another parser "
        "tweak. Remove xfail once that's fixed and confirm 15 here."
    ),
)
def test_shots_row_anchor_matches_hits_row_instead() -> None:
    image_bytes = (FIXTURES_DIR / "stats_example_7_row_swap.jpeg").read_bytes()

    result = extract_stats(image_bytes, detector=get_detector())

    assert result.away["shots"].value == 15

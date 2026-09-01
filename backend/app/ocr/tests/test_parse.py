from app.ocr.parse import parse_field, parse_fraction, parse_int, parse_mmss, parse_pct


def test_parse_int_valid() -> None:
    assert parse_int("18") == 18


def test_parse_int_invalid() -> None:
    assert parse_int("") is None
    assert parse_int("abc") is None


def test_parse_int_rejects_implausibly_large_values() -> None:
    """Guards against the detector merging two adjacent rows' values into one
    box (e.g. shots "14" + hits "25" read as a single "1425") — no real
    per-game counting stat here reaches 3 digits."""
    assert parse_int("1425") is None
    assert parse_int("99") == 99


def test_parse_int_rejects_multiple_digit_runs() -> None:
    """Real production mismatches found by diffing OCR against user-corrected
    historical data: a merged detection box like "23 12" (shots value sitting
    next to hits) used to silently return 23 (the first regex match) when the
    real value was 12; a differently-formatted value anchored to the wrong
    field, like "04:00" or "72.7%" landing on a plain-int field (FACEOFFS
    WON, SHORTHANDED GOALS), used to silently return 4 or 72. Any raw text
    with more than one separate digit run is now treated as unparseable
    rather than guessing which one is right."""
    assert parse_int("23 12") is None
    assert parse_int("04:00") is None
    assert parse_int("72.7%") is None


def test_parse_mmss_valid() -> None:
    assert parse_mmss("06:41") == 401
    assert parse_mmss("00:00") == 0


def test_parse_mmss_rejects_invalid_seconds() -> None:
    assert parse_mmss("04:60") is None
    assert parse_mmss("04:99") is None


def test_parse_mmss_invalid_format() -> None:
    assert parse_mmss("abc") is None


def test_parse_pct_valid() -> None:
    assert parse_pct("81.9%") == 81.9
    assert parse_pct("80%") == 80.0


def test_parse_pct_rejects_out_of_range() -> None:
    assert parse_pct("150%") is None


def test_parse_pct_rejects_leftover_digits() -> None:
    """Real production mismatch: a mm:ss TIME ON ATTACK value ("07:39")
    anchored to the PASSING field used to silently return 7.0 (matching just
    the "07" before the colon) instead of being flagged unparseable."""
    assert parse_pct("07:39") is None
    assert parse_pct("10:29") is None
    assert parse_pct("81.9%") == 81.9


def test_parse_fraction_valid() -> None:
    assert parse_fraction("2/2") == (2, 2)
    assert parse_fraction("0 / 2") == (0, 2)


def test_parse_fraction_rejects_made_greater_than_total() -> None:
    assert parse_fraction("3/2") is None


def test_parse_field_returns_validity_flag() -> None:
    value, is_valid = parse_field("int", "18")
    assert value == 18
    assert is_valid is True

    value, is_valid = parse_field("int", "")
    assert value is None
    assert is_valid is False

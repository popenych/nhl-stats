import re

_INT_RE = re.compile(r"(\d+)")
_MMSS_RE = re.compile(r"(\d{1,3}):(\d{2})")
_PCT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%?")
_FRACTION_RE = re.compile(r"(\d+)\s*/\s*(\d+)")


# No per-game counting stat here (shots, hits, faceoffs won, goals, shorthanded
# goals) plausibly reaches 3 digits. This catches the real failure mode where
# the detector merges two adjacent rows' values into one box — e.g. away
# shots "14" + away hits "25" read as a single "1425" — rather than silently
# accepting an impossible reading as if it were a confident, correct one.
MAX_PLAUSIBLE_INT = 99


def parse_int(text: str) -> int | None:
    matches = _INT_RE.findall(text)
    if not matches:
        return None
    # More than one separate digit run means either two rows' values got
    # merged into a single detection box with a separator between them
    # (e.g. "23 12" — the real hits value sitting right next to shots), or a
    # differently-formatted value (mm:ss, a percentage) got anchored to this
    # field entirely (e.g. "04:00" or "72.7%" landing on FACEOFFS WON).
    # Blindly taking the first digit run silently returns the wrong number
    # in both cases — every one of these was a real production mismatch
    # (confirmed against user-corrected historical data) — so treat it the
    # same as an unparseable reading rather than guessing.
    if len(matches) > 1:
        return None
    value = int(matches[0])
    if value > MAX_PLAUSIBLE_INT:
        return None
    return value


def parse_mmss(text: str) -> int | None:
    """Returns total seconds, or None if unparseable."""
    match = _MMSS_RE.search(text)
    if not match:
        return None
    minutes, seconds = int(match.group(1)), int(match.group(2))
    if seconds >= 60:
        return None
    return minutes * 60 + seconds


def parse_pct(text: str) -> float | None:
    match = _PCT_RE.search(text)
    if not match:
        return None
    # A legitimate percentage's own match already spans every digit in a
    # clean reading (e.g. "81.9%" is consumed whole). Digits left over
    # outside the match — e.g. "07:39" matches "07" but leaves ":39" — mean
    # a differently-formatted value (mm:ss, most often) bled into this
    # field; same reasoning as parse_int's multi-digit-group rejection,
    # just detected differently since a pct match can itself span more than
    # one digit run (integer + decimal parts).
    remainder = text[: match.start()] + text[match.end() :]
    if re.search(r"\d", remainder):
        return None
    value = float(match.group(1))
    if not (0 <= value <= 100):
        return None
    return value


def parse_fraction(text: str) -> tuple[int, int] | None:
    """Returns (made, total), or None if unparseable or made > total."""
    match = _FRACTION_RE.search(text)
    if not match:
        return None
    made, total = int(match.group(1)), int(match.group(2))
    if made > total:
        return None
    return made, total


def parse_text(text: str) -> str | None:
    """Normalizes a team abbreviation-ish read: letters only, uppercased.
    No length constraint — custom teams can have abbreviations of any
    length (see the plan's note on this)."""
    cleaned = re.sub(r"[^A-Za-z]", "", text).upper()
    return cleaned or None


PARSERS = {
    "int": parse_int,
    "mmss": parse_mmss,
    "pct": parse_pct,
    "frac": parse_fraction,
    "text": parse_text,
}


def parse_field(kind: str, text: str) -> tuple[object | None, bool]:
    """Returns (parsed_value, is_valid). `is_valid=False` means the raw text
    didn't match the expected format for this field kind — used to gate
    confidence downward even when the OCR engine itself reported high
    confidence on the (implausible) reading."""
    parser = PARSERS[kind]
    value = parser(text)
    return value, value is not None

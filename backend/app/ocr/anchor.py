import re
import statistics

from app.ocr.recognize import DetectedText

# (field name, normalized row label text)
ROW_LABELS: list[tuple[str, str]] = [
    ("shots", "TOTALSHOTS"),
    ("hits", "HITS"),
    ("time_on_attack_seconds", "TIMEONATTACK"),
    ("passing_pct", "PASSING"),
    ("faceoffs_won", "FACEOFFSWON"),
    ("penalty_minutes_seconds", "PENALTYMINUTES"),
    ("powerplays", "POWERPLAYS"),
    ("powerplay_minutes_seconds", "POWERPLAYMINUTES"),
    ("shorthanded_goals", "SHORTHANDEDGOALS"),
]
FIELD_KIND: dict[str, str] = {
    "shots": "int",
    "hits": "int",
    "time_on_attack_seconds": "mmss",
    "passing_pct": "pct",
    "faceoffs_won": "int",
    "penalty_minutes_seconds": "mmss",
    "powerplays": "frac",
    "powerplay_minutes_seconds": "mmss",
    "shorthanded_goals": "int",
    "goals": "int",
    "team_abbreviation": "text",
}
KNOWN_LABEL_TEXTS = {label for _, label in ROW_LABELS}

# A candidate more than this many row-heights away from its label is
# rejected rather than guessed at — better to report the field as missing
# than to silently grab an unrelated piece of text.
MAX_ROW_DISTANCE_FACTOR = 0.7
DEFAULT_ROW_HEIGHT = 60.0  # fallback if fewer than 2 labels were found

# The score box reads like "2-1" or "2 - 1" (space handling varies by photo).
SCORE_RE = re.compile(r"^(\d{1,2})\s*-\s*(\d{1,2})$")


def _normalize_label(text: str) -> str:
    return re.sub(r"[^A-Z]", "", text.upper())


def find_label_anchors(detections: list[DetectedText]) -> dict[str, DetectedText]:
    anchors: dict[str, DetectedText] = {}
    for field, label_norm in ROW_LABELS:
        for d in detections:
            if _normalize_label(d.text) == label_norm:
                anchors[field] = d
                break
    return anchors


def _estimate_row_height(anchors: dict[str, DetectedText]) -> float:
    ys = sorted(a.center[1] for a in anchors.values())
    if len(ys) < 2:
        return DEFAULT_ROW_HEIGHT
    gaps = [b - a for a, b in zip(ys, ys[1:], strict=False) if b - a > 1]
    return statistics.median(gaps) if gaps else DEFAULT_ROW_HEIGHT


def _nearest(
    candidates: list[DetectedText], target_y: float, max_distance: float
) -> DetectedText | None:
    if not candidates:
        return None
    best = min(candidates, key=lambda d: abs(d.center[1] - target_y))
    return best if abs(best.center[1] - target_y) <= max_distance else None


def assign_side_values(
    detections: list[DetectedText], anchors: dict[str, DetectedText]
) -> tuple[dict[str, DetectedText | None], dict[str, DetectedText | None]]:
    """Returns (away_values, home_values) — for each field, the detection
    box (if any) judged to be that field's value, based on proximity to the
    row's label anchor and left/right position relative to the labels'
    average x (labels sit in a center column between the two value
    columns)."""
    if not anchors:
        empty: dict[str, DetectedText | None] = {field: None for field, _ in ROW_LABELS}
        return dict(empty), dict(empty)

    center_x = statistics.mean(a.center[0] for a in anchors.values())
    row_height = _estimate_row_height(anchors)
    max_distance = row_height * MAX_ROW_DISTANCE_FACTOR

    value_pool = [d for d in detections if _normalize_label(d.text) not in KNOWN_LABEL_TEXTS]
    left_pool = [d for d in value_pool if d.center[0] < center_x]
    right_pool = [d for d in value_pool if d.center[0] >= center_x]

    away: dict[str, DetectedText | None] = {}
    home: dict[str, DetectedText | None] = {}
    for field, _label in ROW_LABELS:
        anchor = anchors.get(field)
        if anchor is None:
            away[field] = None
            home[field] = None
            continue
        away[field] = _nearest(left_pool, anchor.center[1], max_distance)
        home[field] = _nearest(right_pool, anchor.center[1], max_distance)

    return away, home


def find_header_info(
    detections: list[DetectedText], anchors: dict[str, DetectedText]
) -> tuple[DetectedText | None, DetectedText | None, DetectedText | None]:
    """Returns (score_box, away_team_text, home_team_text) from the header
    area above the first stat row — team crests/abbreviation + boxed score
    (e.g. "OTT  2-1  NSH"). Score box is found by pattern match; the two
    team abbreviations are whatever's nearest it on each side, which
    naturally filters out unrelated header noise (e.g. a jersey number
    visible in the background photo strip) since real team abbreviations
    sit right next to the score box."""
    first_field = ROW_LABELS[0][0]
    first_anchor = anchors.get(first_field)
    if first_anchor is None:
        return None, None, None

    row_height = _estimate_row_height(anchors)
    header_cutoff = first_anchor.center[1] - 0.5 * row_height
    header = [d for d in detections if d.center[1] < header_cutoff]

    score_box = next((d for d in header if SCORE_RE.match(d.text.replace(" ", ""))), None)
    if score_box is None:
        return None, None, None

    others = [d for d in header if d is not score_box]
    left = [d for d in others if d.center[0] < score_box.center[0]]
    right = [d for d in others if d.center[0] > score_box.center[0]]
    away_team = min(left, key=lambda d: score_box.center[0] - d.center[0], default=None)
    home_team = min(right, key=lambda d: d.center[0] - score_box.center[0], default=None)

    return score_box, away_team, home_team

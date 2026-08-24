"""Hand-verified ground truth for the 3 real sample photos, transcribed by
directly reading each photo and cross-checked with the user."""

from pathlib import Path
from typing import Any

FIXTURES_DIR = Path(__file__).parent

FIXTURES: dict[int, dict[str, Any]] = {
    1: {
        "file": FIXTURES_DIR / "stats_example_1.jpeg",
        "away_team": "OTT",
        "home_team": "NSH",
        "away": {
            "goals": 2,
            "shots": 18,
            "hits": 11,
            "time_on_attack_seconds": 401,
            "passing_pct": 81.9,
            "faceoffs_won": 7,
            "penalty_minutes_seconds": 240,
            "powerplays": (2, 2),
            "powerplay_minutes_seconds": 204,
            "shorthanded_goals": 0,
        },
        "home": {
            "goals": 1,
            "shots": 16,
            "hits": 14,
            "time_on_attack_seconds": 671,
            "passing_pct": 80.0,
            "faceoffs_won": 8,
            "penalty_minutes_seconds": 240,
            "powerplays": (0, 2),
            "powerplay_minutes_seconds": 240,
            "shorthanded_goals": 0,
        },
    },
    2: {
        "file": FIXTURES_DIR / "stats_example_2.jpeg",
        "away_team": "VGK",
        "home_team": "COL",
        "away": {
            "goals": 1,
            "shots": 9,
            "hits": 18,
            "time_on_attack_seconds": 420,
            "passing_pct": 67.2,
            "faceoffs_won": 7,
            "penalty_minutes_seconds": 240,
            "powerplays": (1, 1),
            "powerplay_minutes_seconds": 69,
            "shorthanded_goals": 0,
        },
        "home": {
            "goals": 5,
            "shots": 22,
            "hits": 20,
            "time_on_attack_seconds": 756,
            "passing_pct": 83.6,
            "faceoffs_won": 12,
            "penalty_minutes_seconds": 120,
            "powerplays": (1, 2),
            "powerplay_minutes_seconds": 186,
            "shorthanded_goals": 0,
        },
    },
    3: {
        "file": FIXTURES_DIR / "stats_example_3.jpg",
        "away_team": "OTT",
        "home_team": "BOS",
        "away": {
            "goals": 0,
            "shots": 11,
            "hits": 11,
            "time_on_attack_seconds": 461,
            "passing_pct": 71.6,
            "faceoffs_won": 3,
            "penalty_minutes_seconds": 120,
            "powerplays": (0, 0),
            "powerplay_minutes_seconds": 0,
            "shorthanded_goals": 0,
        },
        "home": {
            "goals": 1,
            "shots": 22,
            "hits": 9,
            "time_on_attack_seconds": 519,
            "passing_pct": 87.9,
            "faceoffs_won": 9,
            "penalty_minutes_seconds": 0,
            "powerplays": (0, 1),
            "powerplay_minutes_seconds": 120,
            "shorthanded_goals": 0,
        },
    },
}

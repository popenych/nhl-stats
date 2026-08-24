from typing import Any

from pydantic import BaseModel

from app.models.team import Team
from app.ocr.pipeline import ExtractionResult, FieldExtraction
from app.schemas.team import TeamOut


class OcrFieldResult(BaseModel):
    raw_text: str
    value: Any
    confidence: float


class OcrTeamGuess(BaseModel):
    raw_text: str
    confidence: float
    team_id: int | None
    team: TeamOut | None


class OcrSideResult(BaseModel):
    goals: OcrFieldResult
    shots: OcrFieldResult
    hits: OcrFieldResult
    time_on_attack_seconds: OcrFieldResult
    passing_pct: OcrFieldResult
    faceoffs_won: OcrFieldResult
    penalty_minutes_seconds: OcrFieldResult
    powerplay_goals: OcrFieldResult
    powerplay_total: OcrFieldResult
    powerplay_minutes_seconds: OcrFieldResult
    shorthanded_goals: OcrFieldResult


class ExtractResponse(BaseModel):
    photo_path: str
    home: OcrSideResult
    away: OcrSideResult
    home_team_guess: OcrTeamGuess
    away_team_guess: OcrTeamGuess
    # How many of the 9 row labels were even found in the photo — a quick
    # overall-quality signal for the frontend to show a "couldn't read this
    # photo well, please check every field" banner when it's low.
    labels_found: int
    labels_expected: int


def _field_result(fe: FieldExtraction) -> OcrFieldResult:
    return OcrFieldResult(raw_text=fe.raw_text, value=fe.value, confidence=fe.confidence)


def _side_result(side: dict[str, FieldExtraction]) -> OcrSideResult:
    powerplays = side["powerplays"]
    made, total = powerplays.value if powerplays.value is not None else (None, None)

    return OcrSideResult(
        goals=_field_result(side["goals"]),
        shots=_field_result(side["shots"]),
        hits=_field_result(side["hits"]),
        time_on_attack_seconds=_field_result(side["time_on_attack_seconds"]),
        passing_pct=_field_result(side["passing_pct"]),
        faceoffs_won=_field_result(side["faceoffs_won"]),
        penalty_minutes_seconds=_field_result(side["penalty_minutes_seconds"]),
        powerplay_goals=OcrFieldResult(
            raw_text=powerplays.raw_text, value=made, confidence=powerplays.confidence
        ),
        powerplay_total=OcrFieldResult(
            raw_text=powerplays.raw_text, value=total, confidence=powerplays.confidence
        ),
        powerplay_minutes_seconds=_field_result(side["powerplay_minutes_seconds"]),
        shorthanded_goals=_field_result(side["shorthanded_goals"]),
    )


def _team_guess(fe: FieldExtraction | None, matched_team: Team | None) -> OcrTeamGuess:
    if fe is None:
        return OcrTeamGuess(raw_text="", confidence=0.0, team_id=None, team=None)
    return OcrTeamGuess(
        raw_text=fe.raw_text,
        confidence=fe.confidence,
        team_id=matched_team.id if matched_team else None,
        team=TeamOut.model_validate(matched_team) if matched_team else None,
    )


def to_extract_response(
    result: ExtractionResult,
    photo_path: str,
    away_team_match: Team | None,
    home_team_match: Team | None,
) -> ExtractResponse:
    return ExtractResponse(
        photo_path=photo_path,
        home=_side_result(result.home),
        away=_side_result(result.away),
        away_team_guess=_team_guess(result.away_team, away_team_match),
        home_team_guess=_team_guess(result.home_team, home_team_match),
        labels_found=result.labels_found,
        labels_expected=9,
    )

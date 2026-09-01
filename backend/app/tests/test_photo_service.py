from app.services.photo_service import slugify


def test_slugify_replaces_whitespace_with_hyphens() -> None:
    assert slugify("Ottawa Senators") == "Ottawa-Senators"


def test_slugify_strips_punctuation() -> None:
    assert slugify("Alex's place!") == "Alexs-place"


def test_slugify_preserves_non_ascii_names() -> None:
    # Real player names in this app are often Cyrillic — must not be
    # transliterated or stripped, just made filename-friendly.
    assert slugify("Саша") == "Саша"


def test_slugify_collapses_repeated_whitespace() -> None:
    assert slugify("NHL   26") == "NHL-26"


def test_slugify_empty_string_has_a_fallback() -> None:
    assert slugify("") == "x"
    assert slugify("   ") == "x"

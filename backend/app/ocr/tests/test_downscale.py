import numpy as np

from app.ocr.pipeline import MAX_IMAGE_SIDE, _downscale


def test_downscale_leaves_small_images_untouched() -> None:
    img = np.zeros((960, 1280, 3), dtype=np.uint8)

    result = _downscale(img, MAX_IMAGE_SIDE)

    assert result.shape == img.shape


def test_downscale_caps_longest_side_preserving_aspect_ratio() -> None:
    img = np.zeros((4032, 3024, 3), dtype=np.uint8)  # real photo dims that OOM'd in prod

    result = _downscale(img, MAX_IMAGE_SIDE)

    height, width = result.shape[:2]
    assert max(height, width) == MAX_IMAGE_SIDE
    assert abs(width / height - 3024 / 4032) < 0.01

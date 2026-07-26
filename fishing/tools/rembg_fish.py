"""Segment generated fish artwork and normalize it onto transparent canvases."""
from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


def normalize(image: Image.Image, canvas_size: int = 1024, subject_size: int = 880) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
    if not bbox:
        raise RuntimeError("No foreground detected")
    subject = image.crop(bbox)
    scale = min(subject_size / subject.width, subject_size / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(
        subject,
        ((canvas_size - subject.width) // 2, (canvas_size - subject.height) // 2),
    )
    return canvas


def cutout(path: Path, session) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    result = remove(
        source,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=8,
        post_process_mask=True,
    )
    if not isinstance(result, Image.Image):
        result = Image.open(io.BytesIO(result)).convert("RGBA")
    return normalize(result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("assets/fish-original"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ids", nargs="+", type=int, required=True)
    parser.add_argument("--model", default="isnet-general-use")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    session = new_session(args.model)
    for index, fish_id in enumerate(args.ids, 1):
        source = args.input / f"{fish_id}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        output = args.output / source.name
        cutout(source, session).save(output, optimize=True)
        print(f"[{index}/{len(args.ids)}] {fish_id} -> {output}", flush=True)


if __name__ == "__main__":
    main()

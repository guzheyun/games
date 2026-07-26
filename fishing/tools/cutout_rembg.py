"""Semantic background removal for fish art using rembg (isnet-general-use).

Color flood-fill fails when the subject shares colors with the background
(e.g. a cyan manta ray on an aurora-ice backdrop). A saliency/segmentation
model keeps the whole subject regardless of color. Output matches the legacy
format: subject cropped, scaled to fit, centered on a 1024 transparent canvas.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


def process(src_path: Path, out_path: Path, session, max_side: int, canvas: int,
            floor: int) -> tuple:
    src = Image.open(src_path).convert("RGBA")
    cut = remove(src, session=session, post_process_mask=True)

    alpha = cut.getchannel("A")
    # Kill near-invisible noise only; keep genuine translucent edges/glow.
    if floor > 0:
        alpha = alpha.point(lambda a: 0 if a < floor else a)
        cut.putalpha(alpha)

    bbox = alpha.point(lambda a: 255 if a > floor else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"No foreground detected: {src_path}")
    subject = cut.crop(bbox)
    scale = min(max_side / subject.width, max_side / subject.height, 2)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.alpha_composite(subject, ((canvas - subject.width) // 2, (canvas - subject.height) // 2))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(out_path, optimize=True)
    return bbox


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, default=Path("assets/fish-original"))
    p.add_argument("--output", type=Path, default=Path("assets/fish"))
    p.add_argument("--ids", nargs="*", type=int)
    p.add_argument("--model", default="isnet-general-use")
    p.add_argument("--max-side", type=int, default=880)
    p.add_argument("--canvas", type=int, default=1024)
    p.add_argument("--floor", type=int, default=10)
    args = p.parse_args()

    session = new_session(args.model)
    files = sorted(args.input.glob("*.png"), key=lambda q: int(q.stem))
    if args.ids is not None:
        wanted = set(args.ids)
        files = [q for q in files if int(q.stem) in wanted]
    for i, path in enumerate(files, 1):
        bbox = process(path, args.output / path.name, session, args.max_side, args.canvas, args.floor)
        print(f"[{i}/{len(files)}] {path.name}: bbox={bbox}")


if __name__ == "__main__":
    main()

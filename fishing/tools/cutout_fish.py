"""Batch-remove connected backgrounds from generated fish art.

Uses border-color clustering plus flood fill, preserving light markings inside
the animal while making only background regions connected to the canvas edge
transparent. Outputs are centered on a transparent square canvas.
"""
from __future__ import annotations

import argparse
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def dist2(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3))


def border_samples(im: Image.Image, step: int = 8):
    px, w, h = im.load(), im.width, im.height
    out = []
    for x in range(0, w, step):
        out.extend((px[x, 0][:3], px[x, h - 1][:3]))
    for y in range(0, h, step):
        out.extend((px[0, y][:3], px[w - 1, y][:3]))
    return out


def cluster(samples, k=6, iterations=10):
    centers = [samples[int(i * (len(samples) - 1) / max(1, k - 1))] for i in range(k)]
    for _ in range(iterations):
        groups = [[0, 0, 0, 0] for _ in centers]
        for p in samples:
            idx = min(range(len(centers)), key=lambda i: dist2(p, centers[i]))
            g = groups[idx]
            g[0] += p[0]; g[1] += p[1]; g[2] += p[2]; g[3] += 1
        for i, g in enumerate(groups):
            if g[3]:
                centers[i] = tuple(round(g[c] / g[3]) for c in range(3))
    return centers


def cutout(path: Path, output: Path):
    src = Image.open(path).convert("RGBA")
    # Work at half size for fast, stable segmentation; restore at the end.
    work = src.resize((512, 512), Image.Resampling.LANCZOS)
    pix, w, h = work.load(), work.width, work.height
    samples = border_samples(work, 4)
    centers = cluster(samples)

    # Derive tolerance from natural variation inside each border cluster.
    deviations = []
    for p in samples:
        deviations.append(math.sqrt(min(dist2(p, c) for c in centers)))
    deviations.sort()
    p85 = deviations[int(len(deviations) * .85)]
    hard = max(34, min(82, p85 * 1.45 + 18))
    soft = min(125, hard + 34)
    hard2, soft2 = hard * hard, soft * soft

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        pos = y * w + x
        if seen[pos]:
            continue
        seen[pos] = 1
        d = min(dist2(pix[x, y], c) for c in centers)
        if d > soft2:
            continue
        if d <= hard2:
            ap[x, y] = 0
        else:
            ap[x, y] = round(255 * (d - hard2) / (soft2 - hard2))
        if x: q.append((x - 1, y))
        if x + 1 < w: q.append((x + 1, y))
        if y: q.append((x, y - 1))
        if y + 1 < h: q.append((x, y + 1))

    alpha = alpha.filter(ImageFilter.GaussianBlur(.65))
    work.putalpha(alpha)
    bbox = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"No foreground detected: {path}")
    subject = work.crop(bbox)
    max_side = 880
    scale = min(max_side / subject.width, max_side / subject.height, 2)
    subject = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((1024 - subject.width) // 2, (1024 - subject.height) // 2))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    return hard, bbox


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("assets/fish"))
    parser.add_argument("--output", type=Path, default=Path("assets/fish-cutout"))
    parser.add_argument("--ids", nargs="*", type=int)
    args = parser.parse_args()
    files = sorted(args.input.glob("*.png"), key=lambda p: int(p.stem))
    if args.ids is not None:
        wanted = set(args.ids)
        files = [p for p in files if int(p.stem) in wanted]
    for i, path in enumerate(files, 1):
        hard, bbox = cutout(path, args.output / path.name)
        print(f"[{i}/{len(files)}] {path.name}: tolerance={hard:.1f}, bbox={bbox}")


if __name__ == "__main__":
    main()

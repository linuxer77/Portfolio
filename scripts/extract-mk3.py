#!/usr/bin/env python3
"""Pack the frames MORTAL KOMBAT mode needs into one atlas per fighter.

Usage: python3 scripts/extract-mk3.py SPRITES_DIR [--preview DIR]

SPRITES_DIR holds the UMK3 frame rips from mortalkombatwarehouse.com, one folder per
fighter (scorpion/, subzero/), each with the site's own layout (stance/01.png, kick/r05.png…).
Writes public/mk3/<fighter>.png and public/mk3/<fighter>.json:
{"frames": {name: [x, y, w, h, anchorX, anchorY]}, "anims": {name: frameCount}}.
The anchor sits between the feet on the floor, so frames of different sizes line up.
--preview writes one onion-skin image per animation to DIR, to check the alignment.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "mk3"


def seq(prefix: str, names: str) -> list[str]:
    return [f"{prefix}/{n}" for n in names.split()]


def nums(prefix: str, a: int, b: int, lead: str = "") -> list[str]:
    return [f"{prefix}/{lead}{i:02d}" for i in range(a, b + 1)]


# The ninjas are palette swaps in the arcade too: both rips share these frame names.
COMMON = {
    "stance": nums("stance", 1, 9),
    "walk": nums("walk", 1, 9),
    "run": nums("run", 1, 12),
    "crouch": seq("duckjump", "d01 d02 d03"),
    "jump": seq("duckjump", "j01 j02 j03"),
    "flip": nums("duckjump", 1, 8, "f"),
    "hp": nums("punch", 1, 3),
    "hp2": nums("punch", 4, 6),
    "lp": nums("punch", 8, 10),
    "lp2": nums("punch", 11, 13),
    "uppercut": nums("punch", 1, 5, "u"),
    "crouchPunch": nums("punch", 1, 3, "d"),
    "jumpPunch": seq("punch", "a01 a02 a03"),
    "lk": nums("kick", 1, 6),
    "hk": nums("kick", 7, 12),
    "roundhouse": nums("kick", 1, 8, "r"),
    "sweep": nums("kick", 1, 8, "s"),
    "crouchKick": nums("kick", 1, 7, "d"),
    "jumpKick": seq("kick", "a01 a02 a03"),
    "flipKick": seq("kick", "a04 a05 a06"),
    "block": nums("block", 1, 3),
    "crouchBlock": nums("block", 1, 3, "d"),
    "throw": nums("throw", 1, 8),
    "hitHigh": nums("beinghit", 1, 3, "h"),
    "hitLow": nums("beinghit", 1, 3, "l"),
    "crouchHit": nums("beinghit", 1, 3, "d"),
    "stagger": nums("beinghit", 1, 8, "s"),
    "thrown": nums("beinghit", 1, 6, "t"),
    "fall": nums("fall", 1, 8, "h"),
    "getup": nums("fall", 9, 13, "h"),
    "timber": nums("fall", 1, 6, "f"),
    "dizzy": nums("dizzy", 1, 8),
    # what happens to this fighter when the other one finishes them
    "burn": nums("bodyparts", 1, 12, "r"),
    "skeleton": seq("bodyparts", "e02"),
    "collapse": nums("bodyparts", 1, 4, "sr"),
}

OWN = {
    "scorpion": {
        "victory": nums("victory", 1, 6),
        "spear": nums("special", 101, 108),
        "teleport": seq("special", "201"),
        "unmask": nums("finishers", 101, 107, "f"),
        "fire": nums("finishers", 108, 112, "f"),
    },
    "subzero": {
        "victory": nums("victory", 1, 3),
        "freeze": nums("special", 101, 103),
        "iceball": nums("special", 104, 119),
        "groundFreeze": nums("special", 201, 203),
        "groundIce": nums("special", 204, 216),
        "slide": nums("special", 301, 302),
        "geyser": nums("finishers", 101, 104, "f"),
    },
}

# Airborne, lying and effect frames are anchored on their box centre instead of the feet.
CENTRED = {
    "jump", "flip", "jumpPunch", "jumpKick", "flipKick", "fall", "thrown", "teleport",
    "fire", "iceball", "skeleton",
}
# Fine horizontal corrections per frame (art px, + moves the sprite right when drawn).
NUDGE: dict[str, int] = {}


def anchor(img: Image.Image, anim: str, name: str) -> tuple[int, int]:
    w, h = img.size
    a = img.getchannel("A")
    if anim in CENTRED:
        ax = w // 2
    else:
        # midpoint between the back and front foot on the bottom rows
        xs = [x for y in range(max(0, h - 6), h) for x in range(w) if a.getpixel((x, y)) > 0]
        ax = (min(xs) + max(xs)) // 2 if xs else w // 2
    return ax - NUDGE.get(name, 0), h


def build(src: Path, fighter: str, preview: Path | None) -> None:
    anims = {**COMMON, **OWN[fighter]}
    names = sorted({n for frames in anims.values() for n in frames})
    crops = {}
    for n in names:
        img = Image.open(src / fighter / f"{n}.png").convert("RGBA")
        box = img.getbbox()
        crops[n] = img.crop(box) if box else img

    # shelf-pack into a 1024-wide atlas, 1px apart
    order = sorted(names, key=lambda n: -crops[n].height)
    atlas_w, x, y, shelf = 1024, 0, 0, 0
    places = {}
    for n in order:
        w, h = crops[n].size
        if x + w > atlas_w:
            x, y, shelf = 0, y + shelf + 1, 0
        places[n] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    atlas = Image.new("RGBA", (atlas_w, y + shelf))
    for n, (px, py) in places.items():
        atlas.paste(crops[n], (px, py))

    meta = {}
    for anim, frames in anims.items():
        for i, n in enumerate(frames):
            px, py = places[n]
            ax, ay = anchor(crops[n], anim, n)
            meta[f"{anim}{i}"] = [px, py, *crops[n].size, ax, ay]

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f"{fighter}.png", optimize=True)
    (OUT / f"{fighter}.json").write_text(json.dumps({"frames": meta, "anims": {k: len(v) for k, v in anims.items()}}))
    print(f"{fighter}: atlas {atlas.size[0]}x{atlas.size[1]}, {len(meta)} frames")

    if preview:
        preview.mkdir(parents=True, exist_ok=True)
        for anim, frames in anims.items():
            cell = 200
            img = Image.new("RGBA", (cell * (len(frames) + 1), 190), (40, 40, 60, 255))
            dr = ImageDraw.Draw(img)
            for i, n in enumerate(frames):
                c = crops[n]
                ax, ay = anchor(c, anim, n)
                img.alpha_composite(c, (cell * i + 100 - ax, 180 - ay))
                ghost = c.copy()
                ghost.putalpha(ghost.getchannel("A").point(lambda v: v // 3))
                img.alpha_composite(ghost, (cell * len(frames) + 100 - ax, 180 - ay))
                dr.text((cell * i + 4, 2), n.split("/")[-1], fill=(255, 255, 0, 255))
            for i in range(len(frames) + 1):
                dr.line([(cell * i + 100, 0), (cell * i + 100, 190)], fill=(255, 0, 0, 160))
            img.save(preview / f"{fighter}-{anim}.png")


def main() -> None:
    src = Path(sys.argv[1])
    preview = Path(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[2] == "--preview" else None
    for fighter in OWN:
        build(src, fighter, preview)


if __name__ == "__main__":
    main()

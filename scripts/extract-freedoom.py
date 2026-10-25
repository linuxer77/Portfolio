#!/usr/bin/env python3
"""Extract the sprites and sounds DOOM mode needs from a Freedoom IWAD.

Usage: python3 scripts/extract-freedoom.py path/to/freedoom1.wad

Writes public/doom/sprites.png (one atlas), public/doom/sprites.json
({name: [x, y, w, h, leftOffset, topOffset]}) and public/doom/sounds/*.wav.
Freedoom is BSD licensed; its COPYING.txt ships next to the assets.
"""

import json
import struct
import sys
import wave
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "doom"


def frames(prefix: str, letters: str, rotation: str) -> list[str]:
    return [f"{prefix}{c}{rotation}" for c in letters]


SPRITES = [
    # first-person weapons and muzzle flashes
    *frames("PISG", "ABCDE", "0"), "PISFA0",
    *frames("SHTG", "ABCD", "0"), *frames("SHTF", "AB", "0"),
    *frames("CHGG", "AB", "0"), *frames("CHGF", "AB", "0"),
    *frames("MISG", "AB", "0"), *frames("MISF", "ABCD", "0"),
    # projectiles and effects
    "MISLA1", *frames("MISL", "BCD", "0"),
    *frames("PUFF", "ABCD", "0"), *frames("BLUD", "ABC", "0"),
    *frames("BAL1", "ABCDE", "0"), *frames("TFOG", "ABCDEFGHIJ", "0"),
    # monsters, front-facing: walk, attack, pain, death
    *frames("TROO", "ABCDEFGH", "1"), *frames("TROO", "IJKLM", "0"),
    *frames("POSS", "ABCDEFG", "1"), *frames("POSS", "HIJKL", "0"),
    # pickups
    "SHOTA0", "MGUNA0", "LAUNA0", "CLIPA0", "SHELA0", "ROCKA0", "STIMA0", "MEDIA0",
    *frames("ARM1", "AB", "0"), *frames("BON1", "ABCD", "0"),
    # status bar, numbers, face
    "STBAR", "STARMS", "STTPRCNT", "STTMINUS",
    *[f"STTNUM{i}" for i in range(10)], *[f"STYSNUM{i}" for i in range(10)], *[f"STGNUM{i}" for i in range(10)],
    *[f"STFST{h}{l}" for h in range(5) for l in range(3)],
    *[f"STFOUCH{h}" for h in range(5)], *[f"STFEVL{h}" for h in range(5)], "STFDEAD0", "STFGOD0",
    # HUD message font
    *[f"STCFN{c:03d}" for c in range(33, 96)],
]

SOUNDS = [
    "DSPISTOL", "DSSHOTGN", "DSSGCOCK", "DSRLAUNC", "DSBAREXP", "DSFIRSHT", "DSFIRXPL",
    "DSPLPAIN", "DSPOPAIN", "DSITEMUP", "DSWPNUP", "DSTELEPT", "DSPOSIT1", "DSBGSIT1",
    "DSPLDETH", "DSPODTH1", "DSBGDTH1", "DSPUNCH", "DSGETPOW", "DSNOWAY", "DSITMBK",
]


def read_wad(path: str) -> dict[str, bytes]:
    data = Path(path).read_bytes()
    _, count, offset = struct.unpack_from("<4sii", data, 0)
    lumps = {}
    for i in range(count):
        pos, size, name = struct.unpack_from("<ii8s", data, offset + 16 * i)
        lumps.setdefault(name.rstrip(b"\0").decode("ascii"), data[pos : pos + size])
    return lumps


def decode_patch(raw: bytes, palette: list[tuple[int, int, int]]) -> tuple[Image.Image, int, int]:
    width, height, left, top = struct.unpack_from("<HHhh", raw, 0)
    img = Image.new("RGBA", (width, height))
    px = img.load()
    for x in range(width):
        (pos,) = struct.unpack_from("<I", raw, 8 + 4 * x)
        while raw[pos] != 0xFF:
            row, length = raw[pos], raw[pos + 1]
            for i in range(length):
                y = row + i
                if y < height:
                    px[x, y] = (*palette[raw[pos + 3 + i]], 255)
            pos += length + 4
    return img, left, top


def pack(images: dict[str, Image.Image], width: int = 1024) -> dict[str, tuple[int, int]]:
    """Simple shelf packing, tallest first."""
    places = {}
    x = y = shelf = 0
    for name in sorted(images, key=lambda n: -images[n].height):
        w, h = images[name].size
        if x + w > width:
            x, y, shelf = 0, y + shelf + 1, 0
        places[name] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    return places


def write_wav(raw: bytes, path: Path) -> None:
    fmt, rate, count = struct.unpack_from("<HHI", raw, 0)
    assert fmt == 3, f"{path.name}: not a DMX sound"
    samples = raw[8 : 8 + count][16:-16]  # DMX pads each sound with 16 bytes at both ends
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(1)  # 8-bit unsigned PCM
        w.setframerate(rate)
        w.writeframes(samples)


def main() -> None:
    lumps = read_wad(sys.argv[1])
    pal = lumps["PLAYPAL"]
    palette = [tuple(pal[i * 3 : i * 3 + 3]) for i in range(256)]

    images, offsets = {}, {}
    for name in SPRITES:
        images[name], *offsets[name] = decode_patch(lumps[name], palette)

    places = pack(images)
    height = max(places[n][1] + images[n].height for n in images)
    atlas = Image.new("RGBA", (1024, height))
    meta = {}
    for name, (x, y) in places.items():
        atlas.paste(images[name], (x, y))
        meta[name] = [x, y, *images[name].size, *offsets[name]]

    (OUT / "sounds").mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "sprites.png", optimize=True)
    (OUT / "sprites.json").write_text(json.dumps(meta, separators=(",", ":")))
    for name in SOUNDS:
        write_wav(lumps[name], OUT / "sounds" / f"{name[2:].lower()}.wav")
    print(f"{len(meta)} sprites in a 1024x{height} atlas, {len(SOUNDS)} sounds")


if __name__ == "__main__":
    main()

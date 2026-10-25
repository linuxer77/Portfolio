#!/usr/bin/env python3
"""Cut the frames STREET FIGHTER mode needs out of the Ryu sprite sheet.

Usage: python3 scripts/extract-sf2.py [--preview DIR]

Reads public/arcade/sf2/ryu_sheet.png and writes public/sf2/ryu.png (one atlas) and
public/sf2/ryu.json ({name: [x, y, w, h, anchorX, anchorY]}). The anchor is the point
between the feet on the floor, so frames of different sizes line up when drawn there.
--preview writes one onion-skin image per animation to DIR, to check the alignment.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "public" / "arcade" / "sf2" / "ryu_sheet.png"
OUT = ROOT / "public" / "sf2"

# Source rectangles on the sheet, by sprite. All face right.
R = {
    0: (5, 12, 63, 94), 1: (73, 12, 64, 93), 2: (140, 11, 63, 94), 3: (209, 8, 59, 97),
    8: (549, 19, 57, 87), 9: (609, 34, 61, 73), 10: (677, 42, 65, 65),
    19: (7, 134, 57, 87), 20: (76, 129, 64, 92), 21: (150, 126, 68, 96), 22: (227, 128, 67, 94),
    23: (305, 126, 58, 95), 24: (369, 126, 54, 93), 25: (428, 122, 63, 94), 26: (493, 122, 61, 94),
    27: (557, 122, 62, 94), 28: (629, 123, 62, 95), 29: (705, 124, 61, 93), 30: (775, 126, 65, 91),
    35: (5, 266, 59, 89), 36: (65, 242, 60, 108), 37: (136, 231, 54, 93), 38: (195, 231, 58, 81),
    39: (257, 238, 52, 74), 40: (317, 232, 52, 93), 41: (373, 242, 59, 113),
    43: (615, 238, 57, 86), 44: (674, 255, 126, 48), 45: (802, 256, 75, 91), 46: (880, 259, 59, 113),
    63: (84, 463, 78, 99), 64: (173, 463, 112, 98),
    80: (85, 574, 56, 73), 81: (147, 574, 92, 68),
    99: (1386, 682, 65, 85), 100: (1461, 687, 71, 81),
    121: (3, 1053, 64, 98), 122: (75, 1053, 70, 96), 123: (150, 1052, 118, 98),
    132: (942, 1067, 74, 68), 133: (1020, 1073, 101, 64), 134: (1133, 1081, 149, 57),
    150: (862, 1179, 57, 98), 151: (927, 1179, 98, 107),
    174: (15, 1415, 78, 94), 175: (110, 1421, 89, 88), 176: (208, 1423, 94, 87), 177: (313, 1429, 110, 81),
    181: (694, 1440, 61, 32), 182: (757, 1441, 63, 31), 183: (822, 1440, 65, 34), 184: (890, 1439, 64, 34),
    189: (1240, 1421, 58, 61), 190: (1305, 1423, 64, 55),
    207: (14, 1525, 73, 108), 208: (97, 1523, 65, 87), 209: (166, 1529, 53, 69),
    212: (303, 1522, 99, 106), 213: (408, 1528, 60, 99), 214: (475, 1531, 99, 94), 215: (586, 1533, 62, 95),
    221: (97, 1687, 72, 93), 222: (174, 1649, 63, 129), 223: (242, 1650, 57, 123),
    224: (313, 1652, 53, 121), 225: (367, 1665, 63, 109),
    274: (429, 1927, 64, 92), 275: (501, 1918, 64, 101), 276: (576, 1892, 59, 126),
    284: (12, 2173, 69, 69), 285: (86, 2174, 71, 69), 286: (167, 2150, 66, 94), 287: (236, 2151, 72, 93),
    289: (395, 2155, 62, 89), 290: (468, 2158, 70, 86),
    292: (634, 2162, 86, 81), 293: (724, 2195, 106, 49), 295: (909, 2191, 124, 57),
    296: (1038, 2215, 132, 35), 297: (1172, 2218, 97, 38),
    298: (1278, 2182, 61, 74), 299: (1346, 2141, 51, 119), 300: (1420, 2182, 84, 73), 301: (1533, 2179, 58, 81),
}

# Animations, as sprite numbers in play order.
ANIMS = {
    "idle": [0, 1, 2, 3],
    "walkF": [19, 20, 21, 22, 23, 24],
    "walkB": [25, 26, 27, 28, 29, 30],
    "crouch": [9],
    "block": [8],
    "crouchBlock": [10],
    "jump": [35, 36, 37, 38, 39, 40, 41],
    "flip": [43, 44, 45, 46],
    "punch": [63, 64],
    "crouchPunch": [80, 81],
    "jumpPunch": [99, 100],
    "kick": [121, 122, 123],
    "sweep": [132, 133, 134],
    "jumpKick": [150, 151],
    "hadouken": [174, 175, 176, 177],
    "fireball": [181, 182, 183, 184],
    "splash": [189, 190],
    "shoryuken": [221, 222, 223, 224, 225],
    "tatsu": [207, 212, 213, 214, 215, 209],
    "hit": [287, 286],
    "gutHit": [289, 290],
    "crouchHit": [284, 285],
    "knockdown": [292, 293, 295, 296],
    "ko": [297],
    "getup": [298, 299, 300, 301],
    "win": [274, 275, 276],
}

# Frames that are not standing on both feet are anchored differently.
CENTRED = {36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 99, 100, 150, 151, 181, 182, 183, 184, 189, 190,
           207, 208, 209, 212, 213, 214, 215, 222, 223, 224, 225, 292, 293, 295, 296, 297, 298, 299, 300}
# Fine horizontal corrections (art pixels, + moves the sprite right when drawn).
NUDGE = {
    123: -18, 133: 20, 134: 22, 64: -10, 80: -20, 81: -10, 99: -15, 177: -8, 151: 14,
    212: 20, 214: -20, 221: -14, 300: -20, 301: -20,
}


def anchor(img: Image.Image, sid: int) -> tuple[int, int]:
    w, h = img.size
    a = img.getchannel("A")
    if sid in CENTRED:
        ax = w // 2
    else:
        # midpoint between the back and front foot on the bottom rows
        xs = [x for y in range(max(0, h - 6), h) for x in range(w) if a.getpixel((x, y)) > 0]
        ax = (min(xs) + max(xs)) // 2 if xs else w // 2
    return ax - NUDGE.get(sid, 0), h


def main() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    crops = {sid: sheet.crop((x, y, x + w, y + h)) for sid, (x, y, w, h) in R.items()}

    # shelf-pack into a 1024-wide atlas, 1px apart
    order = sorted(crops, key=lambda s: -crops[s].height)
    atlas_w, x, y, shelf = 1024, 0, 0, 0
    places = {}
    for sid in order:
        w, h = crops[sid].size
        if x + w > atlas_w:
            x, y, shelf = 0, y + shelf + 1, 0
        places[sid] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    atlas = Image.new("RGBA", (atlas_w, y + shelf))
    meta = {}
    for name, frames in ANIMS.items():
        for i, sid in enumerate(frames):
            px, py = places[sid]
            ax, ay = anchor(crops[sid], sid)
            meta[f"{name}{i}"] = [px, py, *crops[sid].size, ax, ay]
    for sid, (px, py) in places.items():
        atlas.paste(crops[sid], (px, py))

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "ryu.png", optimize=True)
    (OUT / "ryu.json").write_text(json.dumps({"frames": meta, "anims": {k: len(v) for k, v in ANIMS.items()}}))
    print(f"atlas {atlas.size[0]}x{atlas.size[1]}, {len(meta)} frames")

    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        out = Path(sys.argv[2])
        out.mkdir(parents=True, exist_ok=True)
        for name, frames in ANIMS.items():
            cell = 160
            img = Image.new("RGBA", (cell * (len(frames) + 1), 150), (40, 40, 60, 255))
            dr = ImageDraw.Draw(img)
            for i, sid in enumerate(frames):
                c = crops[sid]
                ax, ay = anchor(c, sid)
                # each frame on its own, then all of them stacked faintly in the last cell
                img.alpha_composite(c, (cell * i + 80 - ax, 140 - ay))
                ghost = c.copy()
                ghost.putalpha(ghost.getchannel("A").point(lambda v: v // 3))
                img.alpha_composite(ghost, (cell * len(frames) + 80 - ax, 140 - ay))
                dr.text((cell * i + 4, 2), str(sid), fill=(255, 255, 0, 255))
            for i in range(len(frames) + 1):
                dr.line([(cell * i + 80, 0), (cell * i + 80, 150)], fill=(255, 0, 0, 160))
            img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(out / f"{name}.png")


if __name__ == "__main__":
    main()

"""Builds Mega Blastoise's sheets from Blastoise's: every frame gets a big shell cannon
painted on, in Blastoise's own palette, anchored to the body and facing the way it faces.
(The PMD SpriteCollab has Mega Blastoise's portrait but no sprite yet.)

    python3 scripts/mega-blastoise.py public/pokemon/blastoise public/pokemon/blastoise-mega \
        <Mega Blastoise portrait, SpriteCollab portrait/0009/0001/Normal.png> <preview.png>
"""
import json, math, os, shutil, sys
from PIL import Image, ImageDraw

SRC, DST, PORTRAIT, PREVIEW = sys.argv[1:5]
PAD = 10
OUTLINE = (0, 0, 0, 255)
DARK = (103, 111, 127, 255)
MID = (183, 191, 199, 255)
LIGHT = (255, 255, 255, 255)
MOUNT = (55, 63, 143, 255)
MOUNT_LIGHT = (79, 95, 151, 255)
HOLE = (24, 28, 44, 255)

# facing, as a screen direction, for each sheet row (PMD order)
DIRS = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]
# where the cannon's mount sits on the shell, as a fraction of the body's box:
# x from the box centre (in units of box width), y from the box top (units of box height)
BASE = {
    0: (0.0, 0.18),
    1: (-0.12, 0.16),
    2: (-0.18, 0.22),
    3: (-0.10, 0.30),
    4: (0.0, 0.34),
    5: (0.10, 0.30),
    6: (0.18, 0.22),
    7: (0.12, 0.16),
}


def disc(d, x, y, r, c):
    d.ellipse([round(x - r), round(y - r), round(x + r), round(y + r)], fill=c)


def thick(d, x0, y0, x1, y1, r, c):
    n = max(1, int(math.hypot(x1 - x0, y1 - y0) * 2))
    for i in range(n + 1):
        t = i / n
        disc(d, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c)


def cannon(size, box, row):
    """The cannon for one frame, on its own layer."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    l, t, r, b = box
    bw, bh = r - l, b - t
    dx, dy = DIRS[row]
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    bx = PAD + (l + r) / 2 + BASE[row][0] * bw
    by = PAD + t + BASE[row][1] * bh
    if row in (0, 1, 7):
        # facing us: the cannon rides high on the back and points at us over the head, so
        # all we see is its muzzle peeking up above
        bx = PAD + (l + r) / 2 + dx * 2
        by = PAD + t + 3
        tx = bx + dx * 4
        ty = PAD + t - 4
    else:
        # the barrel runs forward along the facing, over the head: level side-on, and
        # foreshortened (rising up the screen) when it points away from us
        length = 11 if row in (2, 6) else 9
        lift = 2 if row in (2, 6) else 5
        tx = bx + dx * length
        ty = by + dy * length * 0.45 - lift
    thick(d, bx, by, tx, ty, 3, OUTLINE)
    thick(d, bx, by, tx, ty, 2, DARK)
    thick(d, bx - 0.5, by - 0.5, tx - 0.5, ty - 0.5, 1, MID)
    thick(d, bx - 1, by - 1.5, tx - 1, ty - 1.5, 0, LIGHT)
    # the muzzle, opening toward wherever it points
    big = 4 if row in (0, 1, 7) else 3
    disc(d, tx, ty, big, OUTLINE)
    disc(d, tx, ty, big - 1, MID)
    if dy > 0.3:
        disc(d, tx, ty + 0.5, 1.5, HOLE)  # pointing at us: we look down the barrel
    else:
        disc(d, tx + dx, ty + dy, 1, DARK)
    # the mount, bolted to the shell
    disc(d, bx, by + 1, 3, OUTLINE)
    disc(d, bx, by + 1, 2, MOUNT)
    disc(d, bx - 1, by, 0.5, MOUNT_LIGHT)
    return layer


meta = json.load(open(os.path.join(SRC, "anims.json")))
os.makedirs(DST, exist_ok=True)
out = {"name": "blastoise-mega", "anims": {}}
sheets_done = {}
for name, a in meta["anims"].items():
    sheet = a["sheet"]
    w, h = a["w"], a["h"]
    nw, nh = w + PAD * 2, h + PAD * 2
    if sheet not in sheets_done:
        im = Image.open(os.path.join(SRC, f"{sheet}.png")).convert("RGBA")
        cols = im.width // w
        rows = im.height // h
        new = Image.new("RGBA", (cols * nw, rows * nh), (0, 0, 0, 0))
        for rr in range(rows):
            for c in range(cols):
                frame = im.crop((c * w, rr * h, c * w + w, rr * h + h))
                box = frame.getbbox()
                cell = Image.new("RGBA", (nw, nh), (0, 0, 0, 0))
                # asleep (one row) or tucked in its shell, there's no cannon to show
                if box and rows > 1 and sheet not in ("Withdraw",):
                    gun = cannon((nw, nh), box, rr)
                    # facing us, the cannon is behind it; side-on or facing away, it's on top
                    if rr in (0, 1, 7):
                        cell.alpha_composite(gun)
                        cell.alpha_composite(frame, (PAD, PAD))
                    else:
                        cell.alpha_composite(frame, (PAD, PAD))
                        cell.alpha_composite(gun)
                else:
                    cell.alpha_composite(frame, (PAD, PAD))
                new.alpha_composite(cell, (c * nw, rr * nh))
        new.save(os.path.join(DST, f"{sheet}.png"))
        sheets_done[sheet] = True
    out["anims"][name] = {**a, "w": nw, "h": nh}
json.dump(out, open(os.path.join(DST, "anims.json"), "w"), indent=1)
if os.path.abspath(PORTRAIT) != os.path.abspath(os.path.join(DST, "portrait.png")):
    shutil.copy(PORTRAIT, os.path.join(DST, "portrait.png"))

# a preview: Idle and Walk, every direction, 4x
prev = Image.new("RGBA", (8 * 60 * 4, 2 * 60 * 4), (70, 70, 90, 255))
for i, nm in enumerate(["Idle", "Walk"]):
    a = out["anims"][nm]
    im = Image.open(os.path.join(DST, f"{a['sheet']}.png"))
    for rr in range(8):
        f = im.crop((0, rr * a["h"], a["w"], rr * a["h"] + a["h"])).resize((a["w"] * 4, a["h"] * 4), Image.NEAREST)
        prev.alpha_composite(f, (rr * 240, i * 240))
prev.save(PREVIEW)
print("ok", list(out["anims"].keys()))

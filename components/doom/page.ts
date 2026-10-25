// ==========================================
// DOOM mode page access: finds what is under the crosshair (a letter, an image box, a tag)
// in document coordinates. Read-only: the page is never modified, so exiting restores it.
// ==========================================

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Glyph {
  node: Text;
  index: number;
  char: string;
  box: Box;
  font: string;
  color: string;
}

export const docBox = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
};

export const inBox = (b: Box, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** Runs a hit test with DOOM's own canvas made transparent to the pointer. */
export function throughLayer<T>(layer: HTMLElement, test: () => T): T {
  const prev = layer.style.pointerEvents;
  layer.style.pointerEvents = "none";
  try {
    return test();
  } finally {
    layer.style.pointerEvents = prev;
  }
}

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretAt(x: number, y: number): { node: Text; offset: number } | null {
  const doc = document as CaretDoc;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p && p.offsetNode.nodeType === Node.TEXT_NODE ? { node: p.offsetNode as Text, offset: p.offset } : null;
  }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r && r.startContainer.nodeType === Node.TEXT_NODE ? { node: r.startContainer as Text, offset: r.startOffset } : null;
}

/** The visible character at a text node index, with the font and colour it is drawn in. */
export function glyphOf(node: Text, index: number): Glyph | null {
  const raw = node.data[index];
  const parent = node.parentElement;
  if (!raw || !raw.trim() || !parent) return null;
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);
  const r = range.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const cs = getComputedStyle(parent);
  if (cs.visibility === "hidden" || Number(cs.opacity) === 0) return null;
  const char =
    cs.textTransform === "uppercase" ? raw.toUpperCase() : cs.textTransform === "lowercase" ? raw.toLowerCase() : raw;
  return {
    node,
    index,
    char,
    box: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    color: cs.color,
  };
}

/** The character under a viewport point, if there is one. */
export function glyphAt(x: number, y: number): Glyph | null {
  const caret = caretAt(x, y);
  if (!caret) return null;
  for (const i of [caret.offset, caret.offset - 1]) {
    const g = glyphOf(caret.node, i);
    if (g && inBox(g.box, x + window.scrollX, y + window.scrollY)) return g;
  }
  return null;
}

/** Text nodes of the page outside the header and the game modes' own UI. */
export function textNodes(root: Element = document.body): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.nodeValue?.trim() && !n.parentElement?.closest("header, script, style, [data-doom], [data-sf], [data-arcade]")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

/** Every visible character whose box centre falls inside a circle (document coordinates). */
export function glyphsInCircle(cx: number, cy: number, radius: number, limit: number): Glyph[] {
  const found: Glyph[] = [];
  const area = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };
  for (const node of textNodes()) {
    const p = docBox(node.parentElement!);
    if (p.x > area.x + area.w || p.x + p.w < area.x || p.y > area.y + area.h || p.y + p.h < area.y) continue;
    for (let i = 0; i < node.data.length && found.length < limit; i++) {
      const g = glyphOf(node, i);
      if (!g) continue;
      const dx = g.box.x + g.box.w / 2 - cx;
      const dy = g.box.y + g.box.h / 2 - cy;
      if (dx * dx + dy * dy <= radius * radius) found.push(g);
    }
  }
  return found;
}

import type { Box } from "../doom/page";

// ==========================================
// Gravitational lensing of the page. The canvas can't see the DOM's pixels, so the game keeps
// a copy of the page around the hole (its letters and images, drawn from the same glyph and
// snapshot images it already makes) and this bends that copy through the point-mass lens
// equation in WebGL: light passing at distance θ is deflected by θE²/θ, so text is pushed out
// and smeared into arcs around the Einstein ring, a second, flipped image of the far side of
// the page hugs the shadow, and light from near the horizon arrives dim and redshifted.
// The bending tapers to nothing at the lens edge, where the copy fades into the real page.
// The WebGL canvas is only as big as the lens and moves with the hole, so it costs little.
// ==========================================

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform float uDpr, uSize, uTop, uR, uE, uLens, uSrc, uFade;
uniform vec3 uBg;
void main() {
  // css px from the canvas's top-left corner; the hole is at its centre
  vec2 css = vec2(gl_FragCoord.x, uSize * uDpr - gl_FragCoord.y) / uDpr;
  if (css.y < uTop) discard;
  vec2 p = css - uSize * 0.5;
  float th = length(p);
  if (th > uLens) discard;
  vec3 col = vec3(0.0);
  if (th > uR) {
    float w = 1.0 - smoothstep(uLens * 0.45, uLens * 0.88, th);
    float defl = uE * uE / th * w;
    vec2 b = p * (1.0 - defl / th);
    col = length(b) > uSrc ? uBg : texture2D(uTex, b / (2.0 * uSrc) + 0.5).rgb;
    // the second image, inside the Einstein ring, is squeezed and fainter
    if (th < uE) col *= 0.75;
    // gravitational redshift: light climbing out from near the horizon loses energy
    float z = smoothstep(uR, uR * 2.8, th);
    col = mix(col * vec3(1.0, 0.42, 0.2) * 0.55, col, z);
  }
  float alpha = (1.0 - smoothstep(uLens * 0.9, uLens, th)) * uFade;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/** Deflection at observed distance th, with the same taper as the shader. */
export function deflection(th: number, e: number, lens: number) {
  const s = Math.max(0, Math.min(1, (th - lens * 0.45) / (lens * 0.43)));
  return ((e * e) / th) * (1 - s * s * (3 - 2 * s));
}

export class Lens {
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private quad: WebGLBuffer;
  private tex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private size = 0; // the canvas's side, css px
  private shown = false;
  /** the page copy, in document coordinates over `area` at `scale` px per css px */
  private page = document.createElement("canvas");
  private pageCtx = this.page.getContext("2d")!;
  private area: Box | null = null;
  private scale = 1;
  /** the crop around the hole that goes up to the GPU each frame */
  private src = document.createElement("canvas");
  private srcCtx = this.src.getContext("2d")!;
  private bg = "#020204";
  private bgRgb: [number, number, number] = [0.008, 0.008, 0.016];

  static create(canvas: HTMLCanvasElement) {
    try {
      const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
      return gl ? new Lens(canvas, gl) : null;
    } catch {
      return null;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext
  ) {
    this.gl = gl;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    this.prog = gl.createProgram()!;
    gl.attachShader(this.prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(this.prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) throw new Error("lens shader failed");
    gl.useProgram(this.prog);
    for (const name of ["uTex", "uDpr", "uSize", "uTop", "uR", "uE", "uLens", "uSrc", "uFade", "uBg"])
      this.u[name] = gl.getUniformLocation(this.prog, name);
    // one quad over the whole canvas
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    canvas.style.visibility = "hidden";
    this.resize();
  }

  resize() {
    this.size = 0;
    let el: Element | null = document.querySelector("[data-page-root]") ?? document.body;
    let bg = "";
    // the first opaque background up the tree is the page's colour
    while (el && (!bg || bg === "transparent" || bg.startsWith("rgba(0, 0, 0, 0)"))) {
      bg = getComputedStyle(el).backgroundColor;
      el = el.parentElement;
    }
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg);
    if (m) {
      this.bg = bg;
      this.bgRgb = [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
    }
    this.area = null;
  }

  /** Whether the page copy covers a circle (doc coords); if not the game repaints it. */
  covers(x: number, y: number, radius: number) {
    const a = this.area;
    return !!a && x - radius >= a.x && y - radius >= a.y && x + radius <= a.x + a.w && y + radius <= a.y + a.h;
  }

  /** Starts a fresh page copy over `area`; returns a context drawing in doc coordinates. */
  begin(area: Box) {
    const dpr = window.devicePixelRatio || 1;
    this.area = area;
    this.scale = Math.min(dpr, 4096 / Math.max(area.w, area.h));
    this.page.width = Math.ceil(area.w * this.scale);
    this.page.height = Math.ceil(area.h * this.scale);
    const c = this.pageCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.bg;
    c.fillRect(0, 0, this.page.width, this.page.height);
    c.setTransform(this.scale, 0, 0, this.scale, -area.x * this.scale, -area.y * this.scale);
    return c;
  }

  /** Something left the page (a letter peeled off, an image torn out): blank it in the copy. */
  erase(b: Box) {
    if (!this.area) return;
    this.pageCtx.fillStyle = this.bg;
    this.pageCtx.fillRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1);
  }

  /** The page changed under the copy (Big Bang, resize): it gets repainted next time it's needed. */
  invalidate() {
    this.area = null;
  }

  hide() {
    if (!this.shown) return;
    this.shown = false;
    this.canvas.style.visibility = "hidden";
  }

  /**
   * Draws the bent page. (x, y) is the hole in doc coords, r its shadow, e the Einstein
   * radius, lens how far the effect reaches; top is the header's bottom edge on screen.
   */
  draw(x: number, y: number, r: number, e: number, lens: number, top: number, fade: number) {
    const { gl, canvas } = this;
    if (!this.area || fade <= 0 || lens < 4) return this.hide();
    const dpr = window.devicePixelRatio || 1;

    // the canvas just covers the lens, in steps so it isn't resized every frame
    const size = Math.ceil((lens * 2) / 64) * 64;
    if (size !== this.size) {
      this.size = size;
      canvas.width = canvas.height = Math.min(4096, Math.round(size * dpr));
      canvas.style.width = canvas.style.height = `${size}px`;
    }
    const sx = x - window.scrollX;
    const sy = y - window.scrollY;
    // "translate" rather than "transform", so the screen shake's transform animation still applies
    canvas.style.translate = `${sx - size / 2}px ${sy - size / 2}px`;
    if (!this.shown) {
      this.shown = true;
      canvas.style.visibility = "visible";
    }

    // crop the copy around the hole: the texture covers [-src, src] on both axes
    const src = lens * 1.05;
    const side = Math.min(2048, Math.ceil((src * 2 * dpr) / 128) * 128);
    if (this.src.width !== side) this.src.width = this.src.height = side;
    const c = this.srcCtx;
    c.fillStyle = this.bg;
    c.fillRect(0, 0, side, side);
    const k = this.scale;
    c.drawImage(
      this.page,
      (x - src - this.area.x) * k,
      (y - src - this.area.y) * k,
      src * 2 * k,
      src * 2 * k,
      0,
      0,
      side,
      side
    );
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform1f(this.u.uDpr, canvas.width / size);
    gl.uniform1f(this.u.uSize, size);
    // the header's bottom edge, in the canvas's own coordinates
    gl.uniform1f(this.u.uTop, top - (sy - size / 2));
    gl.uniform1f(this.u.uR, r);
    gl.uniform1f(this.u.uE, e);
    gl.uniform1f(this.u.uLens, lens);
    gl.uniform1f(this.u.uSrc, src);
    gl.uniform1f(this.u.uFade, fade);
    gl.uniform3f(this.u.uBg, ...this.bgRgb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

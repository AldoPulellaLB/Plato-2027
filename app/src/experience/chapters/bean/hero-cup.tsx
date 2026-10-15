// The cold-open cup behind the f01 headline: the client's photo of this page
// load's theme cup (hero-theme.ts), turned left and right with the mouse.
//
// Only the print turns. The photo was split offline into a print map (the
// printed band with the studio light divided out) and a low-res light map, and
// this shader re-wraps the print around the cup axis by the turn angle, then
// lights it with the light map, which stays put. A real cup turning under fixed
// studio lights does exactly that, and the lid, the foot ring, the light and
// the grading all stay the photo's own. At rest the output equals the photo.
//
// The photo itself (a CSS background picked by <html data-roast>) is the first
// paint and the fallback: touch devices, reduced motion and no-WebGL keep it.
import { forwardRef, useEffect, useRef } from "react";

import { heroTheme } from "@/experience/hero-theme";
import type { HeroCup as HeroCupSpec } from "@/experience/hero-theme";

/** Largest turn either way, at the window edges (radians, about 14 degrees). */
const MAX_TURN = 0.245;
/** Turn easing rate (1/s): about a quarter of a second to settle. */
const EASE = 5.5;
/** Print map values are stored divided by this, so paper can sit above white. */
const PRINT_HEADROOM = 1.15;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrint;
uniform sampler2D uLight;
uniform vec2 uSize;
uniform vec2 uAxis;
uniform vec2 uRadius;
uniform vec2 uLid;
uniform vec2 uFoot;
uniform float uTurn;
uniform float uHead;

float axisAt(float y) { return uAxis.x * y + uAxis.y; }
float radiusAt(float y) { return uRadius.x * y + uRadius.y; }
float bulgeAt(float y) { return mix(uLid.y, uFoot.y, clamp((y - uLid.x) / (uFoot.x - uLid.x), 0.0, 1.0)); }

void main() {
  vec4 base = texture2D(uPrint, vUv);
  vec3 col = base.rgb * uHead;
  vec2 p = vUv * uSize;

  // Which band row (Y) and angle round the cup this pixel shows: the rows are
  // ellipses y = Y + b * cos(angle), seen from a little above.
  float y = p.y;
  float u = 0.0;
  for (int i = 0; i < 4; i++) {
    u = clamp((p.x - axisAt(y)) / radiusAt(y), -1.0, 1.0);
    y = p.y - bulgeAt(y) * sqrt(1.0 - u * u);
  }
  u = (p.x - axisAt(y)) / radiusAt(y);

  if (y > uLid.x + 1.5 && y < uFoot.x - 1.5 && abs(u) < 0.995) {
    float here = asin(clamp(u, -1.0, 1.0));
    float from = here + uTurn;
    // Past 75 degrees the photo has no usable print (grazing, foreshortened):
    // hold the last good column instead. Never clamps at rest.
    float lim = max(radians(75.0), abs(here));
    from = clamp(from, -lim, lim);
    vec2 q = vec2(axisAt(y) + radiusAt(y) * sin(from), y + bulgeAt(y) * cos(from)) / uSize;
    vec3 print = texture2D(uPrint, q).rgb;
    // Print arriving from near the silhouette carries the grazing light's paper
    // texture; soften it horizontally as it travels inward.
    float soft = smoothstep(radians(45.0), radians(75.0), abs(from)) * clamp((abs(from) - abs(here)) / radians(10.0), 0.0, 1.0);
    if (soft > 0.0) {
      vec2 d = vec2(2.5 * soft / uSize.x, 0.0);
      print = (2.0 * print + texture2D(uPrint, q - d).rgb + texture2D(uPrint, q + d).rgb
        + texture2D(uPrint, q - 2.0 * d).rgb + texture2D(uPrint, q + 2.0 * d).rgb) / 6.0;
    }
    col = print * uHead * texture2D(uLight, vUv).rgb;
  }
  gl_FragColor = vec4(col * base.a, base.a);
}`;

function loadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().then(() => img);
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("hero cup: shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`hero cup: ${gl.getShaderInfoLog(shader) ?? "compile failed"}`);
  }
  return shader;
}

function texture(gl: WebGLRenderingContext, unit: number, img: HTMLImageElement) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  return tex;
}

/**
 * Starts the turning cup in `body` on a canvas of its own (so a remount never
 * inherits a released context); resolves to a stop function, or null if it cannot run.
 */
async function startCup(body: HTMLElement, cup: HeroCupSpec) {
  const canvas = document.createElement("canvas");
  canvas.className = "ch-f01__cup-canvas";
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const [print, light] = await Promise.all([loadImage(cup.print), loadImage(cup.light)]);
  if (gl.isContextLost()) return null;
  body.appendChild(canvas);

  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("hero cup: link failed");
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Straight (not premultiplied) colour, no colour management: the maps are data.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  const printTex = texture(gl, 0, print);
  const lightTex = texture(gl, 1, light);

  const loc = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(loc("uPrint"), 0);
  gl.uniform1i(loc("uLight"), 1);
  gl.uniform2f(loc("uSize"), cup.width, cup.height);
  gl.uniform2f(loc("uAxis"), cup.axis[0], cup.axis[1]);
  gl.uniform2f(loc("uRadius"), cup.radius[0], cup.radius[1]);
  gl.uniform2f(loc("uLid"), cup.lid[0], cup.lid[1]);
  gl.uniform2f(loc("uFoot"), cup.foot[0], cup.foot[1]);
  gl.uniform1f(loc("uHead"), PRINT_HEADROOM);
  const uTurn = loc("uTurn");
  gl.clearColor(0, 0, 0, 0);

  let turn = 0;
  let target = 0;
  let drawn = Number.NaN;
  let raf = 0;
  let last = 0;
  let visible = true;
  let sized = false;

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTurn, turn);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    drawn = turn;
    if (!body.hasAttribute("data-live")) body.setAttribute("data-live", "");
  };

  const tick = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    turn += (target - turn) * (1 - Math.exp(-dt * EASE));
    if (Math.abs(target - turn) < 0.0004) turn = target;
    if (sized && turn !== drawn) draw();
    if (turn !== target && visible) raf = window.requestAnimationFrame(tick);
    else last = 0;
  };
  const wake = () => {
    if (!raf && visible) raf = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    sized = true;
    draw();
  };

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    // The front of the cup turns toward the pointer.
    target = -Math.max(-1, Math.min(1, x)) * MAX_TURN;
    wake();
  };

  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  viewObserver.observe(canvas);
  window.addEventListener("pointermove", onPointer, { passive: true });

  const onLost = (event: Event) => {
    event.preventDefault();
    body.removeAttribute("data-live");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return () => {
    if (raf) window.cancelAnimationFrame(raf);
    sizeObserver.disconnect();
    viewObserver.disconnect();
    window.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("webglcontextlost", onLost);
    body.removeAttribute("data-live");
    gl.deleteTexture(printTex);
    gl.deleteTexture(lightTex);
    gl.deleteBuffer(quad);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
}

/**
 * The glow and the cup. `ref` is the layer the f01 exit scrub moves (kept apart
 * from the centring wrapper, whose CSS translate GSAP would otherwise take over).
 */
export const HeroCup = forwardRef<HTMLDivElement>(function HeroCup(_props, ref) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    // A mouse turns it; touch and reduced motion keep the still photo.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    let stop: (() => void) | null = null;
    let cancelled = false;
    startCup(body, heroTheme().cup)
      .then((fn) => {
        if (cancelled) fn?.();
        else stop = fn;
      })
      .catch((error) => console.error("Hero cup: falling back to the photo", error));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div aria-hidden="true" className="ch-f01__cup">
      <div className="ch-f01__cup-lift" ref={ref}>
        <div className="ch-f01__cup-in">
          <div className="ch-f01__glow" />
          <div className="ch-f01__cup-body" ref={bodyRef} />
        </div>
      </div>
    </div>
  );
});

// Procedural canvas textures for the chapter-one film (no downloads).
// Only called from SceneModule.init (client), never at module top level.
import * as THREE from "three";

import { hash } from "./util";

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  return { c, g };
}

function finish(c: HTMLCanvasElement, srgb = false, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.needsUpdate = true;
  return t;
}

/** Soft radial falloff, white with alpha (glows, halos, dust). */
export function glowTexture(size = 256, falloff = 2.2) {
  const { c, g } = canvas(size);
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - h) / h;
      const dy = (y + 0.5 - h) / h;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const a = Math.pow(1 - d, falloff) * (1 - d * d);
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}

/** A ring of light peaking at `peak` (0..1 of the radius): bloom spill around the sight glass. */
export function ringGlowTexture(size = 512, peak = 0.62, width = 0.22) {
  const { c, g } = canvas(size);
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - h) / h;
      const dy = (y + 0.5 - h) / h;
      const d = Math.sqrt(dx * dx + dy * dy);
      const k = (d - peak) / (d < peak ? width * 0.55 : width);
      const a = d >= 1 ? 0 : Math.exp(-k * k * 2.2) * (1 - Math.pow(d, 8));
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, a) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}

/** Spun / brushed steel streaks (roughness + subtle colour). Streaks run along U. */
export function brushedTexture(w = 512, h = 256) {
  const { c, g } = canvas(w, h);
  g.fillStyle = "rgb(128,128,128)";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i += 1) {
    const y = hash(i, 1) * h;
    const l = 100 + hash(i, 2) * 70;
    const a = 0.08 + hash(i, 3) * 0.22;
    g.fillStyle = `rgba(${l},${l},${l},${a})`;
    const x = hash(i, 4) * w;
    const len = w * (0.2 + hash(i, 5) * 0.9);
    g.fillRect(x - len / 2, y, len, 0.6 + hash(i, 6) * 1.2);
    g.fillRect(x - len / 2 + w, y, len, 0.6 + hash(i, 6) * 1.2);
    g.fillRect(x - len / 2 - w, y, len, 0.6 + hash(i, 6) * 1.2);
  }
  return finish(c, false, true);
}

/** Perforated cooling-tray floor: brushed steel with a hex grid of holes and faint roast stains. */
export function perforationTexture(size = 1024, holes = 32) {
  const { c, g } = canvas(size);
  g.fillStyle = "rgb(112,111,108)";
  g.fillRect(0, 0, size, size);
  // Faint brushing.
  for (let i = 0; i < 1400; i += 1) {
    const y = hash(i, 11) * size;
    const l = 92 + hash(i, 12) * 46;
    g.fillStyle = `rgba(${l},${l},${l - 2},${0.06 + hash(i, 13) * 0.1})`;
    const x = hash(i, 14) * size;
    const len = size * (0.1 + hash(i, 15) * 0.5);
    g.fillRect(x - len / 2, y, len, 1);
    g.fillRect(x - len / 2 + size, y, len, 1);
    g.fillRect(x - len / 2 - size, y, len, 1);
  }
  // Roast stains (tileable: draw wrapped copies).
  for (let i = 0; i < 9; i += 1) {
    const x = hash(i, 21) * size;
    const y = hash(i, 22) * size;
    const r = size * (0.12 + hash(i, 23) * 0.22);
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const st = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        st.addColorStop(0, `rgba(72,48,30,${0.07 + hash(i, 24) * 0.08})`);
        st.addColorStop(1, "rgba(72,48,30,0)");
        g.fillStyle = st;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  const step = size / holes;
  const rad = step * 0.24;
  const rowH = step * 0.866;
  const rows = Math.round(size / rowH);
  const dy = size / rows;
  for (let row = -1; row <= rows; row += 1) {
    for (let col = -1; col <= holes; col += 1) {
      const x = col * step + (row % 2 === 0 ? 0 : step / 2);
      const y = row * dy;
      // Bevel highlight (lower right) then the dark hole.
      g.fillStyle = "rgba(210,210,205,0.55)";
      g.beginPath();
      g.arc(x + rad * 0.18, y + rad * 0.18, rad * 1.08, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgb(18,16,14)";
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = finish(c, true, true);
  return t;
}

/** Papery chaff flake (silver skin): irregular, translucent, soft edged. */
export function flakeTexture(size = 128) {
  const { c, g } = canvas(size);
  const h = size / 2;
  g.translate(h, h);
  g.shadowColor = "rgba(236,222,196,0.9)";
  g.shadowBlur = size * 0.08;
  g.fillStyle = "rgba(236,222,196,0.82)";
  g.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = size * (0.26 + hash(i, 31) * 0.14);
    const x = Math.cos(a) * r * 1.25;
    const y = Math.sin(a) * r * 0.62;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(255,248,232,0.55)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-size * 0.3, size * 0.02);
  g.quadraticCurveTo(0, -size * 0.08, size * 0.32, size * 0.03);
  g.stroke();
  return finish(c);
}

/** Wispy smoke / steam puff (white, alpha only). */
export function smokeTexture(size = 256) {
  const { c, g } = canvas(size);
  const h = size / 2;
  for (let i = 0; i < 26; i += 1) {
    const a = hash(i, 41) * Math.PI * 2;
    const d = Math.pow(hash(i, 42), 0.8) * size * 0.26;
    const x = h + Math.cos(a) * d;
    const y = h + Math.sin(a) * d * 0.8;
    const r = size * (0.1 + hash(i, 43) * 0.18);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,255,255,${0.12 + hash(i, 44) * 0.12})`);
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fade the square edges away.
  g.globalCompositeOperation = "destination-in";
  const m = g.createRadialGradient(h, h, size * 0.2, h, h, h);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m;
  g.fillRect(0, 0, size, size);
  return finish(c);
}

/** Espresso surface seen from above: dark centre, hazel crema ring, tiger flecks, meniscus shadow. */
export function cremaTexture(size = 512) {
  const { c, g } = canvas(size);
  const h = size / 2;
  const base = g.createRadialGradient(h, h, 0, h, h, h);
  base.addColorStop(0, "rgb(34,17,8)");
  base.addColorStop(0.35, "rgb(58,30,13)");
  base.addColorStop(0.7, "rgb(96,54,22)");
  base.addColorStop(0.88, "rgb(122,74,34)");
  base.addColorStop(0.95, "rgb(72,40,18)");
  base.addColorStop(1, "rgb(30,16,8)");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // Tiger flecks.
  for (let i = 0; i < 420; i += 1) {
    const a = hash(i, 51) * Math.PI * 2;
    const d = Math.sqrt(hash(i, 52)) * h * 0.9;
    const x = h + Math.cos(a) * d;
    const y = h + Math.sin(a) * d;
    const r = 1.5 + hash(i, 53) * 5;
    const dark = hash(i, 54) > 0.45;
    g.fillStyle = dark ? `rgba(30,15,8,${0.18 + hash(i, 55) * 0.25})` : `rgba(170,112,62,${0.1 + hash(i, 55) * 0.18})`;
    g.beginPath();
    g.ellipse(x, y, r * 1.6, r, a + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
  }
  // A slow swirl of lighter crema.
  g.strokeStyle = "rgba(150,96,50,0.08)";
  g.lineWidth = size * 0.03;
  g.lineCap = "round";
  for (let k = 0; k < 3; k += 1) {
    g.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const t = i / 40;
      const a = t * Math.PI * 1.4 + k * 2.1;
      const d = h * (0.25 + t * 0.5);
      const x = h + Math.cos(a) * d;
      const y = h + Math.sin(a) * d;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  return finish(c, true);
}

/** Sight glass overlay: smoky edge haze (alpha) plus a soft softbox reflection (white). */
export function glassTexture(size = 512) {
  const { c, g } = canvas(size);
  const h = size / 2;
  g.save();
  g.beginPath();
  g.arc(h, h, h, 0, Math.PI * 2);
  g.clip();
  const haze = g.createRadialGradient(h, h, h * 0.35, h, h, h);
  haze.addColorStop(0, "rgba(20,14,10,0.0)");
  haze.addColorStop(0.75, "rgba(20,14,10,0.18)");
  haze.addColorStop(1, "rgba(14,10,8,0.62)");
  g.fillStyle = haze;
  g.fillRect(0, 0, size, size);
  // Softbox reflection, upper left.
  g.translate(h * 0.62, h * 0.55);
  g.rotate(-0.72);
  const sb = g.createRadialGradient(0, 0, 0, 0, 0, size * 0.32);
  sb.addColorStop(0, "rgba(255,250,240,0.2)");
  sb.addColorStop(0.6, "rgba(255,250,240,0.07)");
  sb.addColorStop(1, "rgba(255,250,240,0)");
  g.scale(1, 0.32);
  g.fillStyle = sb;
  g.beginPath();
  g.arc(0, 0, size * 0.32, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Thin crescent highlight on the upper left rim.
  g.strokeStyle = "rgba(255,250,240,0.22)";
  g.lineWidth = size * 0.012;
  g.lineCap = "round";
  g.beginPath();
  g.arc(h, h, h * 0.93, Math.PI * 1.04, Math.PI * 1.42);
  g.stroke();
  return finish(c);
}

/** A long soft shaft of window light (white, alpha), drawn along +X. */
export function beamTexture(w = 512, h = 128) {
  const { c, g } = canvas(w, h);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const v = (y / (h - 1)) * 2 - 1;
      const across = Math.exp(-v * v * 3.2) * (1 - v * v);
      const along = Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI), 0.8) * (1 - u * 0.55);
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, across * along) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}

/** Contact darkening for the tray floor: deep at the wall and around the hub (alpha). */
export function trayShadeTexture(size = 512) {
  const { c, g } = canvas(size);
  const img = g.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - h) / h;
      const dy = (y + 0.5 - h) / h;
      const r = Math.sqrt(dx * dx + dy * dy);
      const wall = Math.min(1, Math.max(0, (r - 0.7) / 0.3));
      const hub = Math.min(1, Math.max(0, (0.24 - r) / 0.16));
      const a = r > 1 ? 0 : Math.min(1, wall * wall * 0.85 + hub * 0.55 + 0.12);
      const i = (y * size + x) * 4;
      img.data[i] = 10;
      img.data[i + 1] = 9;
      img.data[i + 2] = 8;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c);
}

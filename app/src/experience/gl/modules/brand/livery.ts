// Paper cup livery, painted on a canvas and wrapped on the cup wall.
// White stock, one bold diagonal colour block (the cup's size colour), a slim
// hexagon badge like the real cups, and the REAL Platō marks drawn from the
// wordmark path data (never typeset): the ō symbol, the PLATŌ wordmark and the
// word COFFEE in wide-tracked Jost, as printed on the cups.
//
// Mapping: the wall is a cone (LatheGeometry, phiStart = -PI) so texture u is
// the angle around the cup (u = 0.5 faces the camera) and v is the height.
// Everything is drawn in "wall units" (arc length a, height y) and converted
// through the cone, so the artwork keeps its true proportions on the taper,
// the way a printed cup blank is pre-distorted.
import { WORDMARK_LETTERS } from "@/components/site/wordmark";

export interface CupShape {
  /** Wall height (world units). */
  height: number;
  rTop: number;
  rBottom: number;
  /** Height of the wall hidden under the lid skirt. */
  lidOverlap: number;
}

export interface LiveryColours {
  paper: string;
  block: string;
  ink: string;
  /** Badge colour where it crosses the colour block (paper on the dark green cup). */
  inkOnBlock: string;
}

const TAU = Math.PI * 2;
const WORDMARK_W = 1492.68;
// Visual bounds of the wordmark and of the ō symbol in SVG units.
const WORDMARK_Y0 = 2.94;
const WORDMARK_Y1 = 353.92;
const SYMBOL_X0 = 1231.02;
const SYMBOL_X1 = 1492.68;

let wordmarkPaths: Path2D[] | null = null;
let symbolPaths: Path2D[] | null = null;

function marks() {
  if (!wordmarkPaths || !symbolPaths) {
    wordmarkPaths = WORDMARK_LETTERS.flatMap((letter) => letter.d.map((d) => new Path2D(d)));
    symbolPaths = WORDMARK_LETTERS[4].d.map((d) => new Path2D(d));
  }
  return { wordmark: wordmarkPaths, symbol: symbolPaths };
}

export function paintCupLivery(shape: CupShape, colours: LiveryColours, width: number, fontFamily: string) {
  const { height: h, rTop, rBottom, lidOverlap } = shape;
  const rMid = (rTop + rBottom) / 2;
  // Square texels at mid height.
  const W = width;
  const H = Math.round((h * W) / (TAU * rMid));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  const radiusAt = (y: number) => rBottom + ((rTop - rBottom) * y) / h;
  const ky = H / h; // px per world unit, vertical (and horizontal at rMid)
  const toX = (a: number, y: number) => W * (0.5 + a / radiusAt(y) / TAU);
  const toY = (y: number) => H * (1 - y / h);
  /** Horizontal correction for an element centred at height y (taper compensation). */
  const squashAt = (y: number) => rMid / radiusAt(y);

  const visible = h - lidOverlap;
  const quarter = (Math.PI * rMid) / 2; // a quarter of the way round: the visible half-width

  // 1. Paper stock.
  g.fillStyle = colours.paper;
  g.fillRect(0, 0, W, H);

  // 2. The diagonal colour block: everything above a line that runs from the
  // upper left of the front face to its lower right, continued round the cup.
  const a1 = -1.08 * quarter;
  const y1 = 0.95 * visible;
  const a2 = 1.08 * quarter;
  const y2 = 0.06 * visible;
  const slope = (y2 - y1) / (a2 - a1);
  const k = (rTop - rBottom) / h;
  const block = new Path2D();
  const steps = 160;
  for (let i = 0; i <= steps; i += 1) {
    const phi = -Math.PI + (TAU * i) / steps;
    // Solve y = y1 + (phi * r(y) - a1) * slope for y (r is linear in y).
    let y = (y1 + (phi * rBottom - a1) * slope) / (1 - phi * k * slope);
    y = Math.max(-0.1 * h, Math.min(1.1 * h, y));
    const x = W * (0.5 + phi / TAU);
    if (i === 0) block.moveTo(x, toY(y));
    else block.lineTo(x, toY(y));
  }
  block.lineTo(W + 2, -2);
  block.lineTo(-2, -2);
  block.closePath();
  g.fillStyle = colours.block;
  g.fill(block);

  // 3. The badge: a slim hexagon with the ō symbol, the wordmark and COFFEE.
  const bw = 0.92 * rMid;
  const bh = Math.min(2.3 * bw, 0.84 * visible);
  const bc = 0.49 * visible;
  const yt = bc + bh / 2;
  const yb = bc - bh / 2;
  const shoulder = bw * 0.2887; // 30 degree slopes
  const hex: [number, number][] = [
    [0, yt],
    [bw / 2, yt - shoulder],
    [bw / 2, yb + shoulder],
    [0, yb],
    [-bw / 2, yb + shoulder],
    [-bw / 2, yt - shoulder],
  ];
  const stroke = Math.max(1.5, 0.014 * bw * ky);
  const ringR = 0.036 * bw;

  // Content block, centred in the badge.
  const symbolW = 0.32 * bw;
  const symbolH = (symbolW * (WORDMARK_Y1 - WORDMARK_Y0)) / (SYMBOL_X1 - SYMBOL_X0);
  const wordW = 0.74 * bw;
  const wordH = (wordW * (WORDMARK_Y1 - WORDMARK_Y0)) / WORDMARK_W;
  const coffeeCap = 0.075 * bw;
  const gapA = 0.2 * bw;
  const gapB = 0.1 * bw;
  const groupH = symbolH + gapA + wordH + gapB + coffeeCap;
  const groupTop = bc + groupH / 2 + 0.02 * bw;
  const symbolCy = groupTop - symbolH / 2;
  const wordCy = groupTop - symbolH - gapA - wordH / 2;
  const coffeeBase = groupTop - symbolH - gapA - wordH - gapB - coffeeCap;

  const { wordmark, symbol } = marks();

  const drawBadge = (colour: string) => {
    g.save();
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = stroke;
    g.lineJoin = "miter";

    // Hexagon (each edge sampled through the cone so it stays straight on the cup).
    g.beginPath();
    const seg = 8;
    for (let i = 0; i < hex.length; i += 1) {
      const [ax, ay] = hex[i];
      const [bx, by] = hex[(i + 1) % hex.length];
      for (let s = 0; s < seg; s += 1) {
        const t = s / seg;
        const a = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        if (i === 0 && s === 0) g.moveTo(toX(a, y), toY(y));
        else g.lineTo(toX(a, y), toY(y));
      }
    }
    g.closePath();
    g.stroke();

    // Small rings on the top and bottom points.
    for (const [cy, dir] of [
      [yt, 1],
      [yb, -1],
    ] as const) {
      const y = cy + dir * (ringR + stroke / ky / 2);
      g.beginPath();
      g.ellipse(toX(0, y), toY(y), ringR * ky * squashAt(y), ringR * ky, 0, 0, TAU);
      g.stroke();
    }

    // ō symbol.
    {
      const s = (symbolW * ky) / (SYMBOL_X1 - SYMBOL_X0);
      const sx = s * squashAt(symbolCy);
      const cxSvg = (SYMBOL_X0 + SYMBOL_X1) / 2;
      const cySvg = (WORDMARK_Y0 + WORDMARK_Y1) / 2;
      g.setTransform(sx, 0, 0, s, toX(0, symbolCy) - cxSvg * sx, toY(symbolCy) - cySvg * s);
      for (const p of symbol) g.fill(p);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    // The PLATŌ wordmark.
    {
      const s = (wordW * ky) / WORDMARK_W;
      const sx = s * squashAt(wordCy);
      const cySvg = (WORDMARK_Y0 + WORDMARK_Y1) / 2;
      g.setTransform(sx, 0, 0, s, toX(0, wordCy) - (WORDMARK_W / 2) * sx, toY(wordCy) - cySvg * s);
      for (const p of wordmark) g.fill(p);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    // COFFEE, wide tracked (0.34em), centred.
    {
      const capPx = coffeeCap * ky;
      const fontPx = capPx / 0.7;
      const squash = squashAt(coffeeBase + coffeeCap / 2);
      g.font = `500 ${fontPx.toFixed(2)}px ${fontFamily}`;
      g.textBaseline = "alphabetic";
      const letters = "COFFEE".split("");
      const tracking = fontPx * 0.34;
      const widths = letters.map((ch) => g.measureText(ch).width);
      const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (letters.length - 1);
      g.setTransform(squash, 0, 0, 1, toX(0, coffeeBase), toY(coffeeBase));
      let x = -total / 2;
      letters.forEach((ch, i) => {
        g.fillText(ch, x, 0);
        x += widths[i] + tracking;
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.restore();
  };

  drawBadge(colours.ink);
  if (colours.inkOnBlock !== colours.ink) {
    g.save();
    g.clip(block);
    drawBadge(colours.inkOnBlock);
    g.restore();
  }

  // 4. Baked occlusion: under the lid skirt and where the wall meets the floor.
  const topY = toY(visible);
  const lid = g.createLinearGradient(0, topY, 0, topY + 0.07 * ky);
  lid.addColorStop(0, "rgba(38, 34, 28, 0.2)");
  lid.addColorStop(0.35, "rgba(38, 34, 28, 0.07)");
  lid.addColorStop(1, "rgba(38, 34, 28, 0)");
  g.fillStyle = lid;
  g.fillRect(0, 0, W, topY + 0.07 * ky);

  const base = g.createLinearGradient(0, H, 0, H - 0.05 * ky);
  base.addColorStop(0, "rgba(38, 34, 28, 0.16)");
  base.addColorStop(1, "rgba(38, 34, 28, 0)");
  g.fillStyle = base;
  g.fillRect(0, H - 0.05 * ky, W, 0.05 * ky);

  // 5. The sleeve seam at the back: the overlapping edge casts a hairline shadow.
  const seam = g.createLinearGradient(W - 7, 0, W, 0);
  seam.addColorStop(0, "rgba(20, 18, 14, 0)");
  seam.addColorStop(1, "rgba(20, 18, 14, 0.2)");
  g.fillStyle = seam;
  g.fillRect(W - 7, 0, 7, H);
  g.fillStyle = "rgba(255, 255, 255, 0.35)";
  g.fillRect(0, 0, 2, H);

  return canvas;
}

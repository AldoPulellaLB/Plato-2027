// Paper cup livery, painted on a canvas and wrapped on the cup wall.
// White stock, one bold diagonal colour block (the cup's size colour) and the
// printed Platō emblem: the philosopher bust in the hanging-sign hexagon with
// PLATO COFFEE, drawn from the flat emblem artwork in black ink, as on the real
// 250 / 350 / 500ml cups.
//
// Mapping: the wall is a cone (LatheGeometry, phiStart = -PI) so texture u is
// the angle around the cup (u = 0.5 faces the camera) and v is the height.
// Everything is drawn in "wall units" (arc length a, height y) and converted
// through the cone, so the artwork keeps its true proportions on the taper,
// the way a printed cup blank is pre-distorted.

/** Flat emblem artwork: black ink on transparency, trimmed to the emblem. */
export const CUP_EMBLEM_SRC = "/assets/brand/cup-emblem.webp";

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
}

/**
 * Direction of the colour block's edge across the front face. "rise": the block
 * fills the upper left and its edge climbs to the right (the 250 and 350ml
 * cups); "fall": it fills the upper right and its edge drops to the right (500ml).
 */
export type BlockSweep = "rise" | "fall";

const TAU = Math.PI * 2;
/** Emblem width as a fraction of the mid radius (measured on the real cups). */
const EMBLEM_WIDTH = 0.9;
/** Never taller than this share of the visible wall. */
const EMBLEM_MAX_HEIGHT = 0.8;

export function paintCupLivery(
  shape: CupShape,
  colours: LiveryColours,
  sweep: BlockSweep,
  width: number,
  emblem: HTMLImageElement | null,
) {
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
  const toY = (y: number) => H * (1 - y / h);
  /** Horizontal correction for artwork at height y (taper compensation). */
  const squashAt = (y: number) => rMid / radiusAt(y);

  const visible = h - lidOverlap;
  const quarter = (Math.PI * rMid) / 2; // a quarter of the way round: the visible half-width

  // 1. Paper stock.
  g.fillStyle = colours.paper;
  g.fillRect(0, 0, W, H);

  // 2. The diagonal colour block: everything above a line across the front
  // face, continued round the cup.
  const a1 = -1.08 * quarter;
  const a2 = 1.08 * quarter;
  const y1 = (sweep === "rise" ? 0.2 : 0.97) * visible;
  const y2 = (sweep === "rise" ? 1.02 : 0.12) * visible;
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

  // 3. The emblem, centred on the front face. Painted one texel row at a time
  // so each row is pre-squashed for its own radius and the hexagon's sides stay
  // straight on the tapered wall.
  if (emblem && emblem.naturalWidth > 0) {
    const iw = emblem.naturalWidth;
    const ih = emblem.naturalHeight;
    let ew = EMBLEM_WIDTH * rMid;
    let eh = (ew * ih) / iw;
    if (eh > EMBLEM_MAX_HEIGHT * visible) {
      eh = EMBLEM_MAX_HEIGHT * visible;
      ew = (eh * iw) / ih;
    }
    const top = 0.5 * visible + eh / 2;

    const ink = document.createElement("canvas");
    ink.width = iw;
    ink.height = ih;
    const ig = ink.getContext("2d")!;
    ig.drawImage(emblem, 0, 0);
    ig.globalCompositeOperation = "source-in";
    ig.fillStyle = colours.ink;
    ig.fillRect(0, 0, iw, ih);

    g.save();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    const row0 = Math.floor(toY(top));
    const row1 = Math.ceil(toY(top - eh));
    const srcPerRow = ih / ((eh * ky) || 1);
    for (let py = row0; py < row1; py += 1) {
      const y = h * (1 - (py + 0.5) / H);
      const sy = ((top - y) / eh) * ih - srcPerRow / 2;
      const dw = ew * ky * squashAt(y);
      g.drawImage(ink, 0, Math.max(0, sy), iw, srcPerRow, W / 2 - dw / 2, py, dw, 1);
    }
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

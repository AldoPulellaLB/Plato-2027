// Where the chapter-one DOM copy sits inside its pinned stage, so the stacked
// (portrait) compositions can keep the hopper (f02) and the drum window (f03)
// clear of it. Read from layout offsets, so reveal transforms never skew it;
// every value falls back to the stacked mobile layout when it cannot be read.

export interface CopyBounds {
  /** Fixed header height (px). */
  header: number;
  /** f02: top of the copy block (the kicker), px from the stage top. */
  pourTop: number;
  /** f03: bottom of the title block, px from the stage top. */
  titleBottom: number;
  /** f03: top of the roast readout (temperature and stages), px from the stage top. */
  roastTop: number;
}

/** Offset of `el` from the top of `root`, following the offsetParent chain (null if root is not on it). */
function offsetWithin(el: Element | null | undefined, root: Element | null | undefined): number | null {
  if (!(el instanceof HTMLElement) || !(root instanceof HTMLElement)) return null;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === root ? y : null;
}

const stageOf = (frame: Element | null) => frame?.querySelector(":scope > .frame__stage");

export function measureCopy(height: number): CopyBounds {
  const out: CopyBounds = { header: 76, pourTop: height * 0.6, titleBottom: height * 0.24, roastTop: height * 0.77 };
  if (typeof document === "undefined") return out;

  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
  if (header > 0 && header < height * 0.3) out.header = header;

  const f02 = document.getElementById("f02");
  const kicker = f02?.querySelector(".ch-f02__kicker") ?? f02?.querySelector(".ch-f02__col");
  const pourTop = offsetWithin(kicker, stageOf(f02));
  if (pourTop !== null && pourTop > height * 0.3 && pourTop < height) out.pourTop = pourTop;

  const f03 = document.getElementById("f03");
  const stage = stageOf(f03);
  const title = f03?.querySelector(".ch-f03__title");
  const titleTop = offsetWithin(title, stage);
  if (titleTop !== null && title instanceof HTMLElement) {
    const bottom = titleTop + title.offsetHeight;
    if (bottom > 0 && bottom < height * 0.5) out.titleBottom = bottom;
  }
  const roastTop = offsetWithin(f03?.querySelector(".ch-roast"), stage);
  if (roastTop !== null && roastTop > height * 0.4 && roastTop < height) out.roastTop = roastTop;
  return out;
}

export function sameCopy(a: CopyBounds | null, b: CopyBounds | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.header - b.header) < 2 &&
    Math.abs(a.pourTop - b.pourTop) < 2 &&
    Math.abs(a.titleBottom - b.titleBottom) < 2 &&
    Math.abs(a.roastTop - b.roastTop) < 2
  );
}

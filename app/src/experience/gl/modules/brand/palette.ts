// Brand colours for the WebGL brand scene, read from the design tokens in
// plato.css so the canvas always matches the DOM (fallbacks are the same
// locked palette values from the design brief).

export interface BrandPalette {
  paper: string;
  paperWarm: string;
  stone: string;
  stoneDeep: string;
  green: string;
  peach: string;
  sage: string;
  ink: string;
}

const FALLBACK: BrandPalette = {
  paper: "#fbfbf8",
  paperWarm: "#f6f5f0",
  stone: "#e7e5df",
  stoneDeep: "#cfcbc2",
  green: "#003c2f",
  peach: "#f2b9a3",
  sage: "#c9dccd",
  ink: "#0f1d18",
};

const TOKENS: Record<keyof BrandPalette, string> = {
  paper: "--plato-paper",
  paperWarm: "--plato-paper-warm",
  stone: "--plato-stone",
  stoneDeep: "--plato-stone-deep",
  green: "--plato-green",
  peach: "--plato-peach",
  sage: "--plato-sage",
  ink: "--plato-ink",
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Client only (called from the module's init). */
export function readBrandPalette(): BrandPalette {
  const out = { ...FALLBACK };
  try {
    const css = getComputedStyle(document.documentElement);
    for (const key of Object.keys(TOKENS) as (keyof BrandPalette)[]) {
      const value = css.getPropertyValue(TOKENS[key]).trim();
      if (HEX.test(value)) out[key] = value;
    }
  } catch {
    // Keep the fallbacks.
  }
  return out;
}

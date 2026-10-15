/**
 * Hero themes: each full page load opens the story in one of three palettes,
 * with its own cup behind the cold-open headline. A tiny inline script in the
 * document head (HERO_THEME_SCRIPT, rendered by __root.tsx) picks the theme
 * before first paint and writes it to <html data-roast>, so CSS (plato.css,
 * bean.css) paints the right background and cup without a flash. Script code
 * reads the same attribute through heroTheme().
 *
 * Only the roast palette changes: the menu's forest green and every paper
 * section stay as they are.
 */

export type HeroThemeKey = "seagreen" | "magenta" | "olive";

type Rgb = readonly [number, number, number];

export interface HeroCup {
  /** The cup photo (static first paint, touch devices, reduced motion). */
  photo: string;
  /** Print map: the photo with its studio light divided out of the printed band (RGB / 1.15, photo alpha). */
  print: string;
  /** Low-res light map: the studio light across the photo, in photo space. */
  light: string;
  /** Photo size in px. */
  width: number;
  height: number;
  /** Cup axis x and radius as linear functions of the band row Y: [slope, intercept]. */
  axis: readonly [number, number];
  radius: readonly [number, number];
  /** Printed band edges as ellipses y = Y + b * cos(angle): lid bottom and foot step, [Y, b]. */
  lid: readonly [number, number];
  foot: readonly [number, number];
}

export interface HeroTheme {
  key: HeroThemeKey;
  /** Roast background at the start of the story, and its lighter companion (sRGB 0..255). */
  roast: Rgb;
  roast2: Rgb;
  cup: HeroCup;
}

/** Geometry fitted from the client's cup photos (website 2/images). */
export const HERO_THEMES: Record<HeroThemeKey, HeroTheme> = {
  seagreen: {
    key: "seagreen",
    roast: [1, 14, 8],
    roast2: [10, 23, 16],
    cup: {
      photo: "/assets/hero/cup-seagreen.webp",
      print: "/assets/hero/cup-seagreen-print.webp",
      light: "/assets/hero/cup-seagreen-light.png",
      width: 657,
      height: 1095,
      axis: [0.003156, 328.149],
      radius: [-0.086501, 308.44],
      lid: [180.81, 31.4],
      foot: [966.75, 57.25],
    },
  },
  magenta: {
    key: "magenta",
    roast: [15, 11, 8],
    roast2: [24, 20, 16],
    cup: {
      photo: "/assets/hero/cup-magenta.webp",
      print: "/assets/hero/cup-magenta-print.webp",
      light: "/assets/hero/cup-magenta-light.png",
      width: 655,
      height: 910,
      axis: [-0.00133, 328.013],
      radius: [-0.091785, 309.252],
      lid: [190.31, 34.66],
      foot: [770.27, 60.84],
    },
  },
  olive: {
    key: "olive",
    roast: [12, 13, 10],
    roast2: [21, 22, 18],
    cup: {
      photo: "/assets/hero/cup-olive.webp",
      print: "/assets/hero/cup-olive-print.webp",
      light: "/assets/hero/cup-olive-light.png",
      width: 597,
      height: 998,
      axis: [0.003358, 298.15],
      radius: [-0.086838, 281.62],
      lid: [161.97, 30.2],
      foot: [881.06, 51.78],
    },
  },
};

export const HERO_THEME_KEYS = Object.keys(HERO_THEMES) as HeroThemeKey[];

const STORAGE_KEY = "plato-hero";

const hex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/**
 * Runs in <head> before first paint: steps to the next theme after the one
 * shown last time (so every refresh changes it; random on a first visit),
 * marks <html data-roast> and recolours the browser chrome.
 */
export const HERO_THEME_SCRIPT = `(function(){try{var k=${JSON.stringify(HERO_THEME_KEYS)},c=${JSON.stringify(
  Object.fromEntries(HERO_THEME_KEYS.map((key) => [key, hex(HERO_THEMES[key].roast)])),
)},s=null;try{s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})}catch(e){}var i=k.indexOf(s),t=k[i<0?Math.floor(Math.random()*k.length):(i+1)%k.length];document.documentElement.setAttribute("data-roast",t);try{localStorage.setItem(${JSON.stringify(STORAGE_KEY)},t)}catch(e){}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c[t])}catch(e){}})();`;

let cached: HeroTheme | null = null;

/** The theme picked for this page load (sea green on the server or if the script did not run). */
export function heroTheme(): HeroTheme {
  if (typeof document === "undefined") return HERO_THEMES.seagreen;
  if (!cached) {
    const key = document.documentElement.dataset.roast as HeroThemeKey | undefined;
    cached = (key && HERO_THEMES[key]) || HERO_THEMES.seagreen;
  }
  return cached;
}

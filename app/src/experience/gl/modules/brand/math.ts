// Small, allocation-free helpers shared by the brand scene (frames 10 and 12).

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0..1 position of x inside [a, b], clamped. */
export const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Frame-rate independent exponential approach of `current` to `target`. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  if (dt <= 0) return target;
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** Gaussian bump centred on c with half-width w (1 at c). */
export const bump = (x: number, c: number, w: number) => {
  const d = (x - c) / w;
  return Math.exp(-d * d);
};

/** Deterministic PRNG (mulberry32): same seed, same sequence, every visit. */
export function createRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

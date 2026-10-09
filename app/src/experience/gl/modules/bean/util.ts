// Small math helpers for the chapter-one film. Pure functions, no allocations.

export const TAU = Math.PI * 2;

export function clamp(x: number, lo = 0, hi = 1) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Normalised position of x inside [a, b], clamped to 0..1. */
export function range(x: number, a: number, b: number) {
  return clamp((x - a) / (b - a));
}

export function smooth(t: number) {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

export function smoother(t: number) {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function easeInCubic(t: number) {
  const x = clamp(t);
  return x * x * x;
}

export function easeOutCubic(t: number) {
  const x = 1 - clamp(t);
  return 1 - x * x * x;
}

export function easeInOutCubic(t: number) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutExpo(t: number) {
  const x = clamp(t);
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInExpo(t: number) {
  const x = clamp(t);
  return x <= 0 ? 0 : Math.pow(2, 10 * x - 10);
}

export function easeInOutQuint(t: number) {
  const x = clamp(t);
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

/** Back-out overshoot for the cup pop. */
export function easeOutBack(t: number, s = 1.9) {
  const x = clamp(t) - 1;
  return 1 + x * x * ((s + 1) * x + s);
}

/** Smooth bump: 0 outside [c - w, c + w], 1 at c. */
export function bell(x: number, c: number, w: number) {
  const d = (x - c) / w;
  if (d <= -1 || d >= 1) return 0;
  const k = 1 - d * d;
  return k * k;
}

export function fract(x: number) {
  return x - Math.floor(x);
}

/** Deterministic hash in [0, 1) for (seed, channel). */
export function hash(seed: number, channel = 0) {
  const x = Math.sin(seed * 127.1 + channel * 311.7 + 74.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Signed deterministic hash in [-1, 1). */
export function shash(seed: number, channel = 0) {
  return hash(seed, channel) * 2 - 1;
}

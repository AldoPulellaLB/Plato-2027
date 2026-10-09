// Shared resources and per-bean helpers for the chapter-one sets.
import * as THREE from "three";

import { hash, shash } from "./util";

export interface FilmState {
  /** Continuous beat 0..9 (see timeline.ts). */
  b: number;
  time: number;
  delta: number;
  reduced: boolean;
  isMobile: boolean;
  aspect: number;
  pointer: { x: number; y: number };
  camera: THREE.PerspectiveCamera;
}

export interface Kit {
  isMobile: boolean;
  envMap: THREE.Texture;
  beanGeo: THREE.BufferGeometry;
  beanNoise: THREE.Texture;
  brushed: THREE.Texture;
  glow: THREE.Texture;
  smoke: THREE.Texture;
  maxAnisotropy: number;
}

/** Per-instance constants for a population of beans. */
export interface BeanParams {
  count: number;
  q: Float32Array;
  axis: Float32Array;
  spin: Float32Array;
  scale: Float32Array;
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

export function makeBeanParams(count: number, seed: number, scaleMin: number, scaleMax: number): BeanParams {
  const q = new Float32Array(count * 4);
  const axis = new Float32Array(count * 3);
  const spin = new Float32Array(count);
  const scale = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const k = i + seed * 997;
    _e.set(hash(k, 1) * Math.PI * 2, hash(k, 2) * Math.PI * 2, hash(k, 3) * Math.PI * 2);
    _q.setFromEuler(_e);
    q[i * 4] = _q.x;
    q[i * 4 + 1] = _q.y;
    q[i * 4 + 2] = _q.z;
    q[i * 4 + 3] = _q.w;
    _ax.set(shash(k, 4), shash(k, 5), shash(k, 6)).normalize();
    if (_ax.lengthSq() < 0.01) _ax.set(0, 1, 0);
    axis[i * 3] = _ax.x;
    axis[i * 3 + 1] = _ax.y;
    axis[i * 3 + 2] = _ax.z;
    spin[i] = (0.5 + hash(k, 7)) * (hash(k, 8) > 0.5 ? 1 : -1);
    scale[i] = scaleMin + (scaleMax - scaleMin) * hash(k, 9);
  }
  return { count, q, axis, spin, scale };
}

/** Write bean i: base orientation, then a spin of `angle` about its own axis, optionally pre-rotated by `outer`. */
export function composeBean(
  mesh: THREE.InstancedMesh,
  index: number,
  p: BeanParams,
  local: number,
  pos: THREE.Vector3,
  angle: number,
  scaleMul: number,
  outer?: THREE.Quaternion,
) {
  _q.set(p.q[local * 4], p.q[local * 4 + 1], p.q[local * 4 + 2], p.q[local * 4 + 3]);
  if (angle !== 0) {
    _ax.set(p.axis[local * 3], p.axis[local * 3 + 1], p.axis[local * 3 + 2]);
    _qa.setFromAxisAngle(_ax, angle);
    _q.premultiply(_qa);
  }
  if (outer) _q.premultiply(outer);
  const s = p.scale[local] * scaleMul;
  _s.set(s, s, s);
  _m.compose(pos, _q, _s);
  mesh.setMatrixAt(index, _m);
}

export function hideInstance(mesh: THREE.InstancedMesh, index: number) {
  _m.makeScale(0, 0, 0);
  mesh.setMatrixAt(index, _m);
}

/** Per-instance colour variation around white (multiplies the material colour). */
export function varyColors(mesh: THREE.InstancedMesh, count: number, seed: number, amount: number, warmth = 0.5) {
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i + seed * 541;
    const l = 1 + shash(k, 11) * amount;
    const w = shash(k, 12) * amount * warmth;
    c.setRGB(l * (1 + w * 0.6), l * (1 + w * 0.1), l * (1 - w * 0.7));
    mesh.setColorAt(i, c);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function makeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  for (let i = 0; i < count; i += 1) hideInstance(mesh, i);
  return mesh;
}

/** Brushed stainless steel. */
export function steelMaterial(kit: Kit, tone = 0.68, roughness = 0.3, env = 0.55) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(tone, tone, tone * 1.01, THREE.SRGBColorSpace),
    metalness: 1,
    // The brushed map averages ~0.53, so this lands near the requested roughness.
    roughness: Math.min(1, roughness * 1.9),
    roughnessMap: kit.brushed,
    envMap: kit.envMap,
    envMapIntensity: env,
    side: THREE.DoubleSide,
  });
  return m;
}

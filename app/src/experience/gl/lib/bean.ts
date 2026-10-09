// Procedural coffee bean geometry: an ellipsoid with one flattened face and the
// characteristic S-shaped centre crease. Shared by every bean in the story.
import * as THREE from "three";

export interface BeanOptions {
  /** Sphere segments (detail). 32 desktop, 20 mobile is plenty. */
  segments?: number;
  /** Long axis length (x). */
  length?: number;
  /** Width (y). */
  width?: number;
  /** Thickness (z). */
  thickness?: number;
  /** Crease depth relative to thickness. */
  crease?: number;
}

export function createBeanGeometry({
  segments = 32,
  length = 1,
  width = 0.72,
  thickness = 0.5,
  crease = 0.32,
}: BeanOptions = {}) {
  const geo = new THREE.SphereGeometry(0.5, segments, Math.round(segments * 0.75));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const x = v.x * length;
    let y = v.y * width;
    let z = v.z * thickness;
    // Flatten the front face (z > 0) into a gentle dome.
    if (z > 0) z *= 0.55 + 0.45 * (1 - Math.min(1, (x * x) / (0.25 * length * length) + (y * y) / (0.25 * width * width)));
    // S-shaped crease along the long axis on the flat face.
    if (v.z > 0) {
      const sCurve = Math.sin((x / length) * Math.PI * 1.2) * width * 0.06;
      const d = (y - sCurve) / (width * 0.07);
      const groove = Math.exp(-d * d) * thickness * crease;
      const taper = 1 - Math.pow(Math.min(1, Math.abs(x) / (0.5 * length)), 4);
      z -= groove * taper;
    }
    // Slight asymmetry so beans do not look stamped.
    y += 0.02 * Math.sin(x * 9.0) * width;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A tiny tileable noise texture for bean surface roughness/bump (generated on a canvas). */
export function createBeanNoiseTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 150 + Math.random() * 90;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

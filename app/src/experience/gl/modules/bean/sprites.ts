// Instanced, premultiplied-alpha sprites (glows, blurred foreground beans, chaff,
// steam), the full-screen grade overlay (vignette, dips, the dark-coffee hand-off)
// and the dust motes. Everything outputs premultiplied colour so the transparent
// canvas composites cleanly over the roast-black page.
import * as THREE from "three";

const SPRITE_VERT = /* glsl */ `
attribute vec4 aTint;
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vUv = uv;
  vTint = aTint;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const SPRITE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAdd;
uniform float uOpacity;
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vec4 t = texture2D(map, vUv);
  float a = t.a * vTint.a * uOpacity;
  if (a < 0.002) discard;
  vec3 c = t.rgb * vTint.rgb * a;
  gl_FragColor = vec4(c, a * (1.0 - uAdd));
}`;

function premultipliedBlend(m: THREE.Material) {
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
}

export interface SpriteOptions {
  /** 0 = premultiplied "over", 1 = purely additive (light). */
  additive?: number;
  depthTest?: boolean;
  renderOrder?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qz = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

/** A batch of camera-facing textured quads in one draw call. */
export class SpriteBatch {
  readonly mesh: THREE.InstancedMesh;
  readonly material: THREE.ShaderMaterial;
  private readonly tint: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.PlaneGeometry;
  readonly count: number;

  constructor(count: number, map: THREE.Texture, opts: SpriteOptions = {}) {
    this.count = count;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.tint = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.tint.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("aTint", this.tint);
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uAdd: { value: opts.additive ?? 0 }, uOpacity: { value: 1 } },
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: opts.depthTest ?? true,
      side: THREE.DoubleSide,
    });
    premultipliedBlend(this.material);
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 10;
    for (let i = 0; i < count; i += 1) this.hide(i);
  }

  /** Place sprite i facing the camera (quaternion q), rotated by `angle` in screen plane, sized sx by sy. */
  set(i: number, pos: THREE.Vector3, facing: THREE.Quaternion, angle: number, sx: number, sy: number, r: number, g: number, b: number, a: number) {
    _qz.setFromAxisAngle(_z, angle);
    _q.copy(facing).multiply(_qz);
    _s.set(sx, sy, 1);
    _m.compose(pos, _q, _s);
    this.mesh.setMatrixAt(i, _m);
    this.tint.setXYZW(i, r, g, b, a);
  }

  hide(i: number) {
    _m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, _m);
    this.tint.setXYZW(i, 0, 0, 0, 0);
  }

  commit() {
    this.mesh.instanceMatrix.needsUpdate = true;
    this.tint.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Full-screen grade: vignette, dip to roast black, dark-coffee hand-off. */

const OVERLAY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const OVERLAY_FRAG = /* glsl */ `
uniform float uVignette;
uniform float uDip;
uniform float uCoffee;
uniform float uAspect;
uniform vec3 uRoast;
uniform vec3 uCoffeeColor;
uniform vec2 uCentre;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5 - uCentre * 0.5) * vec2(uAspect, 1.0);
  float d = length(p) / length(vec2(uAspect, 1.0) * 0.5);
  float vig = uVignette * smoothstep(0.38, 1.08, d);
  float a1 = 1.0 - (1.0 - vig) * (1.0 - uDip);
  // The coffee closes in from the edges a beat before it fills the frame.
  float a2 = clamp(uCoffee * 1.6 - (1.0 - d) * 0.6, 0.0, 1.0);
  a2 = max(a2, smoothstep(0.75, 1.0, uCoffee));
  vec3 c = uRoast * a1 * (1.0 - a2) + uCoffeeColor * a2;
  float a = a1 + a2 - a1 * a2;
  gl_FragColor = vec4(c, a);
}`;

export class ScreenGrade {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.PlaneGeometry;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uVignette: { value: 0.6 },
        uDip: { value: 0 },
        uCoffee: { value: 0 },
        uAspect: { value: 1 },
        // Display-space values: this shader writes straight to the sRGB canvas.
        uRoast: { value: new THREE.Vector3(14 / 255, 13 / 255, 11 / 255) },
        uCoffeeColor: { value: new THREE.Vector3(20 / 255, 12 / 255, 8 / 255) },
        uCentre: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: OVERLAY_VERT,
      fragmentShader: OVERLAY_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    premultipliedBlend(this.material);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Dust motes drifting in the window light (ambient, animated in the vertex shader). */

const DUST_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPx;
uniform vec3 uBeamA;
uniform vec3 uBeamDir;
varying float vLight;
void main() {
  vec3 p = position;
  float s = aSeed * 6.2831;
  p.x += sin(uTime * 0.11 + s) * 0.35 + uTime * 0.025;
  p.y += sin(uTime * 0.07 + s * 1.7) * 0.45;
  p.z += cos(uTime * 0.09 + s * 1.3) * 0.3;
  vec3 rel = p - uBeamA;
  vec3 onAxis = uBeamA + uBeamDir * dot(rel, uBeamDir);
  float dist = length(p - onAxis);
  vLight = 0.25 + 0.75 * exp(-dist * dist * 0.45);
  vLight *= 0.6 + 0.4 * sin(uTime * 0.8 + s * 3.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.6 + fract(aSeed * 13.7) * 1.1) / max(0.5, -mv.z);
}`;

const DUST_FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying float vLight;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  float a = (1.0 - r);
  if (a <= 0.0) discard;
  a = a * a * vLight * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}`;

export class DustField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;

  constructor(count: number, min: THREE.Vector3, max: THREE.Vector3, seed = 1) {
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const h = (k: number) => {
        const x = Math.sin((i + seed * 1000) * 12.9898 + k * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      pos[i * 3] = min.x + (max.x - min.x) * h(1);
      pos[i * 3 + 1] = min.y + (max.y - min.y) * h(2);
      pos[i * 3 + 2] = min.z + (max.z - min.z) * h(3);
      seeds[i] = h(4);
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPx: { value: 40 },
        uOpacity: { value: 0.5 },
        uColor: { value: new THREE.Vector3(0.92, 0.86, 0.76) },
        uBeamA: { value: new THREE.Vector3() },
        uBeamDir: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
    });
    premultipliedBlend(this.material);
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

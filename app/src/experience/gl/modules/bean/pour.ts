// Frames f01 + f02: green beans drift at the bottom of the dark, fall toward the
// viewer, then pour from the top of frame into a steel roaster hopper.
// Three depth layers: blurred foreground beans (1.6x), the hopper and pour (1x),
// far beans in the dark (0.5x). Hero motion is scroll (beat) driven only.
import * as THREE from "three";

import type { FilmState, Kit } from "./kit";
import { composeBean, hideInstance, makeBeanParams, makeInstanced, steelMaterial, varyColors } from "./kit";
import type { Shot } from "./rig";
import { shotQuaternion } from "./rig";
import { DustField, SpriteBatch } from "./sprites";
import { beamTexture } from "./textures";
import { clamp, fract, hash, mix, range, smooth } from "./util";

/** Hopper rim (the circle that becomes the drum window). */
/** The client's photo of an out-of-focus green bean (portrait, straight alpha), for the foreground layer. */
const FG_BEAN_SRC = "/assets/bean/bean-blur.png";
/** Its height over width (595 x 798 px). */
const FG_BEAN_ASPECT = 798 / 595;
/** Brightness of the foreground beans against the photo's own colour (it is already green). */
const FG_BEAN_LEVEL = 0.8;

export const HOPPER_RIM_RADIUS = 1.47;
export const HOPPER_RIM_TUBE = 0.09;
/** The outlet flange under the slide gate: the lowest part of the hopper when the stem is off. */
export const HOPPER_OUTLET_Y = -3.57;
export const HOPPER_OUTLET_R = 0.58;
/** Where the funnel hands over to the long stem (hidden inside the outlet flange). */
const STEM_TOP = -3.5;
const STEM_BOTTOM = -14;

const POUR_START = 0.55;
const POUR_STOP = 2.02;
const STREAM_RATE = 2.3;
const STREAM_TOP = 6.2;

function innerRadius(y: number) {
  if (y >= -0.6) return 1.36;
  if (y <= -2.05) return 0.4;
  return mix(0.44, 1.34, (y + 2.05) / 1.45);
}

/** Fill level of the bean heap inside the hopper. */
export function heapLevel(b: number) {
  return mix(-1.86, -0.4, smooth(range(b, 0.62, 2.4)));
}

export interface PourSet {
  group: THREE.Group;
  /**
   * `stem`: draw the long stem below the outlet flange (it runs out of frame on
   * wide layouts; stacked portrait layouts end the hopper at the flange so the
   * copy underneath sits on clean black).
   */
  layout(anchor: Shot, aspect: number, dpr: number, stem?: boolean): void;
  update(s: FilmState): void;
  dispose(): void;
}

const _p = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _anchor = new THREE.Vector3();

export function createPourSet(kit: Kit): PourSet {
  const group = new THREE.Group();
  group.name = "pour";
  const m = kit.isMobile;

  const nDrift = m ? 40 : 86;
  const nStream = m ? 64 : 150;
  const nHeap = m ? 52 : 118;
  const nBg = m ? 26 : 74;
  const total = nDrift + nStream + nHeap + nBg;
  const oStream = nDrift;
  const oHeap = oStream + nStream;
  const oBg = oHeap + nHeap;

  /* Beans ------------------------------------------------------------ */
  const greenMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.47, 0.52, 0.35, THREE.SRGBColorSpace),
    roughness: 0.66,
    metalness: 0,
    bumpMap: kit.beanNoise,
    bumpScale: 2,
    envMap: kit.envMap,
    envMapIntensity: 0.14,
  });
  const beans = makeInstanced(kit.beanGeo, greenMat, total);
  varyColors(beans, total, 3, 0.16, 0.8);
  {
    // Far drift beans sink into the dark: "faint green beans drift at the bottom edge".
    const c = new THREE.Color();
    for (let i = 0; i < nDrift; i += 1) {
      beans.getColorAt(i, c);
      c.multiplyScalar(mix(0.95, 0.38, Math.pow(hash(i, 1), 1.25)));
      beans.setColorAt(i, c);
    }
    if (beans.instanceColor) beans.instanceColor.needsUpdate = true;
  }
  group.add(beans);

  const drift = makeBeanParams(nDrift, 1, 0.26, 0.36);
  const stream = makeBeanParams(nStream, 2, 0.22, 0.29);
  const heap = makeBeanParams(nHeap, 3, 0.22, 0.27);
  const bg = makeBeanParams(nBg, 4, 0.26, 0.34);
  const driftOff = new Float32Array(nDrift * 2);

  /* Hopper ----------------------------------------------------------- */
  const steel = steelMaterial(kit, 0.56, 0.3, 0.42);
  const profile = [
    new THREE.Vector2(1.44, -0.02),
    new THREE.Vector2(1.44, -0.52),
    new THREE.Vector2(1.4, -0.62),
    new THREE.Vector2(0.5, -2.05),
    new THREE.Vector2(0.44, -2.15),
    new THREE.Vector2(0.42, -2.25),
    new THREE.Vector2(0.42, -2.8),
    new THREE.Vector2(0.47, -2.84),
    new THREE.Vector2(0.47, -3.0),
    new THREE.Vector2(0.42, -3.04),
    new THREE.Vector2(0.42, STEM_TOP),
  ];
  const funnelGeo = new THREE.LatheGeometry(profile, m ? 40 : 72);
  const funnel = new THREE.Mesh(funnelGeo, steel);
  // The stem continues below the flange; the seam sits inside the flange.
  const stemGeo = new THREE.CylinderGeometry(0.42, 0.42, STEM_TOP - STEM_BOTTOM, m ? 40 : 72, 1, true);
  const stem = new THREE.Mesh(stemGeo, steel);
  stem.position.y = (STEM_TOP + STEM_BOTTOM) / 2;
  const rimGeo = new THREE.TorusGeometry(HOPPER_RIM_RADIUS, HOPPER_RIM_TUBE, 20, m ? 64 : 120);
  const rim = new THREE.Mesh(rimGeo, steel);
  rim.rotation.x = Math.PI / 2;
  const collarGeo = new THREE.TorusGeometry(0.46, 0.05, 12, 48);
  const collar = new THREE.Mesh(collarGeo, steel);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -2.36;
  const seamGeo = new THREE.TorusGeometry(1.425, 0.018, 8, m ? 64 : 120);
  const seam = new THREE.Mesh(seamGeo, steel);
  seam.rotation.x = Math.PI / 2;
  seam.position.y = -0.56;
  const gateGeo = new THREE.BoxGeometry(1.25, 0.07, 0.62);
  const gate = new THREE.Mesh(gateGeo, steel);
  gate.position.set(0.36, -2.58, 0);
  const knobGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.18, 16);
  const knob = new THREE.Mesh(knobGeo, steel);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(1.05, -2.58, 0);
  const flangeGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.14, 40);
  const enamel = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.07, 0.075, 0.07, THREE.SRGBColorSpace),
    metalness: 0.35,
    roughness: 0.42,
    envMap: kit.envMap,
    envMapIntensity: 0.35,
  });
  const flange = new THREE.Mesh(flangeGeo, enamel);
  flange.position.y = HOPPER_OUTLET_Y + 0.07;
  const hopper = new THREE.Group();
  hopper.add(funnel, stem, rim, seam, collar, gate, knob, flange);
  group.add(hopper);

  // Heap mass under the surface beans (a shallow cone of dark beans).
  const massGeo = new THREE.CircleGeometry(1, 48);
  massGeo.rotateX(-Math.PI / 2);
  {
    const pos = massGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      pos.setY(i, 0.2 * (1 - r * r));
    }
    massGeo.computeVertexNormals();
  }
  const massMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.16, 0.19, 0.12, THREE.SRGBColorSpace),
    roughness: 0.92,
  });
  const mass = new THREE.Mesh(massGeo, massMat);
  group.add(mass);

  /* Foreground blur, beams, dust -------------------------------------- */
  // Loads in the background; the layer only shows from f02, long after.
  const blurTex = new THREE.TextureLoader().load(FG_BEAN_SRC);
  const nFg = m ? 7 : 15;
  const fg = new SpriteBatch(nFg, blurTex, { renderOrder: 40 });
  group.add(fg.mesh);

  const beamTex = beamTexture();
  const beams = new SpriteBatch(2, beamTex, { additive: 0.85, renderOrder: 4 });
  group.add(beams.mesh);

  const dust = new DustField(m ? 120 : 260, new THREE.Vector3(-9, -4, -7), new THREE.Vector3(9, 13, 5), 7);
  dust.material.uniforms.uBeamA.value.set(-8, 13, -5);
  dust.material.uniforms.uBeamDir.value.set(0.62, -0.72, 0.3).normalize();
  group.add(dust.points);

  /* Layout: the 1.6x layer is anchored to the f02 camera. ------------- */
  const fgDepthRatio = 1 / 1.6;
  let fgHalfH = 2;
  let fgHalfW = 3;
  const anchorPos = new THREE.Vector3();
  const anchorRight = new THREE.Vector3(1, 0, 0);
  const anchorUp = new THREE.Vector3(0, 1, 0);

  function layout(anchor: Shot, aspect: number, dpr: number, withStem = true) {
    stem.visible = withStem;
    shotQuaternion(anchor, _q);
    _fwd.set(0, 0, -1).applyQuaternion(_q);
    anchorRight.set(1, 0, 0).applyQuaternion(_q);
    anchorUp.set(0, 1, 0).applyQuaternion(_q);
    _c.set(0, 0, anchor.dist).applyQuaternion(_q);
    const depth = anchor.dist * fgDepthRatio;
    anchorPos.set(anchor.tx + _c.x, anchor.ty + _c.y, anchor.tz + _c.z).addScaledVector(_fwd, depth);
    fgHalfH = depth * Math.tan(THREE.MathUtils.degToRad(anchor.fov) / 2);
    fgHalfW = fgHalfH * aspect;
    dust.material.uniforms.uPx.value = (m ? 34 : 46) * dpr;
  }

  function update(s: FilmState) {
    const b = s.b;
    const visible = b < 3;
    group.visible = visible;
    if (!visible) return;
    const t = s.time;
    const cam = s.camera;
    const pe = cam.projectionMatrix.elements;
    const P0 = pe[0];
    const P5 = pe[5];
    const lsx = -pe[8];
    const lsy = -pe[9];
    const k = s.reduced ? 1 : 1 - Math.exp(-s.delta * 5);
    // Beans are sized for a landscape frame; narrow screens get proportionally smaller beans.
    const driftScale = clamp(Math.pow(s.aspect / 1.5, 0.55), 0.55, 1);

    /* f01 drift: camera-space band in the bottom 35%, falling toward the viewer on exit. */
    for (let i = 0; i < nDrift; i += 1) {
      const depthN = Math.pow(hash(i, 1), 1.25);
      let zc = -(4.4 + depthN * 9.5);
      const speed = (0.012 + hash(i, 3) * 0.018) * (1.25 - depthN * 0.6);
      let nx = -1.32 + fract(hash(i, 2) + (t * speed) / 2.64) * 2.64;
      let ny = mix(-0.98, -0.42, depthN * 0.72 + hash(i, 4) * 0.28) + Math.sin(t * 0.32 + i) * 0.012 + Math.min(b, 1) * 0.4;
      // Pointer: beans ease away from the cursor and drift back.
      const dx = (nx - s.pointer.x) * s.aspect;
      const dy = ny - s.pointer.y;
      const d2 = dx * dx + dy * dy;
      const push = s.reduced ? 0 : Math.exp(-d2 / 0.05) * 0.14 * (1 - depthN * 0.5);
      const inv = 1 / Math.max(0.02, Math.sqrt(d2));
      driftOff[i * 2] += ((dx * inv * push) / s.aspect - driftOff[i * 2]) * k;
      driftOff[i * 2 + 1] += (dy * inv * push - driftOff[i * 2 + 1]) * k;
      nx += driftOff[i * 2];
      ny += driftOff[i * 2 + 1];
      let xc = ((nx - lsx) * -zc) / P0;
      let yc = ((ny - lsy) * -zc) / P5;
      const start = 0.1 + hash(i, 5) * 0.3;
      const u = range(b, start, start + 0.34);
      const e = u * u;
      if (e > 0) {
        zc = mix(zc, 0.8, e);
        yc -= e * 1.4;
        xc *= 1 + e * 0.35;
      }
      if (zc > -0.35) {
        hideInstance(beans, i);
        continue;
      }
      _c.set(xc, yc, zc).applyMatrix4(cam.matrixWorld);
      const ang = t * 0.16 * drift.spin[i] + e * 5 * drift.spin[i] + hash(i, 6) * 6;
      composeBean(beans, i, drift, i, _c, ang, driftScale, cam.quaternion);
    }

    /* f02 stream: scroll-scrubbed pour into the hopper. */
    const level = heapLevel(b);
    const landY = level + 0.2;
    for (let j = 0; j < nStream; j += 1) {
      const idx = oStream + j;
      const phase = hash(j, 21);
      const sv = (b - POUR_START) * STREAM_RATE + phase;
      const cycle = Math.floor(sv);
      const u = sv - cycle;
      const launch = POUR_START + (cycle - phase) / STREAM_RATE;
      if (sv < 0 || cycle < 1 || launch > POUR_STOP) {
        hideInstance(beans, idx);
        continue;
      }
      const g = Math.min(1.25, Math.sqrt(-2 * Math.log(Math.max(1e-4, hash(j * 7 + cycle, 22)))) * 0.5);
      const th = hash(j * 7 + cycle, 23) * Math.PI * 2;
      const spread = 0.1 + 0.34 * u;
      const y = STREAM_TOP - (STREAM_TOP - landY) * Math.pow(u, 1.35);
      _p.set(Math.cos(th) * g * spread + 0.04, y, Math.sin(th) * g * spread * 0.8);
      const ang = (cycle + u) * 7 * stream.spin[j] + Math.sin(t * 1.3 + j) * 0.12;
      composeBean(beans, idx, stream, j, _p, ang, 1);
    }

    /* Heap: a rising surface of beans inside the funnel. */
    const heapOn = b > 0.6;
    const rl = innerRadius(level);
    const rMax = 1.34;
    mass.visible = heapOn;
    if (heapOn) {
      const rr = rl * 0.98;
      mass.scale.set(rr, 1, rr);
      mass.position.set(0, level - 0.08, 0);
    }
    for (let j = 0; j < nHeap; j += 1) {
      const idx = oHeap + j;
      const r = Math.sqrt((j + 0.5) / nHeap) * rMax * 0.94;
      const edge = clamp((rl * 0.93 - r) / 0.12);
      if (!heapOn || edge <= 0) {
        hideInstance(beans, idx);
        continue;
      }
      const a = j * 2.39996 + hash(j, 31) * 0.4;
      const rn = r / Math.max(0.3, rl);
      _p.set(Math.cos(a) * r, level + 0.2 * (1 - rn * rn) + hash(j, 32) * 0.05 - 0.02, Math.sin(a) * r);
      composeBean(beans, idx, heap, j, _p, Math.sin(t * 0.6 + j) * 0.03, smooth(edge));
    }

    /* Background layer: far beans falling at half speed. */
    const bgFade = range(b, 0.5, 1.05) * (1 - range(b, 2.3, 2.75));
    for (let j = 0; j < nBg; j += 1) {
      const idx = oBg + j;
      if (bgFade <= 0) {
        hideInstance(beans, idx);
        continue;
      }
      const x = -14 + hash(j, 41) * 28;
      const z = -9.5 - hash(j, 42) * 6;
      const y = -12 + fract(hash(j, 43) - b * 0.085) * 28;
      _p.set(x, y, z);
      const ang = b * 3 * bg.spin[j] + Math.sin(t * 0.4 + j) * 0.1;
      composeBean(beans, idx, bg, j, _p, ang, bgFade);
    }
    beans.instanceMatrix.needsUpdate = true;

    /* Foreground: big out-of-focus beans falling past the lens (1.6x). */
    const fgFade = range(b, 0.28, 0.62) * (1 - range(b, 2.05, 2.45));
    for (let i = 0; i < nFg; i += 1) {
      if (fgFade <= 0) {
        fg.hide(i);
        continue;
      }
      const left = i % 5 === 0;
      const xr = left ? -1.12 - hash(i, 51) * 0.22 : -0.05 + hash(i, 51) * 1.25;
      const yr = -1.4 + fract(hash(i, 52) - (b - 0.3) * (0.42 + hash(i, 53) * 0.3)) * 2.8;
      _p.copy(anchorPos)
        .addScaledVector(anchorRight, xr * fgHalfW)
        .addScaledVector(anchorUp, yr * fgHalfH);
      const size = (0.3 + hash(i, 54) * 0.3) * fgHalfH;
      const l = (0.5 + hash(i, 55) * 0.3) * FG_BEAN_LEVEL;
      // Same area as before (1.35 size^2), in the photo's portrait proportions.
      const w = size * Math.sqrt(1.35 / FG_BEAN_ASPECT);
      fg.set(i, _p, cam.quaternion, hash(i, 56) * 6.28 + b * 0.9 * (hash(i, 57) - 0.5), w, w * FG_BEAN_ASPECT, l, l, l, 0.9 * fgFade);
    }
    fg.commit();

    /* Window light and dust. */
    const air = 1 - range(b, 1.8, 2.6);
    _anchor.set(-6.5, 9.5, -9);
    beams.set(0, _anchor, cam.quaternion, -0.95, 22, 3.6, 1, 0.92, 0.8, 0.05 * air);
    _anchor.set(-4.6, 7.2, -11);
    beams.set(1, _anchor, cam.quaternion, -1.0, 18, 1.8, 1, 0.94, 0.84, 0.035 * air);
    beams.commit();
    dust.material.uniforms.uTime.value = t;
    dust.material.uniforms.uOpacity.value = 0.55 * air;
    dust.points.visible = air > 0.001;
  }

  return {
    group,
    layout,
    update,
    dispose() {
      greenMat.dispose();
      beans.dispose();
      steel.dispose();
      enamel.dispose();
      massMat.dispose();
      for (const g of [funnelGeo, stemGeo, rimGeo, seamGeo, collarGeo, gateGeo, knobGeo, flangeGeo, massGeo]) g.dispose();
      fg.dispose();
      beams.dispose();
      dust.dispose();
      blurTex.dispose();
      beamTex.dispose();
    },
  };
}

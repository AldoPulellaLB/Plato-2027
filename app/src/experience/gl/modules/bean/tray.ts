// Frame f04: the cooling tray from overhead. A perforated steel floor, a rolled
// rim, a hub with two stirring arms sweeping the roasted beans in a slow loop
// (ambient), smoke lifting off the fresh roast. On exit the tray turns away and
// fades while chosen beans rise and settle into the f05 grid as dots.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { roastColor } from "../../../story";

import type { Grid } from "./cups";
import { morphProgress } from "./cups";
import type { FilmState, Kit } from "./kit";
import { hideInstance, makeInstanced, steelMaterial, varyColors } from "./kit";
import { SpriteBatch } from "./sprites";
import { perforationTexture, trayShadeTexture } from "./textures";
import { bell, fract, hash, mix, range, shash, smooth, TAU } from "./util";

export const TRAY_ORIGIN = new THREE.Vector3(120, 0, 0);
export const TRAY_RADIUS = 3;
const BED_MIN = 0.55;
const BED_MAX = 2.8;
const ARM_SPEED = 0.36;

export interface TraySet {
  group: THREE.Group;
  /** Bed position (tray-local) of a point the camera lands on after the drum. */
  landing: THREE.Vector3;
  setGrid(grid: Grid): void;
  update(s: FilmState): void;
  dispose(): void;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _y = new THREE.Vector3(0, 1, 0);
const _x = new THREE.Vector3(1, 0, 0);
const _e = new THREE.Euler();

export function createTraySet(kit: Kit): TraySet {
  const group = new THREE.Group();
  group.name = "tray";
  group.position.copy(TRAY_ORIGIN);
  group.updateMatrixWorld(true);
  const m = kit.isMobile;

  /* Floor, wall, lip, hub, arms. */
  const perf = perforationTexture(m ? 512 : 1024, m ? 16 : 32);
  perf.repeat.set(m ? 5.5 : 2.9, m ? 5.5 : 2.9);
  perf.anisotropy = Math.min(8, kit.maxAnisotropy);
  const floorBase = new THREE.Color(0xffffff);
  const floorMat = new THREE.MeshStandardMaterial({
    color: floorBase.clone(),
    map: perf,
    bumpMap: perf,
    bumpScale: 3,
    metalness: 0.75,
    roughness: 0.46,
    envMap: kit.envMap,
    envMapIntensity: 0.32,
    // Transparent from the start (opacity 1) so the fade-out never swaps shader variants.
    transparent: true,
  });
  const floorGeo = new THREE.CircleGeometry(TRAY_RADIUS, m ? 64 : 112);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;

  const steel = steelMaterial(kit, 0.6, 0.28, 0.45);
  steel.transparent = true;
  const steelBase = steel.color.clone();
  const wallGeo = new THREE.CylinderGeometry(TRAY_RADIUS, TRAY_RADIUS, 0.5, m ? 64 : 112, 1, true);
  const wall = new THREE.Mesh(wallGeo, steel);
  wall.position.y = 0.25;
  wall.castShadow = true;
  wall.receiveShadow = true;
  const lipGeo = new THREE.TorusGeometry(TRAY_RADIUS, 0.06, 14, m ? 72 : 140);
  lipGeo.rotateX(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, steel);
  lip.position.y = 0.5;
  const hubGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.34, 0.4, 0.62, 40).translate(0, 0.31, 0),
    new THREE.CylinderGeometry(0.26, 0.34, 0.08, 40).translate(0, 0.66, 0),
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6).translate(0, 0.74, 0),
  ]);
  const hub = new THREE.Mesh(hubGeo, steel);
  hub.castShadow = true;

  const armParts: THREE.BufferGeometry[] = [];
  for (const side of [0, Math.PI]) {
    const bar = new THREE.BoxGeometry(2.62, 0.1, 0.16);
    bar.translate(1.62, 0.46, 0);
    bar.rotateY(side);
    armParts.push(bar);
    for (let k = 0; k < 5; k += 1) {
      const r = 0.72 + k * 0.48;
      const paddle = new THREE.BoxGeometry(0.06, 0.32, 0.42);
      paddle.rotateY(0.55);
      paddle.translate(r, 0.25, 0.06);
      paddle.rotateY(side);
      armParts.push(paddle);
      const strut = new THREE.BoxGeometry(0.05, 0.2, 0.05);
      strut.translate(r, 0.36, 0);
      strut.rotateY(side);
      armParts.push(strut);
    }
  }
  const armGeo = mergeGeometries(armParts);
  for (const g of armParts) g.dispose();
  const arms = new THREE.Mesh(armGeo, steel);
  arms.castShadow = true;
  group.add(floor, wall, lip, hub, arms);

  /* Roasted beans on the bed. */
  const n = m ? 190 : 480;
  const [r0, g0, b0] = roastColor(1);
  const beanMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(r0, g0, b0, THREE.SRGBColorSpace),
    roughness: 0.5,
    metalness: 0,
    bumpMap: kit.beanNoise,
    bumpScale: 1.2,
    envMap: kit.envMap,
    envMapIntensity: 0.42,
  });
  const beanBase = beanMat.color.clone();
  const beans = makeInstanced(kit.beanGeo, beanMat, n);
  beans.castShadow = true;
  varyColors(beans, n, 21, 0.16, 0.7);
  group.add(beans);

  const baseR = new Float32Array(n);
  const baseA = new Float32Array(n);
  const flip = new Float32Array(n);
  const tilt = new Float32Array(n * 2);
  const yaw0 = new Float32Array(n);
  const delta = new Float32Array(n);
  const lift = new Float32Array(n);
  const scale = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const f = (i + 0.5) / n;
    baseR[i] = Math.sqrt(BED_MIN * BED_MIN + (BED_MAX * BED_MAX - BED_MIN * BED_MIN) * f) + shash(i, 81) * 0.05;
    baseA[i] = i * 2.39996323 + shash(i, 82) * 0.08;
    flip[i] = hash(i, 83) > 0.45 ? 1 : -1;
    tilt[i * 2] = shash(i, 84) * 0.22;
    tilt[i * 2 + 1] = shash(i, 85) * 0.22;
    yaw0[i] = hash(i, 86) * TAU;
    delta[i] = 0.1 + hash(i, 87) * 0.2;
    lift[i] = hash(i, 88) > 0.86 ? 0.07 + hash(i, 89) * 0.05 : 0;
    scale[i] = (m ? 0.31 : 0.25) * (0.88 + hash(i, 90) * 0.24);
  }

  /* Contact shade on the floor (wall and hub), under the beans. */
  const shadeTex = trayShadeTexture();
  const shade = new SpriteBatch(1, shadeTex, { renderOrder: 2 });
  const shadeQ = new THREE.Quaternion().setFromAxisAngle(_x, -Math.PI / 2);
  group.add(shade.mesh);

  /* Smoke lifting off the bed. */
  const nSmoke = m ? 6 : 12;
  const smoke = new SpriteBatch(nSmoke, kit.smoke, { renderOrder: 30 });
  group.add(smoke.mesh);

  /* Grid hand-off. */
  let grid: Grid | null = null;
  const slotOfBean = new Int32Array(n).fill(-1);
  const landing = new THREE.Vector3(1.55, 0.05, -0.95);

  function setGrid(next: Grid) {
    grid = next;
    slotOfBean.fill(-1);
    const count = Math.min(next.count, n);
    // Pick beans evenly through the bed, then match them to slots by angle on screen.
    const picks: { i: number; a: number }[] = [];
    for (let j = 0; j < count; j += 1) {
      const i = Math.min(n - 1, Math.floor(((j + 0.5) * n) / count));
      const px = Math.cos(baseA[i]) * baseR[i];
      const pz = -Math.sin(baseA[i]) * baseR[i];
      const sx = px * next.right.x + pz * next.right.z;
      const sy = px * next.up.x + pz * next.up.z;
      picks.push({ i, a: Math.atan2(sy, sx) });
    }
    const slots: { j: number; a: number }[] = [];
    for (let j = 0; j < count; j += 1) {
      const sx = next.local[j * 3] * next.right.x + next.local[j * 3 + 2] * next.right.z;
      const sy = next.local[j * 3] * next.up.x + next.local[j * 3 + 2] * next.up.z;
      slots.push({ j, a: Math.atan2(sy, sx) });
    }
    picks.sort((a, b) => a.a - b.a);
    slots.sort((a, b) => a.a - b.a);
    for (let k = 0; k < count; k += 1) slotOfBean[picks[k].i] = slots[k].j;
  }

  function update(s: FilmState) {
    const b = s.b;
    const visible = b >= 4.5 && b < 7.05;
    group.visible = visible;
    if (!visible) return;
    const t = s.time;
    const u = b - 6;
    const fade = 1 - smooth(range(b, 6.22, 6.8));
    const arrive = smooth(range(b, 4.5, 4.62));

    floorMat.color.copy(floorBase).multiplyScalar(arrive);
    floorMat.envMapIntensity = 0.32 * arrive;
    floorMat.opacity = fade;
    steel.color.copy(steelBase).multiplyScalar(arrive);
    steel.envMapIntensity = 0.45 * arrive;
    steel.opacity = fade;
    const solid = fade > 0.004;
    floor.visible = solid;
    wall.visible = solid;
    lip.visible = solid;
    hub.visible = solid;
    arms.visible = solid;
    beanMat.color.copy(beanBase).multiplyScalar(mix(0.35, 1, arrive));

    const arm = ARM_SPEED * t;
    arms.rotation.y = arm;
    _p.set(0, 0.012, 0);
    shade.set(0, _p, shadeQ, 0, TRAY_RADIUS * 2, TRAY_RADIUS * 2, 1, 1, 1, 0.9 * fade * arrive);
    shade.commit();

    for (let i = 0; i < n; i += 1) {
      // Each pass of a paddle shoves the bean forward by delta and lets it settle.
      const a0 = baseA[i];
      const period = Math.PI + delta[i];
      const offset = Math.PI - (((a0 % Math.PI) + Math.PI) % Math.PI);
      const k = (arm + offset) / period;
      const pass = Math.floor(k);
      const w = smooth((k - pass) / 0.2);
      const a = a0 + delta[i] * (pass + w);
      const kick = bell(k - pass, 0.1, 0.12);
      const r = baseR[i] + kick * 0.06 * (hash(i, 91) - 0.3);
      let x = Math.cos(a) * r;
      let z = -Math.sin(a) * r;
      let y = 0.055 * (scale[i] / 0.235) + lift[i] + kick * 0.04;
      let sc = 1;

      const slot = slotOfBean[i];
      if (grid && u > 0) {
        if (slot >= 0 && slot < grid.count) {
          const v = morphProgress(slot, b);
          if (v > 0) {
            const sx = grid.local[slot * 3];
            const sz = grid.local[slot * 3 + 2];
            x = mix(x, sx, v);
            z = mix(z, sz, v);
            y = mix(y, grid.dotY + 0.05, v) + Math.sin(v * Math.PI) * 0.9;
            sc = mix(1, 0.55, smooth(v / 0.8)) * (1 - smooth(range(v, 0.82, 1)));
          }
        } else {
          sc = 1 - smooth(range(u, 0.06 + hash(i, 92) * 0.34, 0.3 + hash(i, 92) * 0.34));
        }
      }
      if (sc <= 0.001) {
        hideInstance(beans, i);
        continue;
      }
      // Orientation: lying flat (flat face up or down), a little tilt, yaw drifting with each shove.
      _e.set(tilt[i * 2], 0, tilt[i * 2 + 1]);
      _qt.setFromEuler(_e);
      _qy.setFromAxisAngle(_y, yaw0[i] + (pass + w) * delta[i] * 1.6);
      _q.setFromAxisAngle(_x, (flip[i] * Math.PI) / 2);
      _q.premultiply(_qt).premultiply(_qy);
      const sz = scale[i] * sc;
      _s.set(sz, sz, sz);
      _p.set(x, y, z);
      _m.compose(_p, _q, _s);
      beans.setMatrixAt(i, _m);
    }
    beans.instanceMatrix.needsUpdate = true;

    // Smoke (ambient): soft wisps rising toward the camera and thinning out.
    for (let i = 0; i < nSmoke; i += 1) {
      const period = 7 + hash(i, 101) * 5;
      const v = s.reduced ? 0.45 : fract(t / period + hash(i, 102));
      const ang = hash(i, 103) * TAU + v * 0.6;
      const rr = 0.7 + hash(i, 104) * 1.9;
      _p.set(Math.cos(ang) * rr + v * 0.5, 0.25 + v * 2.6, -Math.sin(ang) * rr - v * 0.3);
      const size = 1.1 + v * 2.2;
      const alpha = Math.pow(Math.sin(v * Math.PI), 1.4) * 0.09 * fade * arrive;
      smoke.set(i, _p, s.camera.quaternion, hash(i, 105) * TAU + v, size, size, 0.86, 0.8, 0.72, alpha);
    }
    smoke.commit();
  }

  return {
    group,
    landing,
    setGrid,
    update,
    dispose() {
      for (const g of [floorGeo, wallGeo, lipGeo, hubGeo, armGeo]) g.dispose();
      floorMat.dispose();
      steel.dispose();
      beanMat.dispose();
      beans.dispose();
      smoke.dispose();
      shade.dispose();
      shadeTex.dispose();
      perf.dispose();
    },
  };
}

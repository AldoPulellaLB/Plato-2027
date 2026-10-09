// Frame f05: one taste, everywhere. Identical white espresso cups seen from above,
// popping in across a grid (15 x 10 desktop, 4 x 6 mobile) from the centre out,
// one pulse when the grid is full, then the camera dives into the centre cup.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { FilmState, Kit } from "./kit";
import { hideInstance, makeInstanced } from "./kit";
import type { Shot } from "./rig";
import { halfExtents, shotQuaternion } from "./rig";
import { SpriteBatch } from "./sprites";
import { cremaTexture } from "./textures";
import { CUPS } from "./timeline";
import { bell, clamp, easeInOutCubic, easeOutBack, fract, hash, range, shash, smooth, TAU } from "./util";

/** Cup geometry constants (unit cup, scaled per layout). */
const CUP_RIM = 0.425;
const COFFEE_Y = 0.43;
const COFFEE_R = 0.352;
const MAX_CUPS = 150;

export interface Grid {
  cols: number;
  rows: number;
  count: number;
  spacing: number;
  cupScale: number;
  /** Slot positions, tray-local (x, y, z) * count. */
  local: Float32Array;
  /** Screen right / up as world-horizontal unit vectors for the grid shot. */
  right: THREE.Vector3;
  up: THREE.Vector3;
  centre: number;
  /** Pop start (0..1 frame progress) per slot. */
  start: Float32Array;
  floorY: number;
  dotY: number;
  yaw: number;
}

/** Bean-to-dot morph progress for slot j during the f04 -> f05 hand-over. */
export function morphProgress(slot: number, b: number) {
  const d = hash(slot, 121) * 0.24;
  return easeInOutCubic(range(b - 6, 0.08 + d, 0.6 + d));
}

export interface CupSet {
  group: THREE.Group;
  grid: Grid;
  layout(gridShot: Shot, aspect: number, isMobile: boolean): Grid;
  /** World position of the centre cup's coffee surface (the dive target). */
  diveTarget(out: THREE.Vector3): THREE.Vector3;
  update(s: FilmState): void;
  dispose(): void;
}

function cupGeometry(segments: number) {
  const pts = [
    [0, 0],
    [0.2, 0],
    [0.236, 0.012],
    [0.246, 0.04],
    [0.236, 0.062],
    [0.27, 0.1],
    [0.33, 0.18],
    [0.376, 0.28],
    [0.405, 0.38],
    [0.42, 0.47],
    [CUP_RIM, 0.505],
    [0.418, 0.524],
    [0.398, 0.522],
    [0.374, 0.498],
    [0.356, 0.42],
    [0.326, 0.32],
    [0.28, 0.23],
    [0.19, 0.166],
    [0, 0.15],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(pts, segments);
  const handle = new THREE.TorusGeometry(0.11, 0.03, 10, 24, Math.PI * 1.18);
  handle.rotateZ(-Math.PI * 0.59);
  handle.translate(0.47, 0.31, 0);
  const merged = mergeGeometries([body, handle]);
  body.dispose();
  handle.dispose();
  return merged;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _y = new THREE.Vector3(0, 1, 0);
const _qs = new THREE.Quaternion();

export function createCupSet(kit: Kit, origin: THREE.Vector3): CupSet {
  const group = new THREE.Group();
  group.name = "cups";
  group.position.copy(origin);
  group.updateMatrixWorld(true);
  const m = kit.isMobile;

  const cupGeo = cupGeometry(m ? 28 : 44);
  const cupMat = m
    ? new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(0.97, 0.96, 0.93, THREE.SRGBColorSpace),
        roughness: 0.24,
        metalness: 0,
        envMap: kit.envMap,
        envMapIntensity: 0.7,
      })
    : new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setRGB(0.97, 0.96, 0.93, THREE.SRGBColorSpace),
        roughness: 0.3,
        metalness: 0,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1,
        envMap: kit.envMap,
        envMapIntensity: 0.75,
      });
  const cups = makeInstanced(cupGeo, cupMat, MAX_CUPS);
  cups.castShadow = true;

  const crema = cremaTexture(m ? 256 : 512);
  crema.anisotropy = Math.min(4, kit.maxAnisotropy);
  const coffeeGeo = new THREE.CircleGeometry(COFFEE_R, 40);
  coffeeGeo.rotateX(-Math.PI / 2);
  coffeeGeo.translate(0, COFFEE_Y, 0);
  const coffeeMat = new THREE.MeshStandardMaterial({
    map: crema,
    roughness: 0.3,
    metalness: 0,
    envMap: kit.envMap,
    envMapIntensity: 0.22,
  });
  const coffee = makeInstanced(coffeeGeo, coffeeMat, MAX_CUPS);

  const dotGeo = new THREE.CircleGeometry(1, 24);
  dotGeo.rotateX(-Math.PI / 2);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.95, 0.93, 0.88, THREE.SRGBColorSpace), toneMapped: false });
  const dots = makeInstanced(dotGeo, dotMat, MAX_CUPS);

  // Instance colours drive the fade on the dark ground.
  for (let i = 0; i < MAX_CUPS; i += 1) {
    _c.setRGB(0, 0, 0);
    cups.setColorAt(i, _c);
    coffee.setColorAt(i, _c);
    dots.setColorAt(i, _c);
  }

  const floorGeo = new THREE.PlaneGeometry(1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.5, transparent: true });
  const shadowStrength = m ? 0.32 : 0.5;
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  floor.renderOrder = 1;

  const nSteam = m ? 4 : 9;
  const steam = new SpriteBatch(nSteam, kit.smoke, { renderOrder: 35 });
  group.add(floor, dots, cups, coffee, steam.mesh);

  const grid: Grid = {
    cols: 15,
    rows: 10,
    count: MAX_CUPS,
    spacing: 1,
    cupScale: 1,
    local: new Float32Array(MAX_CUPS * 3),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
    centre: 0,
    start: new Float32Array(MAX_CUPS),
    floorY: -0.25,
    dotY: -0.24,
    yaw: 0,
  };
  const coffeeYaw = new Float32Array(MAX_CUPS);
  for (let i = 0; i < MAX_CUPS; i += 1) coffeeYaw[i] = hash(i, 131) * TAU;

  function layout(gridShot: Shot, aspect: number, isMobile: boolean) {
    const cols = isMobile ? 4 : 15;
    const rows = isMobile ? 6 : 10;
    // Desktop: the grid owns the right of the frame (the headline and counter sit left).
    const { hw, hh } = halfExtents(gridShot.dist, aspect, gridShot.fov);
    const spacing = Math.min((2 * hw * (isMobile ? 0.86 : 0.6)) / cols, (2 * hh * (isMobile ? 0.46 : 0.8)) / rows);
    shotQuaternion(gridShot, _q);
    grid.right.set(1, 0, 0).applyQuaternion(_q).setY(0).normalize();
    grid.up.set(0, 1, 0).applyQuaternion(_q).setY(0).normalize();
    grid.cols = cols;
    grid.rows = rows;
    grid.count = cols * rows;
    grid.spacing = spacing;
    grid.cupScale = (spacing * 0.74) / (CUP_RIM * 2);
    grid.yaw = gridShot.yaw;
    grid.dotY = grid.floorY + 0.01;
    const cc = Math.floor((cols - 1) / 2);
    const rc = Math.floor((rows - 1) / 2);
    grid.centre = rc * cols + cc;
    const tx = gridShot.tx - origin.x;
    const tz = gridShot.tz - origin.z;
    const order: { j: number; d: number }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const j = r * cols + c;
        // Grid centred on the target; the dive later centres the middle cup itself.
        const x = (c - (cols - 1) / 2) * spacing;
        const y = ((rows - 1) / 2 - r) * spacing;
        grid.local[j * 3] = tx + grid.right.x * x + grid.up.x * y;
        grid.local[j * 3 + 1] = grid.floorY;
        grid.local[j * 3 + 2] = tz + grid.right.z * x + grid.up.z * y;
        const d = Math.hypot(c - cc, (r - rc) * 1.08) + (j === grid.centre ? -1 : hash(j, 132) * 0.9);
        order.push({ j, d });
      }
    }
    order.sort((a, b) => a.d - b.d);
    const n = grid.count;
    order.forEach(({ j }, rank) => {
      grid.start[j] = CUPS.fillStart + ((CUPS.fillEnd - CUPS.fillStart) * rank) / Math.max(1, n - 1);
    });
    const extent = Math.max(cols, rows) * spacing * 1.6 + 6;
    floor.scale.set(extent * 2, 1, extent * 2);
    floor.position.set(tx, grid.floorY, tz);
    cups.count = n;
    coffee.count = n;
    dots.count = n;
    return grid;
  }

  function diveTarget(out: THREE.Vector3) {
    const j = grid.centre;
    return out.set(
      origin.x + grid.local[j * 3],
      origin.y + grid.floorY + COFFEE_Y * grid.cupScale,
      origin.z + grid.local[j * 3 + 2],
    );
  }

  function update(s: FilmState) {
    const b = s.b;
    const visible = b >= 6;
    group.visible = visible;
    if (!visible) return;
    const p = clamp(b - 7);
    const n = grid.count;
    const cs = grid.cupScale;
    const pulse = bell(p, CUPS.pulseAt, CUPS.pulseWidth);
    floorMat.opacity = shadowStrength * smooth(range(b, 6.45, 7));
    _q.setFromAxisAngle(_y, grid.yaw - 0.62);

    for (let j = 0; j < n; j += 1) {
      const lx = grid.local[j * 3];
      const lz = grid.local[j * 3 + 2];
      const a = b < 7 ? 0 : clamp((p - grid.start[j]) / CUPS.pop);
      // Dot: arrives with its bean, hides once the cup lands on it.
      const v = morphProgress(j, b);
      const dotIn = smooth(range(v, 0.78, 1)) * (1 - smooth(range(a, 0.2, 0.6)));
      if (dotIn > 0.001) {
        const r = grid.spacing * 0.075 * (0.6 + 0.4 * dotIn);
        _p.set(lx, grid.dotY, lz);
        _s.set(r, 1, r);
        _m.compose(_p, _q, _s);
        dots.setMatrixAt(j, _m);
        _c.setRGB(dotIn * 0.8, dotIn * 0.8, dotIn * 0.8);
        dots.setColorAt(j, _c);
      } else {
        hideInstance(dots, j);
      }
      if (a <= 0) {
        hideInstance(cups, j);
        hideInstance(coffee, j);
        continue;
      }
      const sc = cs * easeOutBack(a, 1.7) * (1 + 0.075 * pulse);
      const lit = smooth(a * 1.5);
      _p.set(lx, grid.floorY + (1 - lit) * 0.15 * cs, lz);
      _s.set(sc, sc, sc);
      _m.compose(_p, _q, _s);
      cups.setMatrixAt(j, _m);
      _c.setRGB(lit, lit, lit);
      cups.setColorAt(j, _c);
      _qs.setFromAxisAngle(_y, coffeeYaw[j]);
      _m.compose(_p, _qs, _s);
      coffee.setMatrixAt(j, _m);
      const glint = 1 + pulse * 0.25;
      _c.setRGB(lit * glint, lit * glint, lit * glint);
      coffee.setColorAt(j, _c);
    }
    cups.instanceMatrix.needsUpdate = true;
    coffee.instanceMatrix.needsUpdate = true;
    dots.instanceMatrix.needsUpdate = true;
    if (cups.instanceColor) cups.instanceColor.needsUpdate = true;
    if (coffee.instanceColor) coffee.instanceColor.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;

    // Steam over the centre cup and a few neighbours (ambient).
    const steamOn = smooth(range(p, 0.12, 0.3)) * (1 - smooth(range(p, 0.93, 1)));
    for (let i = 0; i < nSteam; i += 1) {
      const j = i < 3 ? grid.centre : Math.floor(hash(i, 141) * n);
      const a = b < 7 ? 0 : clamp((p - grid.start[j]) / CUPS.pop);
      if (steamOn <= 0 || a <= 0) {
        steam.hide(i);
        continue;
      }
      const period = 5 + hash(i, 142) * 3;
      const v = s.reduced ? 0.4 : fract(s.time / period + hash(i, 143));
      const lx = grid.local[j * 3] + shash(i, 144) * 0.1 * cs + v * 0.2 * cs;
      const lz = grid.local[j * 3 + 2] + shash(i, 145) * 0.1 * cs;
      _p.set(lx, grid.floorY + (COFFEE_Y + 0.1 + v * 1.6) * cs, lz);
      const size = (0.45 + v * 1.1) * cs;
      const alpha = Math.pow(Math.sin(v * Math.PI), 1.5) * 0.12 * steamOn;
      steam.set(i, _p, s.camera.quaternion, hash(i, 146) * TAU + v * 0.8, size, size, 0.9, 0.87, 0.82, alpha);
    }
    steam.commit();
  }

  return {
    group,
    grid,
    layout,
    diveTarget,
    update,
    dispose() {
      for (const g of [cupGeo, coffeeGeo, dotGeo, floorGeo]) g.dispose();
      cupMat.dispose();
      coffeeMat.dispose();
      dotMat.dispose();
      floorMat.dispose();
      cups.dispose();
      coffee.dispose();
      dots.dispose();
      steam.dispose();
      crema.dispose();
    },
  };
}

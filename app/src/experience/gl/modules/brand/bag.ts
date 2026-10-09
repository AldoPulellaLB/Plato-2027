// Frame 12, take Platō home: the House Blend bag (the real cutout photo on a
// gently pillowed plane) stands on the stone floor in the left half of the
// viewport and rises at 0.9x scroll while roasted beans spill from its open
// top and roll out across the floor. Every bean follows a precomputed path
// (it tips up and over the lip, falls, bounces once, then rolls to a stop) that
// is a pure function of scroll, so scrolling back pours the beans back into
// the bag. Some beans tumble down the front of the bag, others drop behind it
// and roll out past its edges (real depth).
import * as THREE from "three";

import { roastColor } from "../../../story";
import type { FrameView, GLContext } from "../../engine";
import { createBeanGeometry, rand } from "../../lib/bean";
import { BRAND_FOV } from "./cups";
import { createInstancedShadowMaterial, createShadowDecal } from "./floor";
import type { FloorPool } from "./floor";
import { clamp, createRandom, damp, easeOutCubic, range, smooth } from "./math";
import type { BrandPalette } from "./palette";
import { floorZAt, rowX, solveRig, widthAt } from "./rig";
import type { Rig } from "./rig";

const BAG_SRC = "/assets/brand/house-blend-cutout.webp";
const BAG_W = 0.9;
const BAG_H = (BAG_W * 1581) / 900;
const PITCH = (10 * Math.PI) / 180;

const GRAVITY = 6.4;
const BOUNCE = 0.3;
const BOUNCE_KEEP = 0.62;
const ROLL_KEEP = 0.5;
const FRICTION = 1.2;
const BEAN_LENGTH = 0.08;
/** Half thickness of a bean at scale 1 (createBeanGeometry thickness 0.5). */
const BEAN_HALF = 0.25 * BEAN_LENGTH;
const SPIN_RADIUS = 0.026;
/** Seconds a bean takes to tip up and over the lip. */
const POP = 0.14;
/** Lip of the opening (local): just above the top edge, in front of or behind the panel. */
const LIP_Y = BAG_H + 0.028;
const LIP_FRONT = 0.05;
const LIP_BACK = -0.07;

/** Progress window (f12) in which the spill plays. */
const SPILL_FROM = 0.26;
const SPILL_TO = 0.6;
/** Parallax speed of the bag against the page. */
const RISE = 0.9;

type Kind = "front" | "back";

interface BeanPath {
  kind: Kind;
  inner: THREE.Vector3;
  emit: THREE.Vector3;
  dir: THREE.Vector2;
  vy: number;
  v1: number;
  t1: number;
  h1: number;
  vyb: number;
  tb: number;
  h2: number;
  v3: number;
  tr: number;
  total: number;
  rest: number;
  start: number;
  end: number;
  scale: number;
  qRest: THREE.Quaternion;
  rollAxis: THREE.Vector3;
  tumbleAxis: THREE.Vector3;
  tumble: number;
  phase: number;
}

export interface HomeBag {
  group: THREE.Group;
  layout(ctx: GLContext): void;
  /** referenceTop: section top (viewport heights) at which the bag sits on its anchor (section centred). */
  update(ctx: GLContext, view: FrameView, camera: THREE.PerspectiveCamera, floor: FloorPool, referenceTop: number): void;
  dispose(): void;
}

/** Bulge of the pillowed bag front at local (x, y) (y from 0 at the base). */
function bulgeAt(x: number, y: number) {
  const xn = clamp((2 * x) / BAG_W, -1, 1);
  const yn = clamp(y / BAG_H, 0, 1);
  const env = smooth(range(yn, 0, 0.16)) * (1 - smooth(range(yn, 0.78, 0.97)));
  return 0.052 * BAG_W * Math.pow(1 - xn * xn, 0.7) * env;
}

/** Solve the flight for a bean leaving `emit` that must come to rest `total` away. */
function solveFlight(p: BeanPath) {
  const drop = p.emit.y - p.rest;
  p.t1 = (p.vy + Math.sqrt(p.vy * p.vy + 2 * GRAVITY * drop)) / GRAVITY;
  p.vyb = BOUNCE * (GRAVITY * p.t1 - p.vy);
  p.tb = (2 * p.vyb) / GRAVITY;
  // total = v1 t1 + k1 v1 tb + (k2 v1)^2 / (2 friction)
  const A = (ROLL_KEEP * ROLL_KEEP) / (2 * FRICTION);
  const B = p.t1 + BOUNCE_KEEP * p.tb;
  p.v1 = (-B + Math.sqrt(B * B + 4 * A * p.total)) / (2 * A);
  p.v3 = ROLL_KEEP * p.v1;
  p.tr = p.v3 / FRICTION;
  p.h1 = p.v1 * p.t1;
  p.h2 = p.h1 + BOUNCE_KEEP * p.v1 * p.tb;
  p.end = p.start + POP + p.t1 + p.tb + p.tr;
}

/** World position of a bean at time tau (seconds since it started). Returns the distance rolled so far. */
function beanAt(p: BeanPath, tau: number, out: THREE.Vector3) {
  if (tau <= 0) {
    out.copy(p.inner);
    return 0;
  }
  if (tau < POP) {
    // Tip up out of the bag (fast rise), then over the lip (late push).
    const k = tau / POP;
    const up = easeOutCubic(k);
    const over = k * k;
    out.set(
      p.inner.x + (p.emit.x - p.inner.x) * over,
      p.inner.y + (p.emit.y - p.inner.y) * up,
      p.inner.z + (p.emit.z - p.inner.z) * over,
    );
    return 0;
  }
  const t = tau - POP;
  let h: number;
  let y = p.rest;
  if (t < p.t1) {
    h = p.v1 * t;
    y = p.emit.y + p.vy * t - 0.5 * GRAVITY * t * t;
  } else if (t < p.t1 + p.tb) {
    const tt = t - p.t1;
    h = p.h1 + BOUNCE_KEEP * p.v1 * tt;
    y = p.rest + p.vyb * tt - 0.5 * GRAVITY * tt * tt;
  } else if (t < p.t1 + p.tb + p.tr) {
    const tt = t - p.t1 - p.tb;
    h = p.h2 + p.v3 * tt - 0.5 * FRICTION * tt * tt;
  } else {
    h = p.total;
  }
  out.set(p.emit.x + p.dir.x * h, Math.max(p.rest, y), p.emit.z + p.dir.y * h);
  return h;
}

export async function createHomeBag(ctx: GLContext, palette: BrandPalette, blob: THREE.Texture): Promise<HomeBag> {
  const group = new THREE.Group();
  group.name = "house-blend";
  const disposables: { dispose(): void }[] = [];

  /* ---------------------------------------------------------------- */
  /* The bag                                                           */

  const map = await new THREE.TextureLoader().loadAsync(BAG_SRC);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy());
  disposables.push(map);

  const bagGeometry = new THREE.PlaneGeometry(BAG_W, BAG_H, 24, 40);
  {
    const pos = bagGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i) + BAG_H / 2;
      pos.setXYZ(i, x, y, bulgeAt(x, y));
    }
    bagGeometry.computeVertexNormals();
  }
  // The photo carries its own studio light, so most of it is shown as is
  // (emissive); a little real lighting on the pillowed surface gives it form.
  const bagMaterial = new THREE.MeshStandardMaterial({
    map,
    color: new THREE.Color(0.42, 0.42, 0.42),
    emissive: new THREE.Color(1, 1, 1),
    emissiveMap: map,
    emissiveIntensity: 0.74,
    roughness: 0.55,
    metalness: 0,
    envMapIntensity: 0.25,
    alphaTest: 0.04,
    alphaToCoverage: true,
    toneMapped: false,
  });
  const bag = new THREE.Mesh(bagGeometry, bagMaterial);
  const bagRoot = new THREE.Group();
  bagRoot.add(bag);
  group.add(bagRoot);
  disposables.push(bagGeometry, bagMaterial);

  const bagContact = createShadowDecal(blob, palette.ink, -6);
  const bagCore = createShadowDecal(blob, palette.ink, -6);
  const bagCast = createShadowDecal(blob, palette.ink, -7);
  group.add(bagContact, bagCore, bagCast);
  disposables.push(bagContact.geometry, bagContact.material, bagCore.geometry, bagCore.material, bagCast.geometry, bagCast.material);

  /* ---------------------------------------------------------------- */
  /* The beans                                                         */

  const count = ctx.isMobile ? 48 : 96;
  const beanGeometry = createBeanGeometry({ segments: ctx.isMobile ? 16 : 24 });
  const beanMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0, envMapIntensity: 0.75 });
  const beans = new THREE.InstancedMesh(beanGeometry, beanMaterial, count);
  beans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beans.frustumCulled = false;
  const colour = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const [r, g, b] = roastColor(0.85 + rand(i * 7 + 3) * 0.1);
    const shade = 0.74 + rand(i * 13 + 1) * 0.22;
    colour.setRGB(r * shade, g * shade, b * shade, THREE.SRGBColorSpace);
    beans.setColorAt(i, colour);
  }
  group.add(beans);
  disposables.push(beanGeometry, beanMaterial);

  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadowMaterial = createInstancedShadowMaterial(blob, palette.ink);
  const shadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, count);
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shadows.frustumCulled = false;
  shadows.renderOrder = -5;
  const alpha = new THREE.Color();
  for (let i = 0; i < count; i += 1) shadows.setColorAt(i, alpha.setRGB(0, 0, 0));
  group.add(shadows);
  disposables.push(shadowGeometry, shadowMaterial);

  /* ---------------------------------------------------------------- */
  /* Layout: rig + spill plan (both depend on the viewport)            */

  let rig: Rig = solveRig(BRAND_FOV, PITCH, 6, -0.5, 1.6);
  let anchor = { x: 0.3, y: 0.46 };
  let paths: BeanPath[] = [];
  let simTotal = 1;
  let floorFront = 1.6;
  let pEff = 0;
  let lastSeen = -1;

  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const tmpM = new THREE.Matrix4();
  const tmpS = new THREE.Vector3();
  const bagInverse = new THREE.Matrix4();
  const bagCentre = new THREE.Vector3(0, BAG_H * 0.5, 0);
  const beanPos = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);

  /** NDC of a world point from the reference camera (camera at x = 0, pitched down). */
  const project = (p: THREE.Vector3) => {
    const c = Math.cos(rig.pitch);
    const s = Math.sin(rig.pitch);
    const ry = p.y - rig.height;
    const rz = p.z - rig.distance;
    const cy = ry * c - rz * s;
    const depth = -(ry * s + rz * c);
    return { x: p.x / (depth * rig.t * rig.aspect), y: cy / (depth * rig.t) };
  };

  /** Floor point seen at NDC (nx, ny) from the reference camera. */
  const floorPoint = (nx: number, ny: number) => {
    const z = floorZAt(rig, ny);
    if (z === null) return null;
    const dy = ny * rig.t * Math.cos(rig.pitch) - Math.sin(rig.pitch);
    const lambda = rig.height / -dy;
    return { x: lambda * nx * rig.t * rig.aspect, z };
  };

  /** True when the bean never cuts through the bag panel on its way down. */
  const clearsBag = (p: BeanPath) => {
    const steps = 30;
    const r = BEAN_HALF * p.scale * 1.9;
    for (let i = 0; i <= steps; i += 1) {
      beanAt(p, POP + (p.t1 * i) / steps, probe);
      probe.applyMatrix4(bagInverse);
      if (Math.abs(probe.x) > BAG_W / 2 + r || probe.y > BAG_H + r || probe.y < 0) continue;
      const front = bulgeAt(probe.x, probe.y);
      if (probe.z > -r && probe.z < front + r) return false;
    }
    return true;
  };

  const plan = (mobile: boolean, baseY: number) => {
    const random = createRandom(mobile ? 1207 : 1912);
    // Where beans may come to rest on screen (viewport fractions at the reference scroll);
    // baseY is the bag's foot.
    const region = mobile
      ? { x0: 0.06, x1: 0.94, front0: baseY + 0.005, front1: baseY + 0.1, back0: baseY - 0.05, back1: baseY - 0.005 }
      : { x0: 0.04, x1: 0.47, front0: baseY + 0.005, front1: baseY + 0.2, back0: baseY - 0.08, back1: baseY - 0.005 };
    bagRoot.updateMatrixWorld(true);
    bagInverse.copy(bagRoot.matrixWorld).invert();
    const yaw = bagRoot.rotation.y;
    const base = new THREE.Vector3().applyMatrix4(bagRoot.matrixWorld);
    const toWorld = (lx: number, lz: number) => ({
      x: base.x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
      z: base.z - Math.sin(yaw) * lx + Math.cos(yaw) * lz,
    });
    const next: BeanPath[] = [];

    const sampleRest = (kind: Kind, half: number) => {
      // theta: 0 is straight toward the camera, positive swings to the bag's left.
      const theta = kind === "front" ? -0.55 + random() * 1.75 : 1.75 + random() * 1.65;
      const d = (kind === "front" ? 0.16 : 0.1) + (kind === "front" ? 0.95 : 0.7) * Math.pow(random(), 2.1);
      const rest = toWorld(-Math.sin(theta) * d, Math.cos(theta) * d + (kind === "front" ? 0.07 : -0.06));
      const ndc = project(tmpV.set(rest.x, half, rest.z));
      const sx = (ndc.x + 1) / 2;
      const sy = (1 - ndc.y) / 2;
      const y0 = kind === "front" ? region.front0 : region.back0;
      const y1 = kind === "front" ? region.front1 : region.back1;
      const inside = sx > region.x0 && sx < region.x1 && sy > y0 && sy < y1;
      return { theta, rest, inside };
    };

    const buildPath = (kind: Kind, theta: number, rest: { x: number; z: number }, scale: number, vy: number, lane: number) => {
      // Tip up over the front or the back lip. Most of the spill goes over the
      // left shoulder, away from the copy.
      const lean = -Math.sin(theta);
      const ex = clamp((-0.16 + lean * 0.16 + (lane - 0.5) * 0.36) * BAG_W, -0.42 * BAG_W, 0.24 * BAG_W);
      const inner = new THREE.Vector3(ex * 0.9, BAG_H - 0.07, -0.03).applyMatrix4(bagRoot.matrixWorld);
      const emit = new THREE.Vector3(ex, LIP_Y + lane * 0.02, kind === "front" ? LIP_FRONT : LIP_BACK).applyMatrix4(
        bagRoot.matrixWorld,
      );
      const dx = rest.x - emit.x;
      const dz = rest.z - emit.z;
      const total = Math.max(0.04, Math.hypot(dx, dz));
      const path: BeanPath = {
        kind,
        inner,
        emit,
        dir: new THREE.Vector2(dx / total, dz / total),
        vy,
        v1: 0,
        t1: 0,
        h1: 0,
        vyb: 0,
        tb: 0,
        h2: 0,
        v3: 0,
        tr: 0,
        total,
        rest: BEAN_HALF * scale,
        start: 0,
        end: 0,
        scale,
        qRest: new THREE.Quaternion(),
        rollAxis: new THREE.Vector3(dz / total, 0, -dx / total).normalize(),
        tumbleAxis: new THREE.Vector3(),
        tumble: 0,
        phase: 0,
      };
      solveFlight(path);
      return path;
    };

    for (let i = 0; i < count; i += 1) {
      const scale = 0.86 + random() * 0.3;
      const half = BEAN_HALF * scale;
      const vy = 0.12 + random() * 0.42;
      const lane = random();
      let kind: Kind = random() < 0.66 ? "front" : "back";

      // Rest spot (a dense pile at the foot of the bag thinning out into strays)
      // that sits inside the screen region and whose fall clears the bag.
      let path: BeanPath | null = null;
      for (let attempt = 0; attempt < 48 && !path; attempt += 1) {
        if (attempt === 32) kind = "back";
        const sample = sampleRest(kind, half);
        if (!sample.inside) continue;
        const candidate = buildPath(kind, sample.theta, sample.rest, scale, vy, lane);
        if (clearsBag(candidate)) path = candidate;
      }
      if (!path) path = buildPath("back", Math.PI, toWorld(0, -0.28), scale, vy, lane);

      path.start = 1.15 * Math.pow(random(), 1.5);
      path.end = path.start + POP + path.t1 + path.tb + path.tr;
      path.tumbleAxis.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
      path.tumble = 4 + random() * 7;
      path.phase = random() * Math.PI * 2;

      // Rest pose: crease up or down, any heading.
      const creaseUp = random() < 0.58;
      tmpQ.setFromAxisAngle(xAxis, creaseUp ? -Math.PI / 2 : Math.PI / 2);
      tmpQ2.setFromAxisAngle(yAxis, random() * Math.PI * 2);
      path.qRest.copy(tmpQ2).multiply(tmpQ);
      next.push(path);
    }
    paths = next;
    simTotal = Math.max(...paths.map((p) => p.end));
  };

  const layout: HomeBag["layout"] = (c) => {
    const mobile = c.width < 768;
    const aspect = c.width / Math.max(1, c.height);
    const t = Math.tan(((BRAND_FOV / 2) * Math.PI) / 180);
    const heightFrac = mobile ? 0.4 : 0.62;
    anchor = mobile ? { x: 0.5, y: 0.29 } : { x: 0.3, y: 0.46 };
    // Keep the bag inside the left half on narrow desktops.
    const widthFrac = ((BAG_W / BAG_H) * heightFrac) / aspect;
    const fit = mobile ? 1 : Math.min(1, 0.34 / Math.max(0.01, widthFrac));
    const distance = BAG_H / (2 * t * heightFrac * fit);
    const baseY = anchor.y + (heightFrac * fit) / 2;
    rig = solveRig(BRAND_FOV, PITCH, distance, 1 - 2 * baseY, aspect);
    const bx = rowX(rig, 2 * anchor.x - 1);
    bagRoot.position.set(bx, 0, 0);
    bagRoot.rotation.set(-0.03, Math.atan2(-bx, rig.distance) + (mobile ? 0.08 : 0.2), 0, "YXZ");
    const nearZ = floorZAt(rig, -1) ?? 2;
    floorFront = Math.max(0.9, (nearZ + 0.1) * 1.05);
    plan(mobile, baseY);

    // Static shadows: a dark core right under the gusset, a soft contact pool,
    // and a long faint cast falling back and to the right.
    const yaw = bagRoot.rotation.y;
    bagCore.position.set(bx - Math.sin(yaw) * 0.02, 0.0025, -Math.cos(yaw) * 0.02);
    bagCore.rotation.y = yaw;
    bagCore.scale.set(BAG_W * 1.08, 1, 0.16);
    bagCore.material.opacity = 0.5;
    bagContact.position.set(bx - Math.sin(yaw) * 0.05, 0.002, -Math.cos(yaw) * 0.05);
    bagContact.rotation.y = yaw;
    bagContact.scale.set(BAG_W * 1.55, 1, 0.62);
    bagContact.material.opacity = 0.32;
    const castDir = new THREE.Vector2(0.62, -0.78).normalize();
    const castLen = BAG_H * 1.2;
    bagCast.position.set(bx + castDir.x * castLen * 0.42, 0.001, castDir.y * castLen * 0.42);
    bagCast.rotation.y = Math.atan2(castDir.x, castDir.y);
    bagCast.scale.set(BAG_W * 1.3, 1, castLen);
    bagCast.material.opacity = 0.14;
  };

  const update: HomeBag["update"] = (c, view, camera, floor, referenceTop) => {
    const reduced = c.reduced;
    const now = c.time;
    if (reduced || lastSeen < 0 || now - lastSeen > 0.35) pEff = view.progress;
    else pEff = damp(pEff, view.progress, 7, c.delta);
    lastSeen = now;

    // Camera: crane down a little as the page scrolls (foreground beans travel
    // faster than the bag: roughly 1.3x against its 0.9x), a slow scroll orbit
    // for depth and a touch of pointer parallax.
    const rel = view.top - referenceTop;
    const crane = reduced ? 0 : clamp(rel, -1.2, 1.2) * 0.22;
    const orbit = reduced ? 0 : clamp(rel, -1.2, 1.2) * -0.045 + c.pointer.x * 0.022;
    const bx = bagRoot.position.x;
    camera.position.set(
      bx - bx * Math.cos(orbit) + Math.sin(orbit) * rig.distance,
      rig.height + crane,
      Math.cos(orbit) * rig.distance + Math.sin(orbit) * bx,
    );
    camera.rotation.set(-(rig.pitch + (reduced ? 0 : c.pointer.y * 0.006)), orbit, 0, "YXZ");
    camera.clearViewOffset();
    camera.updateMatrixWorld();

    // Put the bag centre on its 0.9x parallax path (1x, a still, under reduced motion).
    const factor = reduced ? 1 : RISE;
    const targetX = anchor.x * c.width;
    const targetY = (anchor.y + rel * factor) * c.height;
    tmpV.copy(bagCentre).applyMatrix4(bagRoot.matrixWorld).project(camera);
    const px = ((tmpV.x + 1) / 2) * c.width;
    const py = ((1 - tmpV.y) / 2) * c.height;
    camera.setViewOffset(c.width, c.height, px - targetX, py - targetY, c.width, c.height);
    camera.updateMatrixWorld();

    floor.set({ x: bx - 0.15, z: 0.1 }, { x: Math.max(2.1, widthAt(rig, rig.distance) * 0.5), front: floorFront, back: 2.6 });

    // Beans.
    const spill = reduced ? 1 : range(pEff, SPILL_FROM, SPILL_TO);
    const sim = spill * simTotal;
    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];
      const tau = sim - path.start;
      const pos = beanPos;
      const h = beanAt(path, tau, pos);
      const emerge = smooth(range(tau, 0, POP * 0.8));
      const air = smooth(range(pos.y - path.rest, 0, 0.06));

      // Orientation: roll with the distance still to go, tumble while airborne,
      // and drift gently if the scroll stops with the bean in mid-air.
      const remaining = path.total - h;
      const airLeft = Math.max(0, POP + path.t1 + path.tb - Math.max(0, tau));
      const drift = reduced ? 0 : Math.sin(now * 1.3 + path.phase) * 0.22 * air;
      tmpQ.setFromAxisAngle(path.rollAxis, -remaining / SPIN_RADIUS);
      tmpQ2.setFromAxisAngle(path.tumbleAxis, -airLeft * path.tumble + drift);
      tmpQ.multiply(tmpQ2).multiply(path.qRest);
      const sc = tau <= 0 ? 0 : path.scale * BEAN_LENGTH * (0.4 + 0.6 * emerge);
      tmpS.set(sc, sc, sc);
      if (!reduced && air > 0) pos.y += Math.sin(now * 1.1 + path.phase) * 0.005 * air;
      tmpM.compose(pos, tmpQ, tmpS);
      beans.setMatrixAt(i, tmpM);

      // Shadow under the bean: wider and fainter the higher it is.
      const lift = Math.max(0, pos.y - path.rest);
      const size = BEAN_LENGTH * path.scale * (1.45 + lift * 2.2);
      tmpQ.identity();
      tmpS.set(size, 1, size * 0.8);
      tmpV.set(pos.x + 0.37 * lift, 0.003, pos.z - 0.47 * lift);
      tmpM.compose(tmpV, tmpQ, tmpS);
      shadows.setMatrixAt(i, tmpM);
      const a = tau <= POP ? 0 : 0.6 * Math.pow(1 - Math.min(1, lift / 0.7), 2);
      shadows.setColorAt(i, alpha.setRGB(a, 0, 0));
    }
    beans.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
    if (shadows.instanceColor) shadows.instanceColor.needsUpdate = true;
  };

  return {
    group,
    layout,
    update,
    dispose() {
      for (const d of disposables) d.dispose();
      beans.dispose();
      shadows.dispose();
      group.clear();
    },
  };
}

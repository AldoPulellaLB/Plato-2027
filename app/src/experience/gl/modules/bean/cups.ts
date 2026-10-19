// Frame f05: one taste, everywhere. Coffee cups seen from above (the client's
// top-view photographs: black, crema, latte, flat white, cappuccino), popping in
// across a grid (15 x 10 desktop, 4 x 6 mobile) from the centre out, one pulse
// when the grid is full, then the camera dives into the centre cup (Focus.png,
// the black coffee), which softens as it fills the screen.
import * as THREE from "three";

import type { FilmState, Kit } from "./kit";
import { hideInstance, makeInstanced } from "./kit";
import type { Shot } from "./rig";
import { halfExtents, shotQuaternion } from "./rig";
import { SpriteBatch } from "./sprites";
import { CUPS } from "./timeline";
import { bell, clamp, easeInOutCubic, easeOutBack, fract, hash, range, shash, smooth, TAU } from "./util";

/** Cup geometry constants (unit cup, scaled per layout). */
const CUP_RIM = 0.425;
const COFFEE_Y = 0.43;
const MAX_CUPS = 150;
/** The photographed cup's radius (unit cup): a little wider than the old modelled rim, for a fuller grid. */
const DISC_R = CUP_RIM * 1.1;
/** Each texture's half-size in cup radii: the photographs carry a transparent border (prep MARGIN 0.08). */
const TEX_HALF = 1.08;
/** The disc's radius in cup radii: past the photo's soft edge, inside the border, so the clamped texture edge never shows. */
const DISC_EDGE = 1.07;
/** How far the centre cup softens (0..1 towards its blurred copy) as the dive fills the screen. */
const DIVE_BLUR = 0.75;

/** The cup photographs (public/assets/cups, cropped square to the cup), and how often each appears. */
const CUP_TYPES = [
  { src: "/assets/cups/cup-black.webp", weight: 0.34 },
  { src: "/assets/cups/cup-crema.webp", weight: 0.2 },
  { src: "/assets/cups/cup-latte.webp", weight: 0.22 },
  { src: "/assets/cups/cup-flatwhite.webp", weight: 0.12 },
  { src: "/assets/cups/cup-cappuccino.webp", weight: 0.12 },
] as const;
/** The focus cup (the dive target) is the black coffee; this is its blurred copy. */
const FOCUS_TYPE = 0;
const FOCUS_BLUR_SRC = "/assets/cups/cup-black-blur.webp";

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
  /** Upload the cup photographs as they arrive, so f05 never stalls on a texture upload. */
  warm(renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

/** A flat disc at the coffee height carrying the photograph, a little wider than the cup so its soft edge sits inside. */
function discGeometry(segments: number) {
  const geo = new THREE.CircleGeometry(DISC_R * DISC_EDGE, segments);
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  const span = 2 * DISC_R * TEX_HALF;
  for (let i = 0; i < pos.count; i += 1) {
    uv.setXY(i, 0.5 + pos.getX(i) / span, 0.5 + pos.getY(i) / span);
  }
  uv.needsUpdate = true;
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, COFFEE_Y, 0);
  return geo;
}

/** The photographs carry their own light: unlit and true to the file (no tone mapping). */
function photoMaterial(map: THREE.Texture) {
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _y = new THREE.Vector3(0, 1, 0);
const _qPhoto = new THREE.Quaternion();

export function createCupSet(kit: Kit, origin: THREE.Vector3): CupSet {
  const group = new THREE.Group();
  group.name = "cups";
  group.position.copy(origin);
  group.updateMatrixWorld(true);
  const m = kit.isMobile;

  // Loads in the background; the cups only show from f05, long after.
  // Straight alpha: the files carry the edge colour out into their transparent border,
  // so filtering and mipmaps never pull black into the soft edge.
  const loader = new THREE.TextureLoader();
  const loaded = new Set<THREE.Texture>();
  let warmer: THREE.WebGLRenderer | null = null;
  const loadTexture = (src: string) => {
    const tex = loader.load(src, (t) => {
      loaded.add(t);
      warmer?.initTexture(t);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, kit.maxAnisotropy);
    return tex;
  };
  const textures = CUP_TYPES.map((type) => loadTexture(type.src));
  const blurTexture = loadTexture(FOCUS_BLUR_SRC);
  /** A photograph still loading (or failed): its slots keep their dot instead of landing an empty cup. */
  const typeReady = (t: number) => loaded.has(textures[t]);

  const discGeo = discGeometry(m ? 40 : 64);
  const materials = textures.map(photoMaterial);
  const cups = materials.map((material) => {
    const mesh = makeInstanced(discGeo, material, MAX_CUPS);
    for (let i = 0; i < MAX_CUPS; i += 1) mesh.setColorAt(i, _c.setRGB(0, 0, 0));
    return mesh;
  });

  // The centre cup on its own: one layer that crossfades from the photograph to its
  // blurred copy in the shader, so the rim softens without a second, sharper edge.
  const focusUniforms = { uBlurMap: { value: blurTexture }, uBlur: { value: 0 } };
  const focusMat = photoMaterial(textures[FOCUS_TYPE]);
  focusMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, focusUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform sampler2D uBlurMap;\nuniform float uBlur;\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        "diffuseColor *= mix( texture2D( map, vMapUv ), texture2D( uBlurMap, vMapUv ), uBlur );",
      );
  };
  focusMat.customProgramCacheKey = () => "plato-focus-cup";
  const focus = new THREE.Mesh(discGeo, focusMat);
  focus.matrixAutoUpdate = false;
  focus.frustumCulled = false;
  focus.matrix.makeScale(0, 0, 0);

  const dotGeo = new THREE.CircleGeometry(1, 24);
  dotGeo.rotateX(-Math.PI / 2);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.95, 0.93, 0.88, THREE.SRGBColorSpace), toneMapped: false });
  const dots = makeInstanced(dotGeo, dotMat, MAX_CUPS);
  for (let i = 0; i < MAX_CUPS; i += 1) dots.setColorAt(i, _c.setRGB(0, 0, 0));

  const floorGeo = new THREE.PlaneGeometry(1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.5, transparent: true });
  const shadowStrength = m ? 0.32 : 0.5;
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  floor.renderOrder = 1;

  const nSteam = m ? 4 : 9;
  const steam = new SpriteBatch(nSteam, kit.smoke, { renderOrder: 35 });
  group.add(floor, dots, ...cups, focus, steam.mesh);

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
  /** Which photograph batch each slot is drawn in (the centre cup is drawn on its own). */
  const slotType = new Uint8Array(MAX_CUPS);
  const OWN_MESH = 255;
  /** Turn that lays every photograph upright on screen at the grid shot. */
  let photoYaw = 0;
  /** Each slot's own fixed turn on top, so the repeated photographs never line up the same way. */
  const slotYaw = new Float32Array(MAX_CUPS);
  for (let i = 0; i < MAX_CUPS; i += 1) slotYaw[i] = hash(i, 152) * TAU;

  function pickType(j: number) {
    const total = CUP_TYPES.reduce((sum, type) => sum + type.weight, 0);
    let r = hash(j, 151) * total;
    for (let t = 0; t < CUP_TYPES.length; t += 1) {
      r -= CUP_TYPES[t].weight;
      if (r <= 0) return t;
    }
    return 0;
  }

  function layout(gridShot: Shot, aspect: number, isMobile: boolean) {
    const cols = isMobile ? 4 : 15;
    const rows = isMobile ? 6 : 10;
    // Desktop: the grid owns the right of the frame (the headline and counter sit left).
    const { hw, hh } = halfExtents(gridShot.dist, aspect, gridShot.fov);
    const spacing = Math.min((2 * hw * (isMobile ? 0.86 : 0.6)) / cols, (2 * hh * (isMobile ? 0.46 : 0.8)) / rows);
    shotQuaternion(gridShot, _q);
    grid.right.set(1, 0, 0).applyQuaternion(_q).setY(0).normalize();
    grid.up.set(0, 1, 0).applyQuaternion(_q).setY(0).normalize();
    // The disc's texture "up" is world -Z; turn it onto the screen's up.
    photoYaw = Math.atan2(-grid.up.x, -grid.up.z);
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
    for (let j = 0; j < n; j += 1) slotType[j] = j === grid.centre ? OWN_MESH : pickType(j);
    // Each slot lives in its own photograph's batch; every other batch keeps it hidden.
    for (const mesh of cups) {
      for (let j = 0; j < MAX_CUPS; j += 1) hideInstance(mesh, j);
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    }
    const extent = Math.max(cols, rows) * spacing * 1.6 + 6;
    floor.scale.set(extent * 2, 1, extent * 2);
    floor.position.set(tx, grid.floorY, tz);
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
      const own = slotType[j] === OWN_MESH;
      // The focus cup also needs its blurred copy, which the dive fades into.
      const ready = own ? typeReady(FOCUS_TYPE) && loaded.has(blurTexture) : typeReady(slotType[j]);
      const a = b < 7 || !ready ? 0 : clamp((p - grid.start[j]) / CUPS.pop);
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
      const mesh = own ? null : cups[slotType[j]];
      if (a <= 0) {
        if (mesh) hideInstance(mesh, j);
        else focus.visible = false;
        continue;
      }
      // Same pop as ever: overshoot in, rise into place, brighten from the dark ground.
      const sc = cs * easeOutBack(a, 1.7) * (1 + 0.075 * pulse);
      const lit = smooth(a * 1.5);
      _p.set(lx, grid.floorY + (1 - lit) * 0.15 * cs, lz);
      _s.set(sc, sc, sc);
      _qPhoto.setFromAxisAngle(_y, photoYaw + slotYaw[j]);
      _m.compose(_p, _qPhoto, _s);
      // A gentle lift on the pulse: the photos are untone-mapped, so more would flatten the white porcelain.
      const glint = lit * (1 + pulse * 0.04);
      if (mesh) {
        mesh.setMatrixAt(j, _m);
        mesh.setColorAt(j, _c.setRGB(glint, glint, glint));
      } else {
        focus.matrix.copy(_m);
        focus.matrixWorldNeedsUpdate = true;
        focusMat.color.setRGB(glint, glint, glint);
        focus.visible = true;
      }
    }
    for (const mesh of cups) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;

    // The dive: the centre cup softens as it fills the screen (the camera eases in on pow 1.45).
    const dive = clamp((p - CUPS.diveStart) / (1 - CUPS.diveStart));
    focusUniforms.uBlur.value = DIVE_BLUR * smooth(range(dive, 0.2, 0.85));

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
    warm(renderer: THREE.WebGLRenderer) {
      warmer = renderer;
      for (const t of loaded) renderer.initTexture(t);
    },
    dispose() {
      warmer = null;
      for (const g of [discGeo, dotGeo, floorGeo]) g.dispose();
      for (const material of [...materials, focusMat, dotMat, floorMat]) material.dispose();
      for (const t of [...textures, blurTexture]) t.dispose();
      for (const mesh of cups) mesh.dispose();
      dots.dispose();
      steam.dispose();
    },
  };
}

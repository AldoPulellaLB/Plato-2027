// Frame 10, the cup family: Small (Aristotle, sage), Medium (Platō, peach) and
// Large (Socrates, green) takeaway cups drop one by one onto a stone floor
// (80ms apart, one small bounce: the only bounce on the site), then turn to
// face the viewer as the frame scrolls, and slide away left on exit.
//
// Positions are solved from the viewport each resize so the cup centres sit
// on the DOM size labels (x = 30/50/70%, mobile 22/50/78%) with their bases at
// y = 70% (mobile 66%) of the pinned stage. The whole set follows the stage's
// on-screen position (camera view offset), so it scrolls in and out with the
// DOM copy pixel for pixel.
import * as THREE from "three";

import type { FrameView, GLContext } from "../../engine";
import { CUP_ROW_SLIDE_VW, cupRowLook, cupRowSlide } from "./choreo";
import { createShadowDecal } from "./floor";
import type { FloorPool, FloorReach } from "./floor";
import { paintCupLivery } from "./livery";
import { bump, damp, lerp, range, smooth } from "./math";
import type { BrandPalette } from "./palette";
import { floorZAt, rowX, solveRig, widthAt } from "./rig";
import type { Rig } from "./rig";

export const BRAND_FOV = 28;

type Tone = "sage" | "peach" | "green";

interface CupSpec {
  key: "S" | "M" | "L";
  height: number;
  rTop: number;
  rBottom: number;
  tone: Tone;
  /** Yaw while the row is still "looking away" (radians). */
  away: number;
  /** Extra spin carried through the fall (radians). */
  spin: number;
  /** Lean at release (radians). */
  tilt: number;
}

// Proportions measured from the real cups photo (cups-trio.webp): the large
// cup is the unit; 12oz and 16oz share a lid, the small is narrower.
const CUPS: CupSpec[] = [
  { key: "S", height: 0.6, rTop: 0.272, rBottom: 0.212, tone: "sage", away: -0.66, spin: -2.2, tilt: 0.075 },
  { key: "M", height: 0.76, rTop: 0.3, rBottom: 0.232, tone: "peach", away: 0.52, spin: 1.9, tilt: -0.06 },
  { key: "L", height: 0.89, rTop: 0.312, rBottom: 0.245, tone: "green", away: -0.38, spin: -1.7, tilt: 0.05 },
];

const LID_OVERLAP = 0.034;
const SKIRT = 0.012;
const LID_TOP = 0.086;
const LARGE_TOTAL = CUPS[2].height - LID_OVERLAP + LID_TOP;
const LID_DIAMETER = 2 * (CUPS[2].rTop + SKIRT);

const PITCH = (9 * Math.PI) / 180;
/** Floor pool centre (z), a little behind the cup row. */
const FLOOR_Z = -0.25;
/** f10 scroll position (viewport heights past the pin) that releases the cups. */
const DROP_AT = -0.2;
/** Seconds between cups (the brief's 80ms stagger) and for one fall + bounce. */
const STAGGER = 0.08;
const DROP_TIME = 0.76;
const CLOCK_MAX = STAGGER * (CUPS.length - 1) + DROP_TIME;
/** Release height in world units (about a third of the viewport above the floor). */
const DROP_HEIGHT = 0.95;

// Key light comes from the upper left, in front: shadows fall back and to the right.
const SHADOW_DIR = new THREE.Vector2(0.66, -0.75).normalize();
const SHADOW_SLANT = 0.85; // horizontal shadow travel per unit of height

/** Lid outer profile (lathe, bottom of the skirt up to the centre). */
function lidProfile(R: number) {
  const pts: THREE.Vector2[] = [];
  const add = (x: number, y: number) => pts.push(new THREE.Vector2(Math.max(0, x), y));
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i += 1) {
      const a = a0 + ((a1 - a0) * i) / n;
      add(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  add(R - 0.011, 0);
  arc(R - 0.004, 0.004, 0.004, -Math.PI / 2, 0, 3);
  add(R, 0.02);
  arc(R - 0.01, 0.03, 0.01, 0, Math.PI / 2, 5);
  add(R - 0.017, 0.0405);
  add(R - 0.023, 0.0435);
  add(R - 0.027, 0.05);
  add(R - 0.029, 0.062);
  // The raised sip rim.
  arc(R - 0.043, 0.072, 0.014, 0, Math.PI, 10);
  add(R - 0.058, 0.0655);
  add(R - 0.061, 0.0605);
  add(R - 0.066, 0.0572);
  add(R - 0.08, 0.0558);
  add(R * 0.55, 0.0574);
  add(0, 0.0584);
  return pts;
}

/** Height above the floor (fraction of the release height) for drop phase u (0..1). */
function dropHeight(u: number) {
  if (u <= 0) return 1;
  if (u < 0.55) {
    const t = u / 0.55;
    return 1 - t * t;
  }
  if (u < 0.8) {
    const t = (u - 0.55) / 0.25;
    return 0.075 * 4 * t * (1 - t);
  }
  if (u < 0.92) {
    const t = (u - 0.8) / 0.12;
    return 0.016 * 4 * t * (1 - t);
  }
  return 0;
}

interface CupParts {
  spec: CupSpec;
  pivot: THREE.Group;
  spinner: THREE.Group;
  materials: THREE.MeshPhysicalMaterial[];
  sipMaterial: THREE.MeshBasicMaterial;
  contact: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  cast: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  x: number;
}

export interface CupRowStage {
  /** Stage top relative to the viewport, in viewport heights. */
  top: number;
  /** Scroll length of the pin, in viewport heights (section height minus one screen). */
  pinLength: number;
  /** True when the frame is pinned (false under reduced motion). */
  pinned: boolean;
}

export interface CupRow {
  group: THREE.Group;
  layout(ctx: GLContext, anchors: number[] | null): void;
  update(ctx: GLContext, view: FrameView, stage: CupRowStage, camera: THREE.PerspectiveCamera, floor: FloorPool): void;
  dispose(): void;
}

export function createCupRow(ctx: GLContext, palette: BrandPalette, blob: THREE.Texture, fontFamily: string): CupRow {
  const group = new THREE.Group();
  group.name = "cup-family";
  const disposables: { dispose(): void }[] = [];
  const anisotropy = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy());
  const segments = ctx.isMobile ? 72 : 120;
  const textureWidth = ctx.isMobile ? 1024 : 1600;

  const toneColour: Record<Tone, string> = { sage: palette.sage, peach: palette.peach, green: palette.green };

  const sipGeometry = new THREE.CircleGeometry(1, 20);
  sipGeometry.rotateX(-Math.PI / 2);
  disposables.push(sipGeometry);

  const cups: CupParts[] = CUPS.map((spec) => {
    const block = toneColour[spec.tone];
    const canvas = paintCupLivery(
      { height: spec.height, rTop: spec.rTop, rBottom: spec.rBottom, lidOverlap: LID_OVERLAP },
      {
        paper: palette.paper,
        block,
        ink: palette.green,
        inkOnBlock: spec.tone === "green" ? palette.paper : palette.green,
      },
      textureWidth,
      fontFamily,
    );
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.needsUpdate = true;

    const wallGeometry = new THREE.LatheGeometry(
      [new THREE.Vector2(spec.rBottom, 0), new THREE.Vector2(spec.rTop, spec.height)],
      segments,
      -Math.PI,
      Math.PI * 2,
    );
    const wallMaterial = new THREE.MeshPhysicalMaterial({
      map,
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.5,
      sheen: 0.35,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color(palette.paper),
      transparent: true,
      opacity: 0,
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    const R = spec.rTop + SKIRT;
    const lidGeometry = new THREE.LatheGeometry(lidProfile(R), segments, -Math.PI, Math.PI * 2);
    lidGeometry.translate(0, spec.height - LID_OVERLAP, 0);
    const lidMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.paperWarm),
      roughness: 0.4,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.38,
      transparent: true,
      opacity: 0,
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);

    // The sip opening on the raised rim, front right.
    const sipMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.ink), transparent: true, opacity: 0 });
    const sip = new THREE.Mesh(sipGeometry, sipMaterial);
    const sipAngle = 0.62;
    const sipR = R - 0.043;
    sip.position.set(Math.sin(sipAngle) * sipR, spec.height - LID_OVERLAP + LID_TOP + 0.0006, Math.cos(sipAngle) * sipR);
    sip.rotation.y = sipAngle;
    sip.scale.set(0.017, 1, 0.0052);

    const spinner = new THREE.Group();
    spinner.add(wall, lid, sip);
    const pivot = new THREE.Group();
    pivot.add(spinner);
    group.add(pivot);

    const contact = createShadowDecal(blob, palette.ink, -6);
    const cast = createShadowDecal(blob, palette.ink, -7);
    group.add(contact, cast);

    disposables.push(map, wallGeometry, wallMaterial, lidGeometry, lidMaterial, sipMaterial, contact.material, contact.geometry, cast.material, cast.geometry);
    return { spec, pivot, spinner, materials: [wallMaterial, lidMaterial], sipMaterial, contact, cast, x: 0 };
  });

  let rig: Rig = solveRig(BRAND_FOV, PITCH, 6, -0.4, 1.6);
  let floorFront = 1.6;
  let floorHalfWidth = 2.6;
  const floorCore: FloorReach = { x: 1.2, front: 0.6, back: 0.6 };
  let clock = 0;
  let lastSeen = -1;
  let look = 0;
  let slide = 0;

  const layout: CupRow["layout"] = (c, anchors) => {
    const mobile = c.width < 768;
    const xs = anchors && anchors.length === 3 ? anchors : mobile ? [0.22, 0.5, 0.78] : [0.3, 0.5, 0.7];
    const baseY = mobile ? 0.66 : 0.7;
    const aspect = c.width / Math.max(1, c.height);
    const t = Math.tan(((BRAND_FOV / 2) * Math.PI) / 180);
    const spacing = Math.max(0.05, Math.min(xs[1] - xs[0], xs[2] - xs[1]));
    const targetHeight = mobile ? 0.3 : 0.33;
    const byHeight = LARGE_TOTAL / (2 * t * targetHeight);
    const byWidth = LID_DIAMETER / (2 * t * aspect * (mobile ? 0.88 : aspect < 1 ? 0.86 : 0.8) * spacing);
    const distance = Math.max(byHeight, byWidth);
    rig = solveRig(BRAND_FOV, PITCH, distance, 1 - 2 * baseY, aspect);
    cups.forEach((cup, i) => {
      cup.x = rowX(rig, 2 * xs[i] - 1);
    });
    const nearZ = floorZAt(rig, -1) ?? 2;
    floorFront = Math.max(0.8, (nearZ + 0.25) * 1.04);
    floorHalfWidth = Math.max(2.4, widthAt(rig, rig.distance) * 0.8);
    // Flat stone under the row: across all three cups (lids included) and over
    // a band 20% of the viewport tall centred on their bases, so the cups stand
    // on stone, not on paper; the melt into the page runs from there to the rim.
    const outer = Math.max(Math.abs(cups[0].x), Math.abs(cups[2].x)) + LID_DIAMETER / 2;
    const backZ = floorZAt(rig, 1 - 2 * (baseY - 0.1)) ?? -1;
    const frontZ = floorZAt(rig, 1 - 2 * Math.min(0.97, baseY + 0.1)) ?? 0.6;
    floorCore.x = Math.min(outer, floorHalfWidth * 0.8);
    floorCore.back = Math.max(0.2, FLOOR_Z - backZ);
    floorCore.front = Math.max(0.2, frontZ - FLOOR_Z);
  };

  const update: CupRow["update"] = (c, view, stage, camera, floor) => {
    // Scroll position in viewport heights: 0 when the pin starts.
    const s = -view.top;
    const now = c.time;
    const reduced = c.reduced;

    // Drop clock: plays forward in real time once the stage is far enough in,
    // rewinds when you scroll back above the release point.
    if (reduced) {
      clock = CLOCK_MAX;
    } else {
      const resumed = lastSeen < 0 || now - lastSeen > 0.35;
      if (resumed) {
        if (s > DROP_AT + 0.3) clock = CLOCK_MAX;
        else if (s < DROP_AT) clock = 0;
      }
      if (s >= DROP_AT) clock = Math.min(CLOCK_MAX, clock + c.delta);
      else clock = Math.max(0, clock - c.delta * 1.35);
    }
    lastSeen = now;

    // Turn toward the camera through the pin; slide left on exit (pure functions of scroll).
    const pin = Math.max(0.2, stage.pinLength);
    const lookTarget = reduced || !stage.pinned ? 1 : cupRowLook(s, pin);
    const slideTarget = reduced || !stage.pinned ? 0 : cupRowSlide(s, pin);
    look = reduced ? lookTarget : damp(look, lookTarget, 9, c.delta);
    slide = reduced ? slideTarget : damp(slide, slideTarget, 9, c.delta);

    // Camera: solved rig, pointer orbit, truck right for the exit slide.
    const truck = slide * widthAt(rig, rig.distance) * CUP_ROW_SLIDE_VW;
    const orbit = reduced ? 0 : c.pointer.x * 0.014;
    const nod = reduced ? 0 : c.pointer.y * 0.004;
    camera.position.set(truck + Math.sin(orbit) * rig.distance, rig.height, Math.cos(orbit) * rig.distance);
    camera.rotation.set(-(rig.pitch + nod), orbit, 0, "YXZ");
    camera.setViewOffset(c.width, c.height, 0, -stage.top * c.height, c.width, c.height);
    camera.updateMatrixWorld();

    floor.set({ x: 0, z: FLOOR_Z }, { x: floorHalfWidth, front: floorFront, back: 4.2 }, 1, floorCore);

    cups.forEach((cup, i) => {
      const { spec } = cup;
      const u = range(clock, i * STAGGER, i * STAGGER + DROP_TIME);
      const fade = smooth(range(u, 0, 0.16));
      const height = dropHeight(u) * DROP_HEIGHT;
      const landed = smooth(range(u, 0.1, 0.85));

      // Impact squash (paper barely gives) and a settling wobble after the bounce.
      const squash = 0.04 * bump(u, 0.555, 0.035) + 0.014 * bump(u, 0.802, 0.03);
      const after = Math.max(0, u - 0.55);
      const wobble = u > 0.55 ? 0.055 * Math.exp(-after * 9) * Math.sin(after * 30) : 0;
      const lean = spec.tilt * (1 - smooth(range(u, 0, 0.55))) + wobble * Math.sign(spec.tilt);

      cup.pivot.position.set(cup.x, height, 0);
      cup.pivot.rotation.set(lean * 0.35, 0, lean);
      cup.spinner.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);

      const face = Math.atan2(camera.position.x - cup.x, camera.position.z);
      // Alive but calm: the cups lean into the pointer and breathe a few degrees.
      const playful = reduced ? 0 : c.pointer.x * 0.14 * look;
      const idle = reduced ? 0 : Math.sin(now * 0.7 + i * 2.1) * 0.03 * landed;
      cup.spinner.rotation.y = lerp(spec.away, face, look) + spec.spin * (1 - landed) + playful + idle;

      const opacity = reduced ? 1 : fade;
      for (const m of cup.materials) m.opacity = opacity;
      cup.sipMaterial.opacity = opacity;
      cup.pivot.visible = opacity > 0.002;

      // Shadows: tight contact blob + a long soft cast toward the back right.
      const lift = Math.min(1, height / 0.9);
      const contactScale = spec.rBottom * 2.9 * (1 + lift * 0.9);
      cup.contact.position.set(cup.x + SHADOW_DIR.x * height * 0.3, 0.002, SHADOW_DIR.y * height * 0.3);
      cup.contact.scale.set(contactScale, 1, contactScale * 0.92);
      cup.contact.material.opacity = 0.42 * (1 - lift) ** 2 * opacity;

      const cupHeight = spec.height + LID_TOP - LID_OVERLAP;
      const castLength = cupHeight * 1.7;
      const castWidth = spec.rBottom * 2.6;
      const castOffset = castLength * 0.42 + height * SHADOW_SLANT;
      cup.cast.position.set(cup.x + SHADOW_DIR.x * castOffset, 0.001, SHADOW_DIR.y * castOffset);
      cup.cast.rotation.y = Math.atan2(SHADOW_DIR.x, SHADOW_DIR.y);
      cup.cast.scale.set(castWidth * (1 + lift * 0.6), 1, castLength);
      cup.cast.material.opacity = 0.17 * (1 - lift * 0.85) * opacity;
    });
  };

  return {
    group,
    layout,
    update,
    dispose() {
      for (const d of disposables) d.dispose();
      group.clear();
    },
  };
}

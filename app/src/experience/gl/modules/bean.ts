// Chapter one + frame 05: one continuous film from green bean to espresso cup.
//
// f01 beans drift in the dark, fall toward the lens; f02 they pour into a steel
// hopper; the camera dives into the hopper opening, which becomes the roaster's
// sight glass (f03, the roast, chaff at first crack); it pushes through the glass
// into the tumbling beans and pulls back out over the cooling tray (f04); the
// tray turns away while its beans rise into a grid of dots; the dots become
// espresso cups (f05) and the camera dives into the centre cup until the screen is
// dark coffee, handing over to the film.
//
// Every hero state is a pure function of one scroll beat (see bean/timeline.ts),
// so reverse scroll plays the film backwards exactly. Only ambient loops (drift,
// tumble jitter, the tray arm, smoke and steam, dust) read ctx.time.
import * as THREE from "three";

import { FIRST_CRACK_AT } from "../../story";
import type { FrameId } from "../../story";
import type { FrameView, GLContext, SceneModule } from "../engine";
import { createBeanGeometry, createBeanNoiseTexture } from "../lib/bean";
import { prewarmScene } from "../lib/prewarm";
import type { CupSet } from "./bean/cups";
import { createCupSet } from "./bean/cups";
import type { DrumSet } from "./bean/drum";
import { createDrumSet, DRUM_MASS, DRUM_ORIGIN } from "./bean/drum";
import type { FilmState, Kit } from "./bean/kit";
import type { CopyBounds } from "./bean/copy";
import { measureCopy, sameCopy } from "./bean/copy";
import type { PourSet } from "./bean/pour";
import { createPourSet, HOPPER_OUTLET_R, HOPPER_OUTLET_Y, HOPPER_RIM_RADIUS, HOPPER_RIM_TUBE } from "./bean/pour";
import type { LightRig, Shot } from "./bean/rig";
import { applyShot, copyShot, createLightRig, fitDistance, lerpShot, shot, shotQuaternion } from "./bean/rig";
import { ScreenGrade } from "./bean/sprites";
import { brushedTexture, glowTexture, smokeTexture } from "./bean/textures";
import { beatFromViews, CUPS, maxVisibility, stillBeat, sumVisibility } from "./bean/timeline";
import type { TraySet } from "./bean/tray";
import { createTraySet, TRAY_ORIGIN, TRAY_RADIUS } from "./bean/tray";
import { bell, clamp, easeInCubic, easeInOutCubic, easeOutCubic, mix, range, smooth } from "./bean/util";

const FRAMES: FrameId[] = ["f01", "f02", "f03", "f04", "f05"];
const HALF_PI = Math.PI / 2;
const TRAY_YAW = 0.42;

interface Plan {
  s01: Shot;
  s02a: Shot;
  s02b: Shot;
  sDive: Shot;
  s03a: Shot;
  s03b: Shot;
  sPush: Shot;
  sTrayIn: Shot;
  s04a: Shot;
  s04b: Shot;
  sGrid: Shot;
  sGridHold: Shot;
  sDiveEnd: Shot;
  gridExtent: number;
}

interface Built {
  kit: Kit;
  rig: LightRig;
  pour: PourSet;
  drum: DrumSet;
  tray: TraySet;
  cups: CupSet;
  grade: ScreenGrade;
  fog: THREE.FogExp2;
}

const _t = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3();
const _v = new THREE.Vector3();
/** Scratch camera for measuring where a shot puts the hopper on screen. */
const _probe = new THREE.PerspectiveCamera(35, 1, 0.04, 160);
/** Outer edge of the chrome bezel and of the bolted flange ring around the sight glass. */
const BEZEL_R = HOPPER_RIM_RADIUS + HOPPER_RIM_TUBE;
const DRUM_FLANGE_R = 1.98;
/** How often (ms) the stacked layout re-reads the DOM copy while chapter one is on screen. */
const COPY_REMEASURE_MS = 1000;

export function createBeanModule(): SceneModule {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.04, 160);
  let built: Built | null = null;
  let plan: Plan | null = null;
  let copy: CopyBounds | null = null;
  let copyAt = 0;
  const cur = shot();
  const state: FilmState = {
    b: 0,
    time: 0,
    delta: 0,
    reduced: false,
    isMobile: false,
    aspect: 1,
    pointer: { x: 0, y: 0 },
    camera,
  };

  /** Hopper shots for f02 (start and end of the pin) at distance `dist`, lens shift (sx, sy). */
  function pourShots(dist: number, sx: number, sy: number) {
    return [
      shot({ tx: 0, ty: -1.05, tz: 0, dist, yaw: -0.22, pitch: -0.24, sx, sy }),
      shot({ tx: 0, ty: -0.75, tz: 0, dist: dist * 0.88, yaw: -0.08, pitch: -0.4, sx, sy }),
    ] as const;
  }

  /**
   * Stacked portrait f02: the hopper (rim down to the outlet flange; the stem is
   * off) sits between the header and the copy block, at least 24px above the
   * kicker through the whole pin. Shrinks the hopper only when it cannot fit.
   */
  function fitHopper(ctx: GLContext, copy: CopyBounds, dist: number) {
    const aspect = ctx.width / Math.max(1, ctx.height);
    const H = Math.max(1, ctx.height);
    const topN = 1 - (2 * (copy.header + 12)) / H;
    const botN = 1 - (2 * (copy.pourTop - 24)) / H;
    const avail = topN - botN;
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < 5; i += 1) {
      hi = -Infinity;
      lo = Infinity;
      for (const s of pourShots(dist, 0, 0)) {
        _probe.aspect = aspect;
        applyShot(_probe, s, 0, 0);
        for (let k = 0; k < 16; k += 1) {
          const a = (k / 16) * Math.PI * 2;
          const rr = HOPPER_RIM_RADIUS + HOPPER_RIM_TUBE;
          hi = Math.max(hi, _v.set(Math.cos(a) * rr, HOPPER_RIM_TUBE, Math.sin(a) * rr).project(_probe).y);
          lo = Math.min(lo, _v.set(Math.cos(a) * HOPPER_OUTLET_R, HOPPER_OUTLET_Y, Math.sin(a) * HOPPER_OUTLET_R).project(_probe).y);
        }
      }
      const span = hi - lo;
      if (span <= avail || avail < 0.3) break;
      dist *= (span / avail) * 1.01;
    }
    const centred = (topN + botN) / 2 - (hi + lo) / 2;
    // Clearing the copy wins over clearing the header.
    const sy = Math.max(botN - lo, Math.min(centred, topN - hi));
    return { dist, sy };
  }

  /**
   * Stacked portrait f03: the drum window sits centred between the title and the
   * roast readout, the chrome bezel at least 24px and the flange ring at least
   * 12px clear of both, up to the closest push-in (`push` x the distance).
   */
  function fitDrum(ctx: GLContext, copy: CopyBounds, dist: number, push: number) {
    const H = Math.max(1, ctx.height);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(35) / 2);
    const half = (copy.roastTop - copy.titleBottom) / 2;
    const ppu = H / (2 * dist * push * tanHalf);
    const need = Math.max(DRUM_FLANGE_R * ppu + 12, BEZEL_R * ppu + 24);
    if (need > half && half > 40) {
      const fit = Math.min((half - 12) / DRUM_FLANGE_R, (half - 24) / BEZEL_R);
      dist *= ppu / Math.max(ppu * 0.35, fit);
    }
    const sy = 1 - (copy.titleBottom + copy.roastTop) / H;
    return { dist, sy };
  }

  function layout(ctx: GLContext) {
    if (!built) return;
    const aspect = ctx.width / Math.max(1, ctx.height);
    const mob = ctx.isMobile;
    // Stacked portrait: the CSS stacks the copy (f02 bottom, f03 title top and
    // readout bottom) below 820px, and the hopper and drum sit centred between.
    const stacked = mob && aspect < 1 && ctx.width < 820;
    copy = stacked ? measureCopy(ctx.height) : null;
    copyAt = performance.now();
    // Hopper: rim spans ~36% of the width on desktop (cropped at the bottom), ~56% on mobile.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(35) / 2);
    let Dp = Math.max(fitDistance(2.3, mob ? 0.9 : 0.98, aspect), 1.47 / ((mob ? 0.56 : 0.36) * tanHalf * aspect));
    // Drum: on tablets in portrait the full-width drum would run into the copy.
    const drumFrac = stacked && aspect > 0.6 ? Math.min(0.84, (0.6 / aspect) * 0.75) : mob ? 0.84 : 0.62;
    let Dc = fitDistance(1.98, drumFrac, aspect);
    const push = stacked ? 0.92 : 0.84;
    const Dt = fitDistance(TRAY_RADIUS + 0.15, mob ? 0.9 : 0.78, aspect);
    const Dg = mob ? Dt * 1.05 : Dt * 1.72;
    const pourS = mob ? [0, 0.3] : [0.3, -0.02];
    const drumS = mob ? [0, 0.24] : [-0.25, 0.01];
    const trayS = mob ? [0, 0.22] : [0.42, -0.02];
    const gridS = mob ? [0, 0.16] : [0.31, 0.02];
    if (copy) {
      const hop = fitHopper(ctx, copy, Dp);
      Dp = hop.dist;
      pourS[1] = hop.sy;
      const drum = fitDrum(ctx, copy, Dc, push);
      Dc = drum.dist;
      drumS[1] = drum.sy;
    }

    const [s02a, s02b] = pourShots(Dp, pourS[0], pourS[1]);
    // f01 sits exactly one screen above f02, so the hopper rises with the page (1x).
    shotQuaternion(s02a, _q);
    _up.set(0, 1, 0).applyQuaternion(_q);
    const hv = 2 * Dp * Math.tan(THREE.MathUtils.degToRad(35) / 2);
    const s01 = copyShot(shot(), s02a);
    s01.tx += _up.x * hv;
    s01.ty += _up.y * hv;
    s01.tz += _up.z * hv;
    const sDive = shot({ tx: 0, ty: 0, tz: 0, dist: Dc, yaw: 0.6, pitch: -HALF_PI, sx: drumS[0], sy: drumS[1] });
    const s03a = shot({ tx: DRUM_ORIGIN.x, ty: DRUM_ORIGIN.y, tz: DRUM_ORIGIN.z, dist: Dc, yaw: 0, pitch: 0, sx: drumS[0], sy: drumS[1] });
    const s03b = shot({ tx: DRUM_ORIGIN.x, ty: DRUM_ORIGIN.y, tz: DRUM_ORIGIN.z, dist: Dc * push, yaw: 0.07, pitch: -0.035, sx: drumS[0], sy: drumS[1] });
    const sPush = shot({
      tx: DRUM_ORIGIN.x + DRUM_MASS.x,
      ty: DRUM_ORIGIN.y + DRUM_MASS.y,
      tz: DRUM_ORIGIN.z + DRUM_MASS.z,
      dist: 0.5,
      yaw: 0.18,
      pitch: -0.38,
    });
    const land = built.tray.landing;
    const sTrayIn = shot({
      tx: TRAY_ORIGIN.x + land.x,
      ty: TRAY_ORIGIN.y + land.y,
      tz: TRAY_ORIGIN.z + land.z,
      dist: 0.75,
      yaw: TRAY_YAW - 1,
      pitch: -1.4,
    });
    const s04a = shot({ tx: TRAY_ORIGIN.x, ty: 0, tz: TRAY_ORIGIN.z, dist: Dt, yaw: TRAY_YAW, pitch: -1.24, sx: trayS[0], sy: trayS[1] });
    const s04b = shot({ tx: TRAY_ORIGIN.x, ty: 0, tz: TRAY_ORIGIN.z, dist: Dt * 0.95, yaw: TRAY_YAW + 0.14, pitch: -1.3, sx: trayS[0], sy: trayS[1] });
    const sGrid = shot({ tx: TRAY_ORIGIN.x, ty: -0.25, tz: TRAY_ORIGIN.z, dist: Dg, yaw: TRAY_YAW + 0.14 + 0.92, pitch: -HALF_PI, sx: gridS[0], sy: gridS[1] });
    const sGridHold = copyShot(shot(), sGrid);
    sGridHold.dist = Dg * 0.95;

    built.pour.layout(s02a, aspect, ctx.dpr, !stacked);
    const grid = built.cups.layout(sGrid, aspect, mob);
    built.tray.setGrid(grid);
    built.cups.diveTarget(_t);
    const sDiveEnd = shot({
      tx: _t.x,
      ty: _t.y,
      tz: _t.z,
      dist: Math.max(0.06, 0.34 * grid.cupScale * 0.6),
      yaw: sGrid.yaw + 0.42,
      pitch: -HALF_PI,
    });
    const gridExtent = (Math.hypot(grid.cols, grid.rows) * grid.spacing) / 2 + 1.5;
    plan = { s01, s02a, s02b, sDive, s03a, s03b, sPush, sTrayIn, s04a, s04b, sGrid, sGridHold, sDiveEnd, gridExtent };
  }

  /** Camera for beat b: one path through the whole chapter. */
  function shotAt(b: number, out: Shot) {
    const p = plan!;
    if (b < 1) return lerpShot(out, p.s01, p.s02a, clamp(b));
    if (b < 2) return lerpShot(out, p.s02a, p.s02b, smooth(b - 1));
    if (b < 3) return lerpShot(out, p.s02b, p.sDive, easeInOutCubic(b - 2));
    if (b < 4) return lerpShot(out, p.s03a, p.s03b, smooth(b - 3));
    if (b < 4.5) return lerpShot(out, p.s03b, p.sPush, easeInCubic((b - 4) / 0.5));
    if (b < 5) return lerpShot(out, p.sTrayIn, p.s04a, easeOutCubic((b - 4.5) / 0.5));
    if (b < 6) return lerpShot(out, p.s04a, p.s04b, smooth(b - 5));
    if (b < 7) return lerpShot(out, p.s04b, p.sGrid, easeInOutCubic(b - 6));
    const hold = 7 + CUPS.diveStart;
    if (b < hold) return lerpShot(out, p.sGrid, p.sGridHold, smooth((b - 7) / CUPS.diveStart));
    return lerpShot(out, p.sGridHold, p.sDiveEnd, Math.pow(clamp((b - hold) / (1 - CUPS.diveStart)), 1.45));
  }

  return {
    name: "bean",
    frames: FRAMES,
    scene,
    camera,

    async init(ctx: GLContext) {
      const mob = ctx.isMobile;
      state.reduced = ctx.reduced;
      const kit: Kit = {
        isMobile: mob,
        envMap: ctx.envMap,
        beanGeo: createBeanGeometry({ segments: mob ? 18 : 26 }),
        beanNoise: createBeanNoiseTexture(128),
        brushed: brushedTexture(),
        glow: glowTexture(),
        smoke: smokeTexture(),
        maxAnisotropy: ctx.renderer.capabilities.getMaxAnisotropy(),
      };
      const fog = new THREE.FogExp2(0x121600, 0.034);
      scene.fog = fog;
      const rig = createLightRig(scene, mob);
      const pour = createPourSet(kit);
      const drum = createDrumSet(kit, rig.warm);
      const tray = createTraySet(kit);
      const cups = createCupSet(kit, TRAY_ORIGIN);
      const grade = new ScreenGrade();
      scene.add(pour.group, drum.group, tray.group, cups.group, grade.mesh);
      built = { kit, rig, pour, drum, tray, cups, grade, fog };
      camera.aspect = ctx.width / Math.max(1, ctx.height);
      layout(ctx);

      // Compile every set up front (and the shadow-depth programs of every
      // caster, the tray included) so the cuts never hitch on a shader compile.
      const groups = [pour.group, drum.group, tray.group, cups.group];
      applyShot(camera, plan!.s02a, 0, 0);
      _t.set(plan!.s02a.tx, plan!.s02a.ty, plan!.s02a.tz);
      rig.aim(camera, _t, 8, 0);
      await prewarmScene(ctx.renderer, scene, camera, { show: groups });
      for (const g of groups) g.visible = false;
    },

    resize(ctx: GLContext) {
      layout(ctx);
    },

    opacity(frames: Record<FrameId, FrameView>) {
      if (state.reduced) return clamp((maxVisibility(frames) - 0.5) * 4);
      const b = beatFromViews(frames);
      // Hold the frame fully opaque through the dive and while the film arrives.
      if (b >= 7.5 && frames.f05.visibility > 0) return 1;
      return clamp(sumVisibility(frames));
    },

    update(ctx: GLContext, frames: Record<FrameId, FrameView>) {
      if (!built || !plan) return;
      const { rig, pour, drum, tray, cups, grade, fog } = built;
      const reduced = ctx.reduced;
      const b = reduced ? stillBeat(frames) : beatFromViews(frames);
      // Stacked layouts follow the DOM copy if it reflows without a resize (fonts, copy edits).
      if (copy && b < 4.6 && performance.now() - copyAt > COPY_REMEASURE_MS) {
        copyAt = performance.now();
        if (!sameCopy(copy, measureCopy(ctx.height))) layout(ctx);
      }
      state.b = b;
      state.time = ctx.time;
      state.delta = ctx.delta;
      state.reduced = reduced;
      state.isMobile = ctx.isMobile;
      state.aspect = ctx.width / Math.max(1, ctx.height);
      state.pointer.x = reduced ? 0 : ctx.pointer.x;
      state.pointer.y = reduced ? 0 : ctx.pointer.y;

      shotAt(b, cur);
      // First crack: a short, scroll-tied tremor.
      const crack = b >= 3 && b < 4 ? bell(b - 3, FIRST_CRACK_AT + 0.012, 0.04) : 0;
      if (crack > 0 && !reduced) {
        cur.yaw += crack * 0.006 * Math.sin(b * 920);
        cur.pitch += crack * 0.005 * Math.sin(b * 1310 + 1.3);
      }
      applyShot(camera, cur, state.pointer.x, state.pointer.y);

      // Lighting and atmosphere per set, blended across the hand-overs.
      const toCups = smooth(range(b, 6.2, 7));
      let key: number;
      let rim: number;
      let amb: number;
      let frontal: number;
      let density: number;
      let vignette: number;
      let extent = 8;
      if (b < 3) {
        key = 2.1;
        rim = 2.8;
        amb = 0.07;
        frontal = 0;
        density = mix(0.042, 0.038, range(b, 1, 3));
        vignette = 0.8;
      } else if (b < 4.5) {
        key = 1.5;
        rim = 1.2;
        amb = 0.05;
        frontal = 0.1;
        density = 0.05;
        vignette = 0.88;
      } else {
        key = mix(1.9, 2.5, toCups);
        rim = mix(1.1, 0.7, toCups);
        amb = mix(0.06, 0.1, toCups);
        frontal = mix(0.55, 0.62, toCups);
        density = mix(0.014, 0.008, toCups);
        vignette = mix(0.72, 0.58, toCups);
        extent = mix(TRAY_RADIUS + 0.9, plan.gridExtent, toCups);
      }
      const dive = b >= 7 + CUPS.diveStart ? range(b, 7 + CUPS.diveStart, 8) : 0;
      vignette = mix(vignette, 0.98, smooth(dive));
      density = mix(density, 0.06, smooth(dive));
      rig.key.intensity = key;
      rig.rim.intensity = rim;
      rig.ambient.intensity = amb;
      fog.density = density;
      _t.set(cur.tx, cur.ty, cur.tz);
      rig.aim(camera, _t, extent, frontal);

      pour.update(state);
      drum.update(state);
      tray.update(state);
      cups.update(state);

      const u = grade.material.uniforms;
      u.uAspect.value = state.aspect;
      u.uVignette.value = vignette;
      u.uCentre.value.set(cur.sx, cur.sy);
      u.uDip.value = bell(b, 3, 0.07) * 0.5 + bell(b, 4.5, 0.1) * 0.92;
      u.uCoffee.value = b >= 7 ? range(b - 7, 0.9, 1) : 0;
    },

    dispose() {
      if (!built) return;
      const { kit, rig, pour, drum, tray, cups, grade } = built;
      pour.dispose();
      drum.dispose();
      tray.dispose();
      cups.dispose();
      grade.dispose();
      rig.dispose();
      kit.beanGeo.dispose();
      kit.beanNoise.dispose();
      kit.brushed.dispose();
      kit.glow.dispose();
      kit.smoke.dispose();
      scene.clear();
      built = null;
      plan = null;
    },
  };
}

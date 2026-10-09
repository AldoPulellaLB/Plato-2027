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
import type { CupSet } from "./bean/cups";
import { createCupSet } from "./bean/cups";
import type { DrumSet } from "./bean/drum";
import { createDrumSet, DRUM_MASS, DRUM_ORIGIN } from "./bean/drum";
import type { FilmState, Kit } from "./bean/kit";
import type { PourSet } from "./bean/pour";
import { createPourSet } from "./bean/pour";
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

export function createBeanModule(): SceneModule {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.04, 160);
  let built: Built | null = null;
  let plan: Plan | null = null;
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

  function layout(ctx: GLContext) {
    if (!built) return;
    const aspect = ctx.width / Math.max(1, ctx.height);
    const mob = ctx.isMobile;
    // Hopper: rim spans ~36% of the width on desktop (cropped at the bottom), ~62% on mobile.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(35) / 2);
    const Dp = Math.max(fitDistance(2.3, mob ? 0.9 : 0.98, aspect), 1.47 / ((mob ? 0.56 : 0.36) * tanHalf * aspect));
    const Dc = fitDistance(1.98, mob ? 0.84 : 0.62, aspect);
    const Dt = fitDistance(TRAY_RADIUS + 0.15, mob ? 0.9 : 0.78, aspect);
    const Dg = mob ? Dt * 1.05 : Dt * 1.72;
    const pourS = mob ? [0, 0.3] : [0.3, -0.02];
    const drumS = mob ? [0, 0.24] : [-0.25, 0.01];
    const trayS = mob ? [0, 0.22] : [0.42, -0.02];
    const gridS = mob ? [0, 0.16] : [0.31, 0.02];

    const s02a = shot({ tx: 0, ty: -1.05, tz: 0, dist: Dp, yaw: -0.22, pitch: -0.24, sx: pourS[0], sy: pourS[1] });
    // f01 sits exactly one screen above f02, so the hopper rises with the page (1x).
    shotQuaternion(s02a, _q);
    _up.set(0, 1, 0).applyQuaternion(_q);
    const hv = 2 * Dp * Math.tan(THREE.MathUtils.degToRad(35) / 2);
    const s01 = copyShot(shot(), s02a);
    s01.tx += _up.x * hv;
    s01.ty += _up.y * hv;
    s01.tz += _up.z * hv;
    const s02b = shot({ tx: 0, ty: -0.75, tz: 0, dist: Dp * 0.88, yaw: -0.08, pitch: -0.4, sx: pourS[0], sy: pourS[1] });
    const sDive = shot({ tx: 0, ty: 0, tz: 0, dist: Dc, yaw: 0.6, pitch: -HALF_PI, sx: drumS[0], sy: drumS[1] });
    const s03a = shot({ tx: DRUM_ORIGIN.x, ty: DRUM_ORIGIN.y, tz: DRUM_ORIGIN.z, dist: Dc, yaw: 0, pitch: 0, sx: drumS[0], sy: drumS[1] });
    const s03b = shot({ tx: DRUM_ORIGIN.x, ty: DRUM_ORIGIN.y, tz: DRUM_ORIGIN.z, dist: Dc * 0.84, yaw: 0.07, pitch: -0.035, sx: drumS[0], sy: drumS[1] });
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

    built.pour.layout(s02a, aspect, ctx.dpr);
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
      const fog = new THREE.FogExp2(0x0e0d0b, 0.034);
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

      // Compile every set up front so the cuts never hitch on a shader compile.
      const groups = [pour.group, drum.group, tray.group, cups.group];
      for (const g of groups) g.visible = true;
      applyShot(camera, plan!.s02a, 0, 0);
      try {
        await ctx.renderer.compileAsync(scene, camera);
      } catch {
        ctx.renderer.compile(scene, camera);
      }
      // One tiny off-screen render also builds the shadow-depth programs.
      const warm = new THREE.WebGLRenderTarget(16, 16);
      const prev = ctx.renderer.getRenderTarget();
      ctx.renderer.setRenderTarget(warm);
      ctx.renderer.render(scene, camera);
      ctx.renderer.setRenderTarget(prev);
      warm.dispose();
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
